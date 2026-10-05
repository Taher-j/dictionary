// Types for the drizzle-kit generated migrations bundle (migrations/migrations.js).
declare module '@/data/db/migrations/migrations' {
  const bundle: {
    journal: {
      entries: { idx: number; when: number; tag: string; breakpoints: boolean }[];
    };
    migrations: Record<string, string>;
  };
  export default bundle;
}
