import { Redis } from "ioredis";

let redis;

const redisOptions = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || "6379"),
  username: process.env.REDIS_USERNAME || "default",
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
};

if (!global.__redis) {
  console.log("Initializing shared Redis connection pool...");
  global.__redis = new Redis(redisOptions);
}

redis = global.__redis;

export { redis };
