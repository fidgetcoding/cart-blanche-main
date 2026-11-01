// Database-backed rate limits shared by the public edge functions.

interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

export type LimitResult = "ok" | "limited" | "unavailable";

/** Each limit is [bucket, max hits, window in seconds]. Any failure refuses the request. */
export async function checkLimits(client: RpcClient, limits: [string, number, number][]): Promise<LimitResult> {
  for (const [bucket, limit, windowSeconds] of limits) {
    const { data, error } = await client.rpc("edge_rate_limit_hit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("Rate limit check failed:", error);
      return "unavailable";
    }
    if (!data) return "limited";
  }
  return "ok";
}
