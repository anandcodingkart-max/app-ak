import { Queue, Worker } from "bullmq";
import { redisInstance } from "../redis.server";
import { processOrderSwap } from "../utils/order-processor.server";

const redis = await redisInstance();

export const orderQueue = new Queue("order-processing", {
  connection: redis,
});

const worker = new Worker(
  "order-processing",
  async (job) => {
    console.log("WORKER IS ACTIVE");
    if (job.name === "swap-blend-product") {
      const { shop, payload } = job.data;
      console.log("JOB STARTED");
      await processOrderSwap(shop, payload);
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
