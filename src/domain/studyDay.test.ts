import { nextStudyDayStart, studyDayStart } from '@/domain/studyDay';

const local = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute).getTime();

describe('study day', () => {
  it('counts a review at 02:00 for the previous day', () => {
    expect(studyDayStart(local(7, 2))).toBe(local(6, 4));
  });

  it('starts a new study day at 04:00', () => {
    expect(studyDayStart(local(7, 3, 59))).toBe(local(6, 4));
    expect(studyDayStart(local(7, 4))).toBe(local(7, 4));
    expect(studyDayStart(local(7, 23, 30))).toBe(local(7, 4));
  });

  it('gives the next rollover', () => {
    expect(nextStudyDayStart(local(7, 2))).toBe(local(7, 4));
    expect(nextStudyDayStart(local(7, 12))).toBe(local(8, 4));
  });
});
