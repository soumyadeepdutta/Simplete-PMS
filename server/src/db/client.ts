import { MongoClient, type Db } from 'mongodb';
import { loadEnv } from '../config/env.js';
import { ensureIndexes, getCollections, type Collections } from './types.js';

let client: MongoClient | null = null;
let db: Db | null = null;
let collections: Collections | null = null;

export async function connectDb(): Promise<{ client: MongoClient; db: Db; cols: Collections }> {
  if (client && db && collections) {
    return { client, db, cols: collections };
  }

  const env = loadEnv();
  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  db = client.db();
  collections = getCollections(db);
  await ensureIndexes(collections);
  return { client, db, cols: collections };
}

export function getDb(): Db {
  if (!db) throw new Error('Database not connected');
  return db;
}

export function cols(): Collections {
  if (!collections) throw new Error('Database not connected');
  return collections;
}

export async function clearDatabase(dbInstance?: Db): Promise<{ clearedCollections: string[] }> {
  const targetDb = dbInstance || getDb();
  const collectionsList = await targetDb.collections();
  const clearedCollections: string[] = [];

  for (const collection of collectionsList) {
    await collection.deleteMany({});
    clearedCollections.push(collection.collectionName);
  }

  const activeCols = getCollections(targetDb);
  await ensureIndexes(activeCols);

  return { clearedCollections };
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    collections = null;
  }
}

