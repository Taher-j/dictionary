import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from '@/data/db/schema';

/**
 * A synchronous Drizzle SQLite database with the app schema. In the app this is expo-sqlite;
 * in tests it is better-sqlite3. Repositories depend only on this type.
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
