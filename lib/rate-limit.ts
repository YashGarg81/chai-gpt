type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, RateLimitEntry>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  unavailable?: boolean;
};

/**
 * In-memory fixed-window rate limiter for single-instance local development.
 * Not shared across serverless/multi-instance deployments.
 */
function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

/**
 * Distributed Redis REST rate limiter using atomic INCR + PEXPIRE pipeline.
 * Fails closed (`allowed: false, unavailable: true`) if Redis is unreachable.
 */
async function checkRedisRateLimit(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const endpoint = `${url.replace(/\/$/, "")}/pipeline`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, String(windowMs), "NX"],
      ["PTTL", key],
    ]),
  });

  if (!response.ok) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      unavailable: true,
    };
  }

  const data = (await response.json()) as Array<{ result?: number; error?: string }>;
  const count = Number(data[0]?.result ?? 0);
  const pttl = Number(data[2]?.result ?? windowMs);
  const retryAfterSeconds = Math.max(1, Math.ceil((pttl > 0 ? pttl : windowMs) / 1000));

  if (count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}

/**
 * Enforces per-key rate limiting. Uses Upstash Redis REST when
 * `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured
 * (failing closed on storage errors), and falls back to in-memory storage
 * only when Redis is not configured.
 */
export async function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (redisUrl && redisToken) {
    try {
      return await checkRedisRateLimit(redisUrl, redisToken, key, limit, windowMs);
    } catch {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
        unavailable: true,
      };
    }
  }

  return checkMemoryRateLimit(key, limit, windowMs);
}
