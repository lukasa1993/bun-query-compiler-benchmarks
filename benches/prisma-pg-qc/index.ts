import { benches as originalBenches } from 'prisma-common/benches';
import { Bench } from 'common';
import { PrismaClient } from './client';

export * from './setup';
export const benches = originalBenches as Bench<PrismaClient>;
