import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

export const AI_LIMITS = Object.freeze({ daily: 200, visitor: 20, burst: 5 });
export const AI_USAGE_TTL_SECONDS = 48 * 60 * 60;
const DEFAULT_PREFIX = 'seogu-stay:ai:v1';

// EVAL checks every bucket before changing any bucket. A rejected request
// therefore consumes none of the other quotas. Redis executes a script atomically.
// Keys share a hash tag so this also works with Redis Cluster key-slot rules.
export const RESERVE_USAGE_LUA = `
if #KEYS ~= 3 or #ARGV ~= 4 then
  return redis.error_reply('invalid quota arguments')
end
local ttl = tonumber(ARGV[4])
if not ttl or ttl <= 0 or ttl ~= math.floor(ttl) then
  return redis.error_reply('invalid quota ttl')
end
local counts = {}
for i = 1, #KEYS do
  local ceiling = tonumber(ARGV[i])
  local raw = redis.call('GET', KEYS[i])
  local count = tonumber(raw or '0')
  if not ceiling or ceiling <= 0 or not count or count < 0 or count ~= math.floor(count) then
    return redis.error_reply('invalid quota counter')
  end
  if count >= ceiling then
    return 0
  end
  counts[i] = count
end
for i = 1, #KEYS do
  redis.call('INCR', KEYS[i])
  if counts[i] == 0 then
    redis.call('EXPIRE', KEYS[i], ttl)
  end
end
return 1
`.trim();

export class LimiterUnavailableError extends Error {
  constructor() {
    super('AI usage limiter is unavailable');
    this.name = 'LimiterUnavailableError';
  }
}

const nonempty = value => typeof value === 'string' ? value.trim() : '';

export function limiterConfiguration(env = {}) {
  const upstashUrl = nonempty(env.UPSTASH_REDIS_REST_URL);
  const upstashToken = nonempty(env.UPSTASH_REDIS_REST_TOKEN);
  // Never combine a URL from one provider configuration with another token.
  const selected = upstashUrl || upstashToken
    ? { url: upstashUrl, token: upstashToken }
    : { url: nonempty(env.KV_REST_API_URL), token: nonempty(env.KV_REST_API_TOKEN) };
  if (!selected.url || !selected.token || /[\r\n]/.test(selected.token)) return null;

  const prefix = nonempty(env.STAY_RATE_LIMIT_PREFIX) || DEFAULT_PREFIX;
  if (!/^[A-Za-z0-9:_-]{1,80}$/.test(prefix)) return null;
  try {
    const url = new URL(selected.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      return null;
    }
    return { url: url.origin, token: selected.token, prefix };
  } catch {
    return null;
  }
}

export function trustedVisitorIp(request, env = {}) {
  // Only the Vercel platform injects this trusted header in production.
  // A local server must not trust visitor-supplied forwarding headers.
  if (env.VERCEL !== '1') return 'local-development';
  const ip = (request.headers.get('x-vercel-forwarded-for') || '').trim();
  if (!isIP(ip)) throw new LimiterUnavailableError();
  return ip;
}

export function usageKeys(ip, now, prefix = DEFAULT_PREFIX) {
  const day = Math.floor(now / 86_400_000);
  const window = Math.floor(now / 600_000);
  const hash = createHash('sha256').update(`${day}:${ip}`).digest('hex');
  return [
    `{${prefix}}:global:${day}`,
    `{${prefix}}:visitor:${day}:${hash}`,
    `{${prefix}}:burst:${window}:${hash}`,
  ];
}

export async function reserveGuideUsage(request, env = {}, options = {}) {
  const configuration = limiterConfiguration(env);
  if (!configuration) throw new LimiterUnavailableError();
  const keys = usageKeys(trustedVisitorIp(request, env), options.now ?? Date.now(), configuration.prefix);
  const executeFetch = options.fetch ?? globalThis.fetch;
  try {
    const response = await executeFetch(configuration.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${configuration.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        'EVAL', RESERVE_USAGE_LUA, keys.length, ...keys,
        AI_LIMITS.daily, AI_LIMITS.visitor, AI_LIMITS.burst, AI_USAGE_TTL_SECONDS,
      ]),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new LimiterUnavailableError();
    const body = await response.json();
    if (body?.error || (body?.result !== 0 && body?.result !== 1)) throw new LimiterUnavailableError();
    return body.result === 1;
  } catch {
    // Neither Redis error details nor its URL/token belong in client responses.
    throw new LimiterUnavailableError();
  }
}
