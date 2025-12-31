import { Redis } from "ioredis";

const redisOptions = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || "6379"),
  username: process.env.REDIS_USERNAME || "default",
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
};

async function redisInstance() {
  let instance;
  if (global.__redis) {
    instance = global.__redis;
    return instance;
  }
  instance = new Redis(redisOptions);

  instance.on("connect", () => console.log("✅ Redis connected"));
  instance.on("error", (err) =>
    console.error("❌ Redis connection error:", err),
  );
  instance.on("ready", () => {
    console.log("🚀 Redis ready to receive commands");
  });
  global.__redis = instance;
  return instance;
}

export { redisInstance };
