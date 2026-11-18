import type { Config } from '@netlify/functions';
import { spikeProbe } from '@trivial-world/api';

export default async (req: Request) => spikeProbe(req);

export const config: Config = { path: '/api/v2/_spike/probe', method: ['GET', 'POST'] };
