import { PrismaBun } from "./adapters/db";
import { PrismaClient } from "./client/client";

export async function setup() {
	const connectionString = process.env.DATABASE_URL ?? "";

	const adapter = new PrismaBun({ connectionString });

	const prisma = new PrismaClient({ adapter });

	await prisma.$connect();

	return prisma;
}
