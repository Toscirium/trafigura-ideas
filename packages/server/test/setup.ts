// Runs before any test file's imports resolve — must set this before `db/db.ts` (a
// singleton, imported transitively by nearly everything) opens its connection, so tests
// never touch the real dev database.
process.env.SCHEDULING_DB_PATH = ':memory:';
