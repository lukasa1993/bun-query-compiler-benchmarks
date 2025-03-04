import { PrismaClient } from './client';
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

export async function setup() {
  const connectionString = process.env.DATABASE_URL ?? ''

  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();

  return prisma;
}
