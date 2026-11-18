import type { Config } from '@netlify/functions';
import { spikeHealth } from '@trivial-world/api';

export default async (req: Request) => spikeHealth(req);

export const config: Config = { path: '/api/v2/health', method: ['GET'] };
