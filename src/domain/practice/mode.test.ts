import { CardState } from '@/domain/models';
import { pickMode } from '@/domain/practice/mode';

const all = { flashcardsOnly: false, choiceAvailable: true };

describe('pickMode', () => {
  it('types recall cards in review and shows recognition reviews as flashcards', () => {
    expect(pickMode({ direction: 'recall', state: CardState.Review }, all)).toBe('typing');
    expect(pickMode({ direction: 'recognition', state: CardState.Review }, all)).toBe('flashcard');
  });

  it('uses multiple choice for new and (re)learning cards when distractors exist', () => {
    for (const state of [CardState.New, CardState.Learning, CardState.Relearning]) {
      expect(pickMode({ direction: 'recognition', state }, all)).toBe('choice');
      expect(pickMode({ direction: 'recall', state }, all)).toBe('choice');
      expect(pickMode({ direction: 'recall', state }, { ...all, choiceAvailable: false })).toBe(
        'flashcard',
      );
    }
  });

  it('shows only flashcards with the setting on', () => {
    const only = { flashcardsOnly: true, choiceAvailable: true };
    expect(pickMode({ direction: 'recall', state: CardState.Review }, only)).toBe('flashcard');
    expect(pickMode({ direction: 'recognition', state: CardState.New }, only)).toBe('flashcard');
  });
});
