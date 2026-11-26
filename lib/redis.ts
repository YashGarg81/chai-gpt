import { Redis } from "@upstash/redis";

/**
 * Shared Upstash Redis client configured from `UPSTASH_REDIS_REST_URL`
 * and `UPSTASH_REDIS_REST_TOKEN`.
 */
export const redis = Redis.fromEnv();
