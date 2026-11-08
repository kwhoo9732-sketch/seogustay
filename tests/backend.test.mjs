import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { handleGuide, normalizeIntent, findHomes } from '../lib/solar.mjs';
import {
  AI_LIMITS, AI_USAGE_TTL_SECONDS, RESERVE_USAGE_LUA, LimiterUnavailableError,
  limiterConfiguration, trustedVisitorIp, usageKeys, reserveGuideUsage,
} from '../lib/ai-limiter.mjs';
import guideEntry from '../api/guide.js';
import statusEntry from '../api/guide/status.js';

const origin = 'https://seogu-stay.example';
const redisUrl = 'https://quota.example';
const providerUrl = 'https://api.upstage.ai/v1/chat/completions';
const env = {
  VERCEL: '1', SOLAR_API_KEY: 'test-solar-secret',
  UPSTASH_REDIS_REST_URL: redisUrl, UPSTASH_REDIS_REST_TOKEN: 'test-redis-secret',
};
const request = (body = { message: '공원과 초등학교 가까운 집' }, headers = {}) => new Request(`${origin}/api/guide`, {
  method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1', ...headers },
  body: JSON.stringify(body),
});
const statusRequest = () => new Request(`${origin}/api/guide/status`);
const providerReply = (overrides = {}) => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({
  intro: '공원과 초등학교 위치를 함께 확인할게요.',
  needs: ['nature', 'elementary'], neighborhood: 'all', maxPriceMan: null, query: '', limitations: [],
  ...overrides,
}) } }] });

test('status is secret-free and requires both Solar and a complete Redis configuration', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('status must not contact an external provider'));
  assert.deepEqual(await (await handleGuide(statusRequest(), {})).json(), { ready: false, provider: 'Solar', model: 'solar-mini4' });
  assert.equal((await (await handleGuide(statusRequest(), { SOLAR_API_KEY: env.SOLAR_API_KEY })).json()).ready, false);
  assert.equal((await (await handleGuide(statusRequest(), { ...env, SOLAR_API_KEY: '' })).json()).ready, false);
  const response = await handleGuide(statusRequest(), { ...env, SOLAR_MODEL: 'unsupported-model' });
  assert.deepEqual(await response.json(), { ready: true, provider: 'Solar', model: 'solar-mini4' });
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal((await (await handleGuide(statusRequest(), { ...env, SOLAR_MODEL: 'solar-pro4' })).json()).model, 'solar-pro4');
});

test('Redis aliases are paired, validated, and separated by an application prefix', () => {
  assert.equal(limiterConfiguration(env).url, redisUrl);
  assert.deepEqual(limiterConfiguration({ KV_REST_API_URL: `${redisUrl}/`, KV_REST_API_TOKEN: 'kv-token' }), {
    url: redisUrl, token: 'kv-token', prefix: 'seogu-stay:ai:v1',
  });
  assert.equal(limiterConfiguration({ UPSTASH_REDIS_REST_URL: redisUrl, KV_REST_API_TOKEN: 'wrong-pair' }), null);
  assert.equal(limiterConfiguration({ ...env, UPSTASH_REDIS_REST_URL: 'http://quota.example' }), null);
  assert.equal(limiterConfiguration({ ...env, UPSTASH_REDIS_REST_URL: 'https://user:secret@quota.example' }), null);
  assert.equal(limiterConfiguration({ ...env, UPSTASH_REDIS_REST_URL: `${redisUrl}/?secret=1` }), null);
  assert.equal(limiterConfiguration({ ...env, STAY_RATE_LIMIT_PREFIX: 'unsafe{slot}' }), null);
  assert.equal(limiterConfiguration({ ...env, STAY_RATE_LIMIT_PREFIX: 'seogu-stay:preview' }).prefix, 'seogu-stay:preview');
});

test('only the Vercel platform IP header is used; spoofed Cloudflare headers do not partition local quotas', () => {
  assert.equal(trustedVisitorIp(request(), env), '192.0.2.1');
  assert.equal(trustedVisitorIp(request(undefined, { 'CF-Connecting-IP': '203.0.113.8', 'x-forwarded-for': '203.0.113.9' }), {}), 'local-development');
  assert.throws(() => trustedVisitorIp(request(undefined, {
    'x-vercel-forwarded-for': '', 'x-forwarded-for': '203.0.113.9', 'CF-Connecting-IP': '203.0.113.8',
  }), env), LimiterUnavailableError);
  assert.throws(() => trustedVisitorIp(request(undefined, { 'x-vercel-forwarded-for': '203.0.113.8, 203.0.113.9' }), env), LimiterUnavailableError);
  const now = Date.UTC(2026, 10, 4, 1);
  const keys = usageKeys('192.0.2.1', now);
  assert.equal(keys.length, 3);
  assert.ok(keys.every(key => key.startsWith('{seogu-stay:ai:v1}:')));
  assert.ok(keys.every(key => !key.includes('192.0.2.1')));
  assert.equal(keys[1], usageKeys('192.0.2.1', now + 600_000)[1], 'daily identity remains stable within the UTC day');
  assert.notEqual(keys[2], usageKeys('192.0.2.1', now + 600_000)[2], 'burst windows roll every ten minutes');
  assert.notEqual(keys[1].split(':').at(-1), usageKeys('192.0.2.1', now + 86_400_000)[1].split(':').at(-1), 'IP hashes rotate daily');
});

