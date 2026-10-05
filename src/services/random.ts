import { getRandomBytes } from 'expo-crypto';

import type { RandomBytes } from '@/lib/ids';

export const secureRandomBytes: RandomBytes = (length) => getRandomBytes(length);
