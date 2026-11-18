import mongoose from "mongoose";

export async function connectMongo(uri: string): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8_000,
    maxPoolSize: 10,
  });
  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

export async function pingMongo(): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) return false;
  try {
    const db = mongoose.connection.db;
    if (!db) return false;
    await db.admin().command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export function isMongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}
