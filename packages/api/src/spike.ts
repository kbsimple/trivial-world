// Spike module (deleted in 25-07). The DB client is created lazily so importing
// this module never touches the database.
import { sql, count } from 'drizzle-orm';
import { readEnv } from './env';
import { spikeProbeTable } from './schema';

let cachedDb: Awaited<ReturnType<typeof createDb>> | undefined;

async function createDb() {
  const { drizzle } = await import('drizzle-orm/netlify-db');
  return drizzle();
}

async function getSpikeDb() {
  if (!cachedDb) cachedDb = await createDb();
  return cachedDb;
}

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

async function dbHostFingerprint(): Promise<string | null> {
  const url = readEnv('NETLIFY_DB_URL');
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(host));
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 12);
  } catch {
    return null;
  }
}

export async function spikeHealth(req: Request): Promise<Response> {
  const started = Date.now();
  let status: 'ok' | 'down' = 'ok';
  let error: string | undefined;
  try {
    const db = await getSpikeDb();
    await db.execute(sql`select 1`, 'arrays');
  } catch (e) {
    status = 'down';
    error = e instanceof Error ? e.constructor.name : 'UnknownError';
  }
  const latencyMs = Date.now() - started;

  let statuszSelfFetch: { ok: boolean; status: number } | { ok: false; status: 0 };
  try {
    const r = await fetch(new URL('/statusz.json', req.url));
    statuszSelfFetch = { ok: r.ok, status: r.status };
  } catch {
    statuszSelfFetch = { ok: false, status: 0 };
  }

  return json({
    status,
    ...(error ? { error } : {}),
    latencyMs,
    dbHostFingerprint: await dbHostFingerprint(),
    nodeVersion: (globalThis as { process?: { version?: string } }).process?.version ?? null,
    context: readEnv('CONTEXT') ?? null,
    statuszSelfFetch,
  });
}

class RollbackSentinel extends Error {}

export async function spikeProbe(req: Request): Promise<Response> {
  const fingerprint = await dbHostFingerprint();
  try {
    const db = await getSpikeDb();
    const countRows = async () => {
      const [row] = await db.select({ n: count() }).from(spikeProbeTable);
      return Number(row?.n ?? 0);
    };
    if (req.method === 'POST') {
      const mode = new URL(req.url).searchParams.get('mode');
      const note = `${readEnv('CONTEXT') ?? 'unknown'} ${new Date().toISOString()}`;
      if (mode === 'commit') {
        await db.transaction(async (tx) => {
          await tx.insert(spikeProbeTable).values({ note });
        });
        return json({ committed: true, count: await countRows(), dbHostFingerprint: fingerprint });
      }
      if (mode === 'rollback') {
        const countBefore = await countRows();
        try {
          await db.transaction(async (tx) => {
            await tx.insert(spikeProbeTable).values({ note });
            throw new RollbackSentinel('rollback');
          });
        } catch (e) {
          if (!(e instanceof RollbackSentinel)) throw e;
        }
        const countAfter = await countRows();
        return json({ rolledBack: true, countBefore, countAfter, dbHostFingerprint: fingerprint });
      }
      return json({ error: 'mode must be commit or rollback' }, 400);
    }
    return json({ count: await countRows(), dbHostFingerprint: fingerprint });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.constructor.name : 'UnknownError', dbHostFingerprint: fingerprint },
      500,
    );
  }
}

