import { CardState, type CardStateValue } from '@/domain/models';
import { hasMeaning, wordStatus } from '@/domain/wordStatus';

const card = (state: CardStateValue, scheduledDays = 0, suspended = false) => ({
  state,
  scheduledDays,
  suspended,
});

describe('hasMeaning', () => {
  it('needs a non-blank translation or definition', () => {
    expect(hasMeaning({ translation: null, definition: null })).toBe(false);
    expect(hasMeaning({ translation: '  ', definition: '' })).toBe(false);
    expect(hasMeaning({ translation: 'house', definition: null })).toBe(true);
    expect(hasMeaning({ translation: null, definition: 'a building' })).toBe(true);
  });
});

describe('wordStatus', () => {
  it('derives every status from the card', () => {
    expect(wordStatus(null)).toBe('incomplete');
    expect(wordStatus(card(CardState.New))).toBe('new');
    expect(wordStatus(card(CardState.Learning))).toBe('learning');
    expect(wordStatus(card(CardState.Relearning))).toBe('learning');
    expect(wordStatus(card(CardState.Review, 20))).toBe('young');
    expect(wordStatus(card(CardState.Review, 21))).toBe('mature');
    expect(wordStatus(card(CardState.Review, 400, true))).toBe('suspended');
  });
});