test('quota reservation is one EVAL containing all three keys and the 48-hour expiry', async () => {
  const sent = [];
  const now = Date.UTC(2026, 10, 4, 1);
  const execute = async (url, options) => {
    assert.equal(url, redisUrl);
    assert.equal(options.headers.Authorization, 'Bearer test-redis-secret');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    sent.push(JSON.parse(options.body));
    return Response.json({ result: sent.length === 1 ? 1 : 0 });
  };
  assert.equal(await reserveGuideUsage(request(), env, { now, fetch: execute }), true);
  assert.equal(await reserveGuideUsage(request(), env, { now, fetch: execute }), false);
  assert.equal(sent.length, 2, 'each reservation uses a single atomic command and no retry');
  assert.deepEqual(sent[0], [
    'EVAL', RESERVE_USAGE_LUA, 3, ...usageKeys('192.0.2.1', now),
    AI_LIMITS.daily, AI_LIMITS.visitor, AI_LIMITS.burst, AI_USAGE_TTL_SECONDS,
  ]);
  assert.equal(AI_USAGE_TTL_SECONDS, 172800);
  assert.ok(!JSON.stringify(sent).includes('test-redis-secret'));
});

test('Redis errors and ambiguous replies fail closed without exposing connection details', async () => {
  const responses = [
    () => Promise.reject(new Error('test-redis-secret https://quota.example internal error')),
    async () => new Response('test-redis-secret provider details', { status: 401 }),
    async () => Response.json({ error: 'test-redis-secret provider details' }),
    async () => Response.json({ result: '1' }),
    async () => Response.json({ result: null }),
    async () => new Response('not-json'),
  ];
  for (const execute of responses) {
    await assert.rejects(reserveGuideUsage(request(), env, { fetch: execute }), error => {
      assert.ok(error instanceof LimiterUnavailableError);
      assert.equal(error.message, 'AI usage limiter is unavailable');
      return true;
    });
  }
  await assert.rejects(reserveGuideUsage(request(), {}, { fetch: () => assert.fail('no credentials must mean no request') }), LimiterUnavailableError);
});

test('method, origin, JSON, and input limits are checked before reserving or calling Solar', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('invalid requests must not contact Redis or Solar'));
  assert.equal((await handleGuide(new Request(`${origin}/api/guide`), env)).status, 405);
  assert.equal((await handleGuide(request({}, { Origin: 'https://other.example' }), env)).status, 403);
  assert.equal((await handleGuide(request({}, { Origin: '' }), env)).status, 403);
  assert.equal((await handleGuide(request({}, { 'Content-Type': 'text/plain' }), env)).status, 415);
  assert.equal((await handleGuide(request(), {})).status, 503);
  assert.equal((await handleGuide(request(), { SOLAR_API_KEY: env.SOLAR_API_KEY })).status, 503);
  assert.equal((await handleGuide(request({ message: 'a'.repeat(601) }), env)).status, 400);
  assert.equal((await handleGuide(request({ message: '' }), env)).status, 400);
  assert.equal((await handleGuide(request({ message: '집 찾기', history: [{ role: 'user', content: 'a'.repeat(15000) }] }), env)).status, 400);
  let cancelled = false;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(14001)); }, cancel() { cancelled = true; } });
  const streamed = new Request(`${origin}/api/guide`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: stream, duplex: 'half',
  });
  assert.equal((await handleGuide(streamed, env)).status, 400);
  assert.equal(cancelled, true, 'oversized streams are cancelled without reading the rest');
});

test('quota denial and limiter failure never call Solar and keep their public errors generic', async t => {
  let reservations = 0;
  const fakeFetch = t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url, redisUrl, 'Solar must not run when a reservation fails');
    reservations++;
    return Response.json({ result: 0 });
  });
  const limited = await handleGuide(request(), env);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('Retry-After'), '600');
  assert.equal((await limited.json()).code, 'rate_limit');
  assert.equal(reservations, 1);
  fakeFetch.mock.mockImplementation(async () => { throw new Error('test-redis-secret internal details'); });
  const failed = await handleGuide(request(), env);
  assert.equal(failed.status, 503);
  const body = await failed.text();
  assert.ok(body.includes('usage_unavailable'));
  assert.ok(!body.includes('test-redis-secret'));
  assert.ok(!body.includes('internal details'));
});

