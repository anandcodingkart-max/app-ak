import { Queue, Worker } from "bullmq";
import { redisInstance } from "../redis.server";
import { processOrderController } from "../controllers";

const redis = await redisInstance();

export const orderQueue = new Queue("order-processing", {
  connection: redis,
});

const worker = new Worker(
  "order-processing",
  async (job) => {
    console.log("ORDER QUEUE CALLED: ", job.name);
    if (job.name === "order-data-process") {
      const { shop, payload } = job.data;
      await processOrderController(shop, payload);
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
