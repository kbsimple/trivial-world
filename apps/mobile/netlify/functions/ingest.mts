// Spike stub, replaced in 25-07. Carries the single public rate-limit rule (D-07).
import type { Config } from '@netlify/functions';

export default async (req: Request) =>
  new Response(JSON.stringify({ spike: true, path: new URL(req.url).pathname }), {
    status: 202,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

export const config: Config = {
  path: ['/api/v2/games', '/api/v2/feedback'],
  method: ['POST'],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