test('Solar success keeps input bounds, normalizes intent, and returns only locally computed homes', async t => {
  let reservations = 0;
  let solarCalls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === redisUrl) { reservations++; return Response.json({ result: 1 }); }
    assert.equal(url, providerUrl);
    assert.equal(options.headers.Authorization, 'Bearer test-solar-secret');
    solarCalls++;
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'solar-mini4');
    assert.equal(body.max_tokens, 1000);
    assert.equal(body.messages.length, 6, 'only the final four history messages accompany system and current input');
    assert.ok(body.messages.slice(1, -1).every(message => message.content.length <= 900));
    return providerReply({ needs: ['nature', 'invalid-need', 'nature', 'elementary'], homes: [{ name: 'AI invented property' }] });
  });
  const history = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'a'.repeat(901) }));
  const response = await handleGuide(request({ message: '공원과 초등학교 가까운 집', history }), env);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.provider, 'Solar');
  assert.deepEqual(data.intent.needs, ['nature', 'elementary']);
  assert.deepEqual(data.homes, findHomes(data.intent).homes);
  assert.equal(data.homes.length, 3);
  assert.ok(!JSON.stringify(data).includes('AI invented property'));
  assert.ok(!JSON.stringify(data).includes('test-solar-secret'));
  assert.equal(reservations, 1);
  assert.equal(solarCalls, 1);
});

test('provider failures are redacted and still count as reserved usage attempts', async t => {
  let reservations = 0;
  let solarCalls = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (url === redisUrl) { reservations++; return Response.json({ result: 1 }); }
    assert.equal(url, providerUrl);
    solarCalls++;
    return new Response('test-solar-secret provider internal details', { status: 401 });
  });
  const response = await handleGuide(request(), env);
  assert.equal(response.status, 502);
  const body = await response.text();
  assert.ok(body.includes('provider_error'));
  assert.ok(!body.includes('test-solar-secret'));
  assert.ok(!body.includes('provider internal details'));
  assert.equal(reservations, 1);
  assert.equal(solarCalls, 1);
});

test('all supported condition combinations preserve the original browser matching results', () => {
  const context = {};
  vm.runInNewContext(readFileSync(new URL('../public/matching.js', import.meta.url), 'utf8'), context);
  const matching = context.SeoguMatching;
  const homes = JSON.parse(readFileSync(new URL('../public/data-housing.json', import.meta.url), 'utf8')).apartments;
  const places = JSON.parse(readFileSync(new URL('../public/data-places.json', import.meta.url), 'utf8')).places;
  const schools = JSON.parse(readFileSync(new URL('../public/data-schools.json', import.meta.url), 'utf8')).schools;
  const ids = matching.criteria.map(criterion => criterion.id);
  for (let mask = 1; mask < 2 ** ids.length; mask++) {
    const needs = ids.filter((_, i) => mask & (1 << i));
    if (needs.length > 3) continue;
    const scores = homes.map(home => {
      const results = matching.evaluate(home, { places, schools }).filter(result => needs.includes(result.id));
      return {
        name: home.name,
        matched: results.filter(result => result.met && result.available).length,
        unknown: results.filter(result => !result.available).length,
      };
    }).filter(home => home.matched || home.unknown).sort((a, b) => b.matched - a.matched || a.name.localeCompare(b.name, 'ko-KR'));
    const actual = findHomes({ needs, neighborhood: 'all', query: '', maxPriceMan: null });
    assert.equal(actual.total, scores.length, needs.join(','));
    assert.deepEqual(actual.homes.map(home => home.name), scores.slice(0, 3).map(home => home.name), needs.join(','));
  }
  const limited = findHomes({ needs: [], neighborhood: '풍암동', query: '', maxPriceMan: 30000 });
  assert.ok(limited.total > 0);
  for (const home of limited.homes) {
    const original = homes.find(item => item.id === home.id);
    assert.ok(original.transactions[0].priceMan <= 30000);
    assert.equal(original.neighborhood, '풍암동');
  }
  assert.deepEqual(normalizeIntent({ needs: ['nature', 'nature', 'bogus', 'elementary'], neighborhood: 'unknown', maxPriceMan: '30000', query: '  풍암  ' }), {
    needs: ['nature', 'elementary'], neighborhood: 'all', maxPriceMan: null, query: '풍암',
  });
});

test('both Vercel entry points accept Web Requests and return Web Responses', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('unconfigured entry points must not make network calls'));
  const oldKey = process.env.SOLAR_API_KEY;
  process.env.SOLAR_API_KEY = '';
  try {
    assert.equal(typeof guideEntry.fetch, 'function');
    assert.equal(typeof statusEntry.fetch, 'function');
    const status = await statusEntry.fetch(statusRequest());
    assert.ok(status instanceof Response);
    assert.equal((await status.json()).ready, false);
    assert.equal((await guideEntry.fetch(request())).status, 503);
  } finally {
    if (oldKey === undefined) delete process.env.SOLAR_API_KEY;
    else process.env.SOLAR_API_KEY = oldKey;
  }
});
