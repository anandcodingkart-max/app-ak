import { Queue } from "bullmq";

async function testBullMq(redis) {
  const myQueue = new Queue("mainQueue", {
    connection: redis,
  });

  try {
    // Forces BullMQ to instantiate its internal Redis client
    await myQueue.client;

    // Executes real BullMQ commands
    // Loads BullMQ Lua scripts into Redis
    // Validates queue key namespaces
    // Confirms Redis permissions
    await myQueue.getJobCounts();
    console.log("✅ BullMQ is ready");
  } catch (err) {
    console.error("❌ BullMQ failed to initialize", err);
    process.exit(1); // fail fast
  } finally {
    // Always clean up resources
    if (myQueue) {
      await myQueue.close();
    }
  }
}
export default testBullMq;
