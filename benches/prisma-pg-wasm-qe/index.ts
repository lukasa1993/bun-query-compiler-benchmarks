import type { Bench } from "common";
import { benches as originalBenches } from "prisma-common/benches";
import type { PrismaClient } from "./client";

export * from "./setup";
export const benches = originalBenches as Bench<PrismaClient>;
