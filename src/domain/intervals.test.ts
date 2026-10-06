import { intervalParts } from '@/domain/intervals';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

describe('intervalParts', () => {
  it('picks the unit for rating buttons', () => {
    expect(intervalParts(0)).toEqual({ value: 1, unit: 'minute' });
    expect(intervalParts(10 * MIN)).toEqual({ value: 10, unit: 'minute' });
    expect(intervalParts(5 * 60 * MIN)).toEqual({ value: 5, unit: 'hour' });
    expect(intervalParts(3 * DAY)).toEqual({ value: 3, unit: 'day' });
    expect(intervalParts(45 * DAY)).toEqual({ value: 1.5, unit: 'month' });
    expect(intervalParts(730 * DAY)).toEqual({ value: 2, unit: 'year' });
  });
});
