import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./client";

export async function setup() {
	const connectionString = process.env.DATABASE_URL ?? "";

	const adapter = new PrismaPg({ connectionString });
	const prisma = new PrismaClient({ adapter });

	await prisma.$connect();

	return prisma;
}
