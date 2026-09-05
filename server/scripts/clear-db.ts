import { connectDb, clearDatabase, closeDb } from '../src/db/client.js';

async function main() {
  console.log('Connecting to MongoDB...');
  const { db } = await connectDb();
  console.log(`Clearing database "${db.databaseName}"...`);

  const { clearedCollections } = await clearDatabase(db);

  if (clearedCollections.length === 0) {
    console.log('[db] Database had no existing collections.');
  } else {
    console.log(`[db] Successfully cleared ${clearedCollections.length} collections: ${clearedCollections.join(', ')}`);
  }

  await closeDb();
  console.log('[db] Done!');
}

main().catch((err) => {
  console.error('[db] Error clearing database:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

