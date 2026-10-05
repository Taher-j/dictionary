import { createIdGenerator, uuidv7 } from '@/lib/ids';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const zeroBytes = (length: number) => new Uint8Array(length);
const fullBytes = (length: number) => new Uint8Array(length).fill(0xff);

describe('uuidv7', () => {
  it('encodes the timestamp in the first 48 bits', () => {
    const ts = Date.UTC(2026, 9, 5, 12, 0, 0, 123);
    const id = uuidv7(ts, zeroBytes(10));
    const encoded = parseInt(id.replace(/-/g, '').slice(0, 12), 16);
    expect(encoded).toBe(ts);
  });

  it('sets version 7 and variant 0b10 regardless of the random bytes', () => {
    expect(uuidv7(0, zeroBytes(10))).toBe('00000000-0000-7000-8000-000000000000');
    expect(uuidv7(2 ** 48 - 1, fullBytes(10))).toBe('ffffffff-ffff-7fff-bfff-ffffffffffff');
  });

  it('rejects timestamps outside 48 bits and short random input', () => {
    expect(() => uuidv7(-1, zeroBytes(10))).toThrow(RangeError);
    expect(() => uuidv7(2 ** 48, zeroBytes(10))).toThrow(RangeError);
    expect(() => uuidv7(1.5, zeroBytes(10))).toThrow(RangeError);
    expect(() => uuidv7(0, zeroBytes(9))).toThrow(RangeError);
  });
});

describe('createIdGenerator', () => {
  it('produces valid ids that sort by creation time', () => {
    let time = 1_700_000_000_000;
    let seed = 0;
    const nextId = createIdGenerator({
      now: () => time,
      randomBytes: (length) => new Uint8Array(length).map(() => (seed = (seed * 31 + 7) % 256)),
    });

    const ids: string[] = [];
    for (let i = 0; i < 50; i++) {
      ids.push(nextId());
      time += 1;
    }

    ids.forEach((id) => expect(id).toMatch(UUID_V7));
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });

  it('asks for 10 random bytes per id', () => {
    const randomBytes = jest.fn(zeroBytes);
    createIdGenerator({ now: () => 0, randomBytes })();
    expect(randomBytes).toHaveBeenCalledWith(10);
  });
});
