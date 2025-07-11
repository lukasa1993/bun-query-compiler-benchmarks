import arg from "arg";
import { run } from "mitata";

import { type Runner, generateCommonBenchmarks } from "common";
import * as prismaNativeQeBench from "prisma-native-qe";
import * as prismaPgNapiBench from "prisma-pg-napi-qe";
import * as prismaPgWasmBench from "prisma-pg-wasm-qe";
import * as prismaPgQcBench from "./benches/prisma-pg-qc";
// import * as prismaPgQcBenchBun from "./benches/prisma-pg-qc";
import * as prismaPgQcBenchBun from "./benches/prisma-pg-qc-bun";

const [
	prismaNativeQe,
	prismaPgNapiQe,
	prismaPgWasmQe,
	prismaPgQc,
	prismaPgQcBun,
] = await Promise.all([
	prismaNativeQeBench.setup(),
	prismaPgNapiBench.setup(),
	prismaPgWasmBench.setup(),
	prismaPgQcBench.setup(),
	prismaPgQcBenchBun.setup(),
]);

async function main() {
	const runners: Runner<unknown>[] = [
		{
			name: "Native QE with tokio-postgres",
			benchRunner: prismaNativeQeBench.benches,
			client: prismaNativeQe,
		},
		{
			name: "Native QE with pg driver adapter",
			benchRunner: prismaPgNapiBench.benches,
			client: prismaPgNapiQe,
		},
		{
			name: "Edge-compatible QE with pg driver adapter",
			benchRunner: prismaPgWasmBench.benches,
			client: prismaPgWasmQe,
		},
		{
			name: "Query compiler with pg driver adapter",
			benchRunner: prismaPgQcBench.benches,
			client: prismaPgQc,
		},
		{
			name: "Query compiler with pg driver adapter Bun",
			benchRunner: prismaPgQcBenchBun.benches,
			client: prismaPgQcBun,
		},
	];

	const args = arg({
		"--bench": [String],
		"--runner": [String],
		"--skip": Boolean,
		// Aliases
		"-r": "--runner",
	});

	const runnerFilters = args["--runner"]?.map((r) => r.toLowerCase());

	const filteredRunners =
		args["--runner"] === undefined
			? runners
			: runners.filter((r) => runnerFilters?.includes(r.name.toLowerCase()));

	if (filteredRunners.length === 0) {
		throw new Error(
			"There must be at least one runner for the benchmark to run",
		);
	}

	await generateCommonBenchmarks(
		filteredRunners,
		args["--bench"],
		args["--skip"] ?? false,
	);

	await run(JSON.parse(process.env.MITATA_CONFIG || "{}"));

	await Promise.all([
		prismaNativeQe.$disconnect(),
		prismaPgNapiQe.$disconnect(),
		prismaPgWasmQe.$disconnect(),
		prismaPgQc.$disconnect(),
		prismaPgQcBun.$disconnect(),
	]);
}

main();
