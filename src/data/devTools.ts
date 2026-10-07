// Development-only tools: seed a large dataset, wipe all data, time list and search queries.
// Reachable from Settings in development builds only (see src/app/dev.tsx).
import { sql } from 'drizzle-orm';

import {
  cards,
  dictionaries,
  importBatches,
  reviewLogs,
  sessions,
  settings,
  tags,
  words,
  wordTags,
} from '@/data/db/schema';
import type { Repositories } from '@/data/repositories';
import type { RepositoryDeps } from '@/data/repositories/deps';
import { clearSearchIndex, insertIntoSearchIndex } from '@/data/repositories/searchIndex';
import { CardState, type DictionaryId } from '@/domain/models';
import { termKeys } from '@/domain/termKeys';

export const SEED_DICTIONARY_NAME = 'Seed (dev)';
/** Seed tags with the share of words that get each: common, middling and rare tags. */
const SEED_TAGS: readonly (readonly [string, number])[] = [
  ['B1', 0.2],
  ['verbs', 0.15],
  ['nouns', 0.15],
  ['travel', 0.05],
  ['food', 0.03],
  ['idioms', 0.005],
];
const ROWS_PER_TRANSACTION = 500;
const ROWS_PER_STATEMENT = 100;
const DAY_MS = 86_400_000;

export interface SeedOptions {
  words: number;
  reviewLogs: number;
  /** Fraction of words that get a meaning (and therefore a card). */
  meaningRatio?: number;
  seed?: number;
}

export interface SeedProgress {
  phase: 'words' | 'reviewLogs';
  done: number;
  total: number;
}

export interface TableCounts {
  dictionaries: number;
  words: number;
  cards: number;
  reviewLogs: number;
}

export interface BenchmarkResult {
  name: string;
  medianMs: number;
  maxMs: number;
  rows: number;
}

export interface DevTools {
  seed(options: SeedOptions, onProgress?: (progress: SeedProgress) => void): Promise<void>;
  wipe(): Promise<void>;
  counts(): Promise<TableCounts>;
  benchmark(runs?: number): Promise<BenchmarkResult[]>;
}

