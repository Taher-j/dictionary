import { and, asc, desc, eq, inArray, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';

import { cards, words } from '@/data/db/schema';
import { chunk, type RepositoryDeps } from '@/data/repositories/deps';
import {
  insertIntoSearchIndex,
  meaningMatch,
  MIN_FTS_QUERY_LENGTH,
  updateSearchIndex,
} from '@/data/repositories/searchIndex';
import { duplicateTier } from '@/domain/duplicates';
import {
  CardState,
  type CardStateValue,
  type DictionaryId,
  type DuplicateMatch,
  type ImportBatchId,
  type NewWord,
  type Page,
  type ReviewStatus,
  type Word,
  type WordCursor,
  type WordFilter,
  type WordId,
  type WordListItem,
  type WordPatch,
  type WordQuery,
} from '@/domain/models';
import { termKeys, type TermKeys } from '@/domain/termKeys';
import { hasMeaning, MATURE_INTERVAL_DAYS, wordStatus } from '@/domain/wordStatus';

export interface WordRepository {
  getById(id: WordId): Promise<Word | null>;
  list(query: WordQuery, cursor?: WordCursor | null): Promise<Page<WordListItem, WordCursor>>;
  search(text: string, query?: WordFilter & { limit?: number }): Promise<WordListItem[]>;
  /** Words without a translation and definition (the Inbox badge). */
  countIncomplete(): Promise<number>;
  /** Words created, edited or deleted after `since` (all words when null): the backup reminder. */
  countChangedSince(since: number | null): Promise<number>;
  findDuplicates(dictionaryId: DictionaryId, keys: TermKeys): Promise<DuplicateMatch[]>;
  create(input: NewWord): Promise<Word>;
  update(id: WordId, patch: WordPatch): Promise<Word>;
  softDelete(ids: readonly WordId[]): Promise<void>;
  restore(ids: readonly WordId[]): Promise<void>;
}

export const DEFAULT_PAGE_SIZE = 50;
export const SEARCH_LIMIT = 50;

type WordRow = typeof words.$inferSelect;

function toWord(row: WordRow): Word {
  return {
    ...row,
    id: row.id as WordId,
    dictionaryId: row.dictionaryId as DictionaryId,
    importBatchId: row.importBatchId as ImportBatchId | null,
  };
}

/** Columns for list rows: the word plus its recognition card's status fields. */
const listColumns = {
  id: words.id,
  dictionaryId: words.dictionaryId,
  term: words.term,
  termFold: words.termFold,
  translation: words.translation,
  definition: words.definition,
  starred: words.starred,
  createdAt: words.createdAt,
  cardState: cards.state,
  cardScheduledDays: cards.scheduledDays,
  cardSuspended: cards.suspended,
};

const incomplete = and(isNull(words.translation), isNull(words.definition));

const recognitionCardJoin = and(eq(cards.wordId, words.id), eq(cards.direction, 'recognition'));

const meaningful = or(isNotNull(words.translation), isNotNull(words.definition));

/** Mirrors `wordStatus` (docs/03-data-model.md, "Derived status") on the joined recognition card. */
function statusCondition(status: ReviewStatus): SQL | undefined {
  if (status === 'suspended') return and(meaningful, eq(cards.suspended, true));
  const active = and(meaningful, eq(cards.suspended, false));
  switch (status) {
    case 'new':
      return and(active, eq(cards.state, CardState.New));
    case 'learning':
      return and(active, inArray(cards.state, [CardState.Learning, CardState.Relearning]));
    case 'young':
      return and(
        active,
        eq(cards.state, CardState.Review),
        sql`${cards.scheduledDays} < ${MATURE_INTERVAL_DAYS}`,
      );
    case 'mature':
      return and(
        active,
        eq(cards.state, CardState.Review),
        sql`${cards.scheduledDays} >= ${MATURE_INTERVAL_DAYS}`,
      );
  }
}

/**
 * Conditions for every filter except the dictionary (callers choose how to match it, see
 * `search`). Deleted words are always excluded.
 */
function filterConditions(filter: WordFilter): (SQL | undefined)[] {
  const conditions: (SQL | undefined)[] = [isNull(words.deletedAt)];
  if (filter.incomplete) conditions.push(incomplete);
  if (filter.starred) conditions.push(eq(words.starred, true));
  if (filter.status) conditions.push(statusCondition(filter.status));
  if (filter.tagId) {
    conditions.push(
      sql`${words.id} IN (SELECT word_id FROM word_tags WHERE tag_id = ${filter.tagId})`,
    );
  }
  return conditions;
}

interface ListRow {
  id: string;
  dictionaryId: string;
  term: string;
  translation: string | null;
  definition: string | null;
  starred: boolean;
  createdAt: number;
  cardState: number | null;
  cardScheduledDays: number | null;
  cardSuspended: boolean | null;
}

function toListItem(row: ListRow): WordListItem {
  const card =
    row.cardState === null
      ? null
      : {
          state: row.cardState as CardStateValue,
          scheduledDays: row.cardScheduledDays ?? 0,
          suspended: row.cardSuspended ?? false,
        };
  return {
    id: row.id as WordId,
    dictionaryId: row.dictionaryId as DictionaryId,
    term: row.term,
    translation: row.translation,
    definition: row.definition,
    starred: row.starred,
    createdAt: row.createdAt,
    status: wordStatus(card, hasMeaning(row)),
  };
}

/** Upper bound for a prefix range on a BINARY-collated column. */
const PREFIX_END = '\u{10FFFF}';

function trimToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Trims optional text fields; blank strings become null. */
function cleanDetails<T extends WordPatch>(input: T): T {
  const out = { ...input };
  for (const key of [
    'translation',
    'definition',
    'example',
    'partOfSpeech',
    'forms',
    'pronunciation',
    'notes',
    'source',
  ] as const) {
    if (key in out) out[key] = trimToNull(out[key]);
  }
  return out;
}

export function createWordRepository({ db, now, newId }: RepositoryDeps): WordRepository {
  const getRow = (id: WordId) =>
    db
      .select()
      .from(words)
      .where(and(eq(words.id, id), isNull(words.deletedAt)))
      .get();

  /**
   * Card lifecycle (docs/03-data-model.md): create the recognition card when the word first gets a
   * meaning. Removing the meaning leaves the card alone; the queue skips words without one.
   */
  const ensureRecognitionCard = (
    tx: Pick<RepositoryDeps['db'], 'select' | 'insert'>,
    word: WordRow,
    at: number,
  ) => {
    if (!hasMeaning(word)) return;
    const card = tx
      .select({ id: cards.id })
      .from(cards)
      .where(and(eq(cards.wordId, word.id), eq(cards.direction, 'recognition')))
      .get();
    if (card) return;
    tx.insert(cards)
      .values({
        id: newId(),
        wordId: word.id,
        direction: 'recognition',
        state: CardState.New,
        due: at,
        updatedAt: at,
      })
      .run();
  };

  const listSelect = () => db.select(listColumns).from(words).leftJoin(cards, recognitionCardJoin);

  return {
    async getById(id) {
      const row = getRow(id);
      return row ? toWord(row) : null;
    },

    async list(query, cursor) {
      const limit = query.limit ?? DEFAULT_PAGE_SIZE;
      const conditions = filterConditions(query);
      if (query.dictionaryId) conditions.push(eq(words.dictionaryId, query.dictionaryId));

      let rows: (ListRow & { termFold: string })[];
      if (query.sort === 'alpha') {
        if (cursor?.sort === 'alpha') {
          conditions.push(
            sql`(${words.termFold}, ${words.id}) > (${cursor.termFold}, ${cursor.id})`,
          );
        }
        rows = listSelect()
          .where(and(...conditions))
          .orderBy(asc(words.termFold), asc(words.id))
          .limit(limit + 1)
          .all();
      } else if (query.sort === 'grouped') {
        if (cursor?.sort === 'grouped') {
          conditions.push(
            sql`(${words.dictionaryId}, ${words.termFold}, ${words.id}) > (${cursor.dictionaryId}, ${cursor.termFold}, ${cursor.id})`,
          );
        }
        rows = listSelect()
          .where(and(...conditions))
          .orderBy(asc(words.dictionaryId), asc(words.termFold), asc(words.id))
          .limit(limit + 1)
          .all();
      } else {
        if (cursor?.sort === 'recent') {
          conditions.push(
            sql`(${words.createdAt}, ${words.id}) < (${cursor.createdAt}, ${cursor.id})`,
          );
        }
        rows = listSelect()
          .where(and(...conditions))
          .orderBy(desc(words.createdAt), desc(words.id))
          .limit(limit + 1)
          .all();
      }

      const pageRows = rows.slice(0, limit);
      const last = pageRows[pageRows.length - 1];
      let nextCursor: WordCursor | null = null;
      if (rows.length > limit && last) {
        const id = last.id as WordId;
        nextCursor =
          query.sort === 'alpha'
            ? { sort: 'alpha', termFold: last.termFold, id }
            : query.sort === 'grouped'
              ? {
                  sort: 'grouped',
                  dictionaryId: last.dictionaryId as DictionaryId,
                  termFold: last.termFold,
                  id,
                }
              : { sort: 'recent', createdAt: last.createdAt, id };
      }
      return { items: pageRows.map(toListItem), nextCursor };
    },

    async search(text, query) {
      const trimmed = text.trim();
      if (trimmed === '') return [];
      const { fold } = termKeys(trimmed);
      const prefix = and(
        sql`${words.termFold} >= ${fold}`,
        sql`${words.termFold} < ${fold + PREFIX_END}`,
      );
      // Terms match by prefix (B-tree index). Translations and definitions match anywhere, through
      // the FTS5 trigram index, which needs at least three characters. For longer queries the
      // candidate ids drive the query; the unary + keeps SQLite from scanning a whole dictionary
      // through its index and testing every row (measured on a phone, Q6).
      const useFts = [...trimmed].length >= MIN_FTS_QUERY_LENGTH;
      const conditions = filterConditions(query ?? {});
      if (useFts) {
        conditions.push(sql`${words.id} IN (
          SELECT id FROM words WHERE term_fold >= ${fold} AND term_fold < ${fold + PREFIX_END}
          UNION ALL
          SELECT word_id FROM words_fts WHERE words_fts MATCH ${meaningMatch(trimmed)}
        )`);
        if (query?.dictionaryId)
          conditions.push(sql`+${words.dictionaryId} = ${query.dictionaryId}`);
      } else {
        conditions.push(prefix);
        if (query?.dictionaryId) conditions.push(eq(words.dictionaryId, query.dictionaryId));
      }

      const rows = listSelect()
        .where(and(...conditions))
        .orderBy(sql`(${prefix}) DESC`, asc(words.termFold), asc(words.id))
        .limit(query?.limit ?? SEARCH_LIMIT)
        .all();
      return rows.map(toListItem);
    },

    async countIncomplete() {
      const [row] = db
        .select({ n: sql<number>`count(*)` })
        .from(words)
        .where(and(isNull(words.deletedAt), incomplete))
        .all();
      return Number(row?.n ?? 0);
    },

    async countChangedSince(since) {
      const [row] = db
        .select({ n: sql<number>`count(*)` })
        .from(words)
        .where(since === null ? undefined : sql`${words.updatedAt} > ${since}`)
        .all();
      return Number(row?.n ?? 0);
    },

    async findDuplicates(dictionaryId, keys) {
      const rows = db
        .select({
          id: words.id,
          dictionaryId: words.dictionaryId,
          term: words.term,
          termNorm: words.termNorm,
          termFold: words.termFold,
        })
        .from(words)
        .where(
          and(
            isNull(words.deletedAt),
            or(
              eq(words.termNorm, keys.norm),
              and(eq(words.dictionaryId, dictionaryId), eq(words.termFold, keys.fold)),
            ),
          ),
        )
        .all();

      return rows.flatMap((row) => {
        const tier = duplicateTier(dictionaryId, keys, {
          dictionaryId: row.dictionaryId as DictionaryId,
          termNorm: row.termNorm,
          termFold: row.termFold,
        });
        return tier
          ? [
              {
                tier,
                wordId: row.id as WordId,
                dictionaryId: row.dictionaryId as DictionaryId,
                term: row.term,
              },
            ]
          : [];
      });
    },

    async create(input) {
      const term = input.term.trim();
      if (term === '') throw new Error('A word needs a term.');
      const { norm, fold } = termKeys(term);
      const at = now();

      const row = db.transaction((tx) => {
        const inserted = tx
          .insert(words)
          .values({
            ...cleanDetails(input),
            id: newId(),
            term,
            termNorm: norm,
            termFold: fold,
            createdAt: at,
            updatedAt: at,
          })
          .returning()
          .get();
        ensureRecognitionCard(tx, inserted, at);
        insertIntoSearchIndex(tx, [inserted]);
        return inserted;
      });
      return toWord(row);
    },

    async update(id, patch) {
      const at = now();
      const values: Partial<typeof words.$inferInsert> = { ...cleanDetails(patch), updatedAt: at };
      if (patch.term !== undefined) {
        const term = patch.term.trim();
        if (term === '') throw new Error('A word needs a term.');
        const { norm, fold } = termKeys(term);
        Object.assign(values, { term, termNorm: norm, termFold: fold });
      }

      const row = db.transaction((tx) => {
        const updated = tx
          .update(words)
          .set(values)
          .where(and(eq(words.id, id), isNull(words.deletedAt)))
          .returning()
          .get();
        if (!updated) throw new Error(`Word not found: ${id}`);
        ensureRecognitionCard(tx, updated, at);
        if ('translation' in patch || 'definition' in patch) updateSearchIndex(tx, updated);
        return updated;
      });
      return toWord(row);
    },

    async softDelete(ids) {
      const at = now();
      db.transaction((tx) => {
        for (const part of chunk(ids)) {
          tx.update(words)
            .set({ deletedAt: at, updatedAt: at })
            .where(and(inArray(words.id, part), isNull(words.deletedAt)))
            .run();
        }
      });
    },

    async restore(ids) {
      const at = now();
      db.transaction((tx) => {
        for (const part of chunk(ids)) {
          tx.update(words)
            .set({ deletedAt: null, updatedAt: at })
            .where(inArray(words.id, part))
            .run();
        }
      });
    },
  };
}
