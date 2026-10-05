import type { Clock } from '@/lib/clock';

/** Returns `length` cryptographically secure random bytes. */
export type RandomBytes = (length: number) => Uint8Array;

export interface IdGeneratorDeps {
  now: Clock;
  randomBytes: RandomBytes;
}

const MAX_TIMESTAMP = 2 ** 48 - 1;
const RANDOM_BYTE_COUNT = 10;

/**
 * Builds a UUIDv7 (RFC 9562): 48-bit Unix timestamp in milliseconds, version 7,
 * variant 0b10, and 74 random bits. Ids created in different milliseconds sort by time.
 */
export function uuidv7(timestampMs: number, random: Uint8Array): string {
  if (!Number.isInteger(timestampMs) || timestampMs < 0 || timestampMs > MAX_TIMESTAMP) {
    throw new RangeError(`uuidv7: timestamp out of range: ${timestampMs}`);
  }
  if (random.length < RANDOM_BYTE_COUNT) {
    throw new RangeError(`uuidv7: need ${RANDOM_BYTE_COUNT} random bytes, got ${random.length}`);
  }

  const bytes = new Uint8Array(16);
  let time = timestampMs;
  for (let i = 5; i >= 0; i--) {
    bytes[i] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes.set(random.subarray(0, RANDOM_BYTE_COUNT), 6);
  bytes[6] = 0x70 | (bytes[6] & 0x0f);
  bytes[8] = 0x80 | (bytes[8] & 0x3f);

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createIdGenerator({ now, randomBytes }: IdGeneratorDeps): () => string {
  return () => uuidv7(now(), randomBytes(RANDOM_BYTE_COUNT));
}