/** Small deterministic PRNG (mulberry32) so seeded data is the same on every run. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYLLABLES = [
  'ka',
  'be',
  'schö',
  'ma',
  'ri',
  'to',
  'lu',
  'ne',
  'stra',
  'ße',
  'ün',
  'de',
  'pa',
  'ko',
  'wi',
  'zu',
  'fa',
  'gö',
  'ha',
  'jo',
  'ber',
  'ach',
  'tel',
  'mün',
  'sp',
  'ei',
  'au',
  'ver',
  'ge',
  'lich',
];
const GLOSSES = [
  'house',
  'tree',
  'river',
  'quick',
  'to run',
  'green',
  'window',
  'bread',
  'to think',
  'light',
  'mountain',
  'quiet',
  'friend',
  'to carry',
  'morning',
  'stone',
  'garden',
  'heavy',
  'letter',
  'sea',
];

const pick = <T>(rand: () => number, items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)] as T;

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function insertInStatements<T>(rows: T[], insert: (part: T[]) => void) {
  for (let i = 0; i < rows.length; i += ROWS_PER_STATEMENT) {
    insert(rows.slice(i, i + ROWS_PER_STATEMENT));
  }
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};

export function createDevTools(
  { db, now, newId }: RepositoryDeps,
  repositories: Repositories,
  timer: () => number,
): DevTools {
  // Uses all(), not get(): on expo-sqlite a raw get() steps only once and leaves the statement
  // open, which holds a read transaction and stops WAL checkpoints.
  const tableCount = (name: string) =>
    db.all<{ n: number }>(sql.raw(`SELECT count(*) AS n FROM ${name}`))[0]?.n ?? 0;

  async function findSeedDictionary(): Promise<DictionaryId | null> {
    const list = await repositories.dictionaries.list();
    return list.find((d) => d.name === SEED_DICTIONARY_NAME)?.id ?? null;
  }

  return {
    async seed(options, onProgress) {
      const rand = random(options.seed ?? 42);
      const meaningRatio = options.meaningRatio ?? 0.9;
      const at = now();
      const dictionary = await repositories.dictionaries.create({ name: SEED_DICTIONARY_NAME });
      const cardIds: string[] = [];
      const seedTags = [];
      for (const [name, share] of SEED_TAGS) {
        seedTags.push({ id: (await repositories.tags.getOrCreate(name)).id, share });
      }

      for (let done = 0; done < options.words; done += ROWS_PER_TRANSACTION) {
        const size = Math.min(ROWS_PER_TRANSACTION, options.words - done);
        const wordRows: (typeof words.$inferInsert)[] = [];
        const cardRows: (typeof cards.$inferInsert)[] = [];
        const tagRows: (typeof wordTags.$inferInsert)[] = [];

        for (let i = 0; i < size; i++) {
          const syllables = 2 + Math.floor(rand() * 3);
          let term = '';
          for (let s = 0; s < syllables; s++) term += pick(rand, SYLLABLES);
          if (rand() < 0.3) term = term[0]?.toUpperCase() + term.slice(1);
          const { norm, fold } = termKeys(term);
          const id = newId();
          const createdAt = at - Math.floor(rand() * 365) * DAY_MS - i;
          const meaningful = rand() < meaningRatio;
          wordRows.push({
            id,
            dictionaryId: dictionary.id,
            term,
            termNorm: norm,
            termFold: fold,
            translation: meaningful ? `${pick(rand, GLOSSES)}, ${pick(rand, GLOSSES)}` : null,
            starred: rand() < 0.05,
            createdAt,
            updatedAt: createdAt,
          });
          for (const tag of seedTags) {
            if (rand() < tag.share) tagRows.push({ wordId: id, tagId: tag.id });
          }
          if (meaningful) {
            const roll = rand();
            const state =
              roll < 0.2 ? CardState.New : roll < 0.35 ? CardState.Learning : CardState.Review;
            const scheduledDays = state === CardState.Review ? 1 + Math.floor(rand() * 200) : 0;
            // Memory state as ts-fsrs produces it: 0/0 for a new card, stability > 0 once reviewed.
            // Anything else is rejected as an invalid memory state.
            const stability =
              state === CardState.Learning
                ? 0.1 + rand() * 2
                : state === CardState.Review
                  ? scheduledDays
                  : 0;
            const cardId = newId();
            cardIds.push(cardId);
            cardRows.push({
              id: cardId,
              wordId: id,
              direction: 'recognition',
              state,
              due: at + Math.floor((rand() - 0.3) * scheduledDays) * DAY_MS,
              stability,
              difficulty: state === CardState.New ? 0 : 1 + rand() * 9,
              scheduledDays,
              reps: state === CardState.New ? 0 : 1 + Math.floor(rand() * 10),
              lastReview: state === CardState.New ? null : at - Math.floor(rand() * 30) * DAY_MS,
              updatedAt: createdAt,
            });
          }
        }

        db.transaction((tx) => {
          insertInStatements(wordRows, (part) => tx.insert(words).values(part).run());
          insertInStatements(cardRows, (part) => tx.insert(cards).values(part).run());
          insertInStatements(tagRows, (part) => tx.insert(wordTags).values(part).run());
          insertInStatements(wordRows, (part) =>
            insertIntoSearchIndex(
              tx,
              part.map((w) => ({
                id: w.id,
                translation: w.translation ?? null,
                definition: w.definition ?? null,
              })),
            ),
          );
        });
        onProgress?.({ phase: 'words', done: done + size, total: options.words });
        await yieldToUi();
      }

      if (cardIds.length === 0) return;
      for (let done = 0; done < options.reviewLogs; done += ROWS_PER_TRANSACTION) {
        const size = Math.min(ROWS_PER_TRANSACTION, options.reviewLogs - done);
        const logRows: (typeof reviewLogs.$inferInsert)[] = [];
        for (let i = 0; i < size; i++) {
          const roll = rand();
          logRows.push({
            id: newId(),
            cardId: pick(rand, cardIds),
            reviewedAt: at - Math.floor(rand() * 365 * DAY_MS),
            rating: roll < 0.15 ? 1 : roll < 0.3 ? 2 : roll < 0.9 ? 3 : 4,
            mode: 'flashcard',
            scheduled: true,
            durationMs: 1000 + Math.floor(rand() * 9000),
          });
        }
        db.transaction((tx) => {
          insertInStatements(logRows, (part) => tx.insert(reviewLogs).values(part).run());
        });
        onProgress?.({ phase: 'reviewLogs', done: done + size, total: options.reviewLogs });
        await yieldToUi();
      }
    },

    async wipe() {
      db.transaction((tx) => {
        clearSearchIndex(tx);
        // Children before parents (foreign keys are on).
        for (const table of [
          reviewLogs,
          sessions,
          wordTags,
          cards,
          words,
          importBatches,
          tags,
          dictionaries,
          settings,
        ]) {
          tx.delete(table).run();
        }
      });
    },

    async counts() {
      return {
        dictionaries: tableCount('dictionaries'),
        words: tableCount('words'),
        cards: tableCount('cards'),
        reviewLogs: tableCount('review_logs'),
      };
    },

    async benchmark(runs = 7) {
      const dictionaryId = (await findSeedDictionary()) ?? undefined;
      const tagIds = new Map((await repositories.tags.list()).map((tag) => [tag.name, tag.id]));
      const cases: { name: string; run: () => Promise<number> }[] = [
        {
          name: 'list A-Z, first page',
          run: async () =>
            (await repositories.words.list({ dictionaryId, sort: 'alpha' })).items.length,
        },
        {
          name: 'list recent, first page',
          run: async () =>
            (await repositories.words.list({ dictionaryId, sort: 'recent' })).items.length,
        },
        {
          name: 'search prefix "ka"',
          run: async () => (await repositories.words.search('ka', { dictionaryId })).length,
        },
        {
          name: 'search "mountain" (in translations)',
          run: async () => (await repositories.words.search('mountain', { dictionaryId })).length,
        },
        {
          name: 'search "mountain", all dictionaries',
          run: async () => (await repositories.words.search('mountain')).length,
        },
        {
          name: 'search prefix "ka", all dictionaries',
          run: async () => (await repositories.words.search('ka')).length,
        },
        {
          name: 'search with no match',
          run: async () => (await repositories.words.search('qqxz', { dictionaryId })).length,
        },
        {
          name: 'filter: tag "idioms" (rare), grouped',
          run: async () =>
            (await repositories.words.list({ tagId: tagIds.get('idioms'), sort: 'grouped' })).items
              .length,
        },
        {
          name: 'filter: mature + starred, grouped',
          run: async () =>
            (await repositories.words.list({ status: 'mature', starred: true, sort: 'grouped' }))
              .items.length,
        },
        {
          name: 'search "ka" + tag "B1"',
          run: async () =>
            (await repositories.words.search('ka', { tagId: tagIds.get('B1') })).length,
        },
        {
          name: 'search "mountain" + status new',
          run: async () => (await repositories.words.search('mountain', { status: 'new' })).length,
        },
        {
          name: 'duplicate check',
          run: async () =>
            dictionaryId
              ? (await repositories.words.findDuplicates(dictionaryId, termKeys('kabema'))).length
              : 0,
        },
      ];

      const results: BenchmarkResult[] = [];
      for (const testCase of cases) {
        await testCase.run(); // warm-up
        const times: number[] = [];
        let rows = 0;
        for (let i = 0; i < runs; i++) {
          const start = timer();
          rows = await testCase.run();
          times.push(timer() - start);
        }
        results.push({
          name: testCase.name,
          medianMs: median(times),
          maxMs: Math.max(...times),
          rows,
        });
      }
      return results;
    },
  };
}
