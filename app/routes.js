import { flatRoutes } from "@react-router/fs-routes";
export default flatRoutes();
import { redisInstance } from "./redis.server";
// import testBullMq from "./queues/test-bull.server";
await redisInstance();
// await testBullMq(redis);
