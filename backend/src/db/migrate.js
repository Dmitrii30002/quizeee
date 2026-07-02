const { runMigrations } = require('./migrations');

runMigrations()
  .then(() => {
    console.log('[DB] Migrations completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[DB] Migration failed:', err);
    process.exit(1);
  });

