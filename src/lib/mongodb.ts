import dns from "dns";
import mongoose from "mongoose";

const DNS_SERVERS = ["8.8.8.8", "8.8.4.4"];

try {
  dns.setServers(DNS_SERVERS);
} catch {
  // Ignore — some runtimes don't support setServers
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function connectWithRetry(uri: string, opts: { bufferCommands: boolean; dbName: string }) {
  const delays = [0, 1000, 3000];
  let lastError: unknown;
  for (const delay of delays) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      // Re-apply before connecting: on some machines the module-load call
      // above silently fails to rebind the resolver channel, and queries keep
      // hitting a broken local DNS (127.0.0.1) with ECONNREFUSED.
      dns.setServers(DNS_SERVERS);
    } catch {
      // Ignore — connect will surface real failures
    }
    try {
      return await mongoose.connect(uri, opts);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable in .env.local");
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: "wallvnext",
    };

    cached.promise = connectWithRetry(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
