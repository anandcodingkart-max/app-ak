import { Queue, Worker } from "bullmq";
import { redisInstance } from "../redis.server";
import { processInventoryUpdate } from "../utils/inventory-processor.server";

const redis = await redisInstance();

export const inventoryQueue = new Queue("inventory-processing", {
  connection: redis,
});

const worker = new Worker(
  "inventory-processing",
  async (job) => {
    if (job.name === "update-inventory-stock") {
      const { shop, payload } = job.data;
      await processInventoryUpdate(shop, payload);
    }
  },
  {
    connection: redis,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
);

worker.on("error", (err) => {
  console.error("BullMQ Worker Connection Error:", err);
});
