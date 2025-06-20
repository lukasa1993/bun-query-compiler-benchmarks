import * as Prisma from "./client";

export async function setup() {
	const prisma = new Prisma.PrismaClient({
		log: process.env.LOG_QUERIES ? ["query"] : [],
	});
	await prisma.$connect();

	return prisma;
}
