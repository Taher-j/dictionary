/** @jest-environment node */
import { createTestContext } from '@/data/testing/testDatabase';
import { CardState } from '@/domain/models';
import { buildChoice, seededRandom } from '@/domain/practice/choice';
import { pickMode } from '@/domain/practice/mode';
import { buildQueue } from '@/domain/queue';

const DAY = 86_400_000;

describe('a 20-card session', () => {
  it('mixes flashcards, typing and multiple choice', async () => {
    const { repos, time } = createTestContext(new Date(2026, 9, 7, 9).getTime());
    const de = await repos.dictionaries.create({ name: 'German', bothDirections: true });
    // 30 words: each has a recognition and a recall card. A third are in review (due), a third
    // learning (due), a third new.
    for (let i = 0; i < 30; i++) {
      const word = await repos.words.create({
        dictionaryId: de.id,
        term: `Wort ${i}`,
        translation: `word ${i}`,
      });
      for (const card of await repos.cards.listForWord(word.id)) {
        const kind = i % 3;
        if (kind === 2) continue; // new
        await repos.cards.updateSchedule(card.id, {
          ...card,
          state: kind === 0 ? CardState.Review : CardState.Learning,
          // Siblings are never due at the same moment in real use: here the recall card of
          // every other word is due first.
          due:
            time() -
            (kind === 0 ? DAY : 60_000) -
            (card.direction === 'recall' && i % 2 === 0 ? 3_600_000 : 0),
          stability: kind === 0 ? 5 : 0.5,
          difficulty: 5,
          scheduledDays: kind === 0 ? 5 : 0,
          reps: 3,
          lastReview: time() - 5 * DAY,
        });
      }
    }

    const candidates = await repos.reviews.queueCandidates({ dailyNewLimit: 10, sessionSize: 20 });
    const queue = buildQueue({ ...candidates, sessionSize: 20 });
    expect(queue).toHaveLength(20);

    const modes = [];
    for (const item of queue) {
      const card = await repos.cards.getById(item.cardId);
      const word = await repos.words.getById(item.wordId);
      if (!card || !word) throw new Error('missing card or word');
      const pool = await repos.words.choicePool(word.dictionaryId, word.id);
      const side = (w: { term: string; meaning: string }) =>
        card.direction === 'recall' ? w.term : w.meaning;
      const choice = buildChoice(
        {
          wordId: word.id,
          text: side({ term: word.term, meaning: word.translation ?? '' }),
          partOfSpeech: null,
        },
        pool.map((w) => ({ wordId: w.id, text: side(w), partOfSpeech: w.partOfSpeech })),
        seededRandom(card.id),
      );
      modes.push(pickMode(card, { flashcardsOnly: false, choiceAvailable: choice !== null }));
    }
    expect(new Set(modes)).toEqual(new Set(['flashcard', 'typing', 'choice']));
    // One card per word (sibling rule).
    expect(new Set(queue.map((c) => c.wordId)).size).toBe(20);
  });
});
