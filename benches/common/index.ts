import { group, bench } from 'mitata';
import * as dotenv from 'dotenv';
import uniqBy from 'lodash.uniqby';

export const BENCHES_NAMES = {
  // trivial
  FIND_MANY_ALL: 'movies.findMany() (all - 25000)',
  FIND_MANY_ALL_LIMIT: 'movies.findMany({ take: 2000 })',
  FIND_MANY_ALL_LIMIT_FILTER: 'movies.findMany({ where: {...}, take: 2000 })',
  FIND_MANY_FIFTY_MOST_RECENT_MOVIE_TITLE_ASC:
    'movies.findMany(orderBy: [{ year: "desc" }, { title: "asc" }], take: 50)',
  UPDATE_ONE_MOVIE: 'prisma.movie.update(...)',
  // complex
  FIND_MANY_M2M_CAST_LIMIT:
    'movies.findMany({ include: { cast: true } take: 2000 }) (m2m)',
  FIND_MANY_M2M_CAST_LIMIT_FILTER:
    'movies.findMany({ where: {...}, include: { cast: true } take: 2000 }) (m2m)',
  FIND_MANY_M2M_CAST_AND_TO_ONE_PERSON_LIMIT_FILTER:
    'prisma.movie.findMany({ where: { ... }, take: 2000, include: { cast: { include: { person: true } } } })',
  FIND_MANY_MOVIE_WHERE_REVIEWS_AUTHOR:
    'prisma.movie.findMany({ where: { reviews: { author: { ... } }, take: 100 }) (to-many -> to-one)',
  FIND_MANY_MOVIE_WHERE_CAST_PERSON:
    'prisma.movie.findMany({ where: { cast: { person: { ... } }, take: 100 }) (m2m -> to-one)',
  FIND_MANY_REVIEW_WHERE_AUTHOR:
    'prisma.review.findMany({ where: { author: { ... } }, take: 100 }) (to-one)',
  FIND_MANY_ACTOR_WHERE_MOVIES_REVIEWS_AUTHOR:
    'prisma.actor.findMany({ where: { movies: { some: { reviews: { some: { author: { ... } } } } } }, take: 20 } (to-many -> to-many -> to-one)',
  FIND_UNIQUE_ONE2M_LIMIT:
    'prisma.movie.findUnique({ where: { ... }, include: { reviews: { take: 3, } } })',
  FIND_UNIQUE_M2M_CAST_LIMIT:
    'prisma.movie.findUnique({ where: { ... }, include: { cast: { take: 3, } } })',
  ACTOR_DETAILS:
    'Actor with 25 most recent movies order by title ASC, including 15 actors of each movies',
} as const;

type BenchNames = (typeof BENCHES_NAMES)[keyof typeof BENCHES_NAMES];
type InternalBench<T, U extends keyof any> = Record<
  U,
  (client: T) => Promise<BenchResult>
>;

export type BenchResult = { data: Array<unknown> };
export type Bench<T> = Partial<InternalBench<T, BenchNames>>;
export type Runner<T> = { name: string; benchRunner: Bench<T>; client: T };

// Generate a benchmark for a single ORM.
export function generateBenchmark<T>(runner: Runner<T>) {
  const { benchRunner, client } = runner;

  Object.entries(benchRunner).forEach(([benchName, benchFn]) => {
    bench(benchName, async () => benchFn(client));
  });
}

// Generate a benchmark of the form:
// group("<benchmark_name>", () => {
//   bench("<driver_name>", () => {...})
//   bench("<driver_name_2>", () => {...})
// })
export async function generateCommonBenchmarks(
  runners: Runner<any>[],
  benchIds: string[] | undefined,
  skipValidation: boolean
) {
  const benches =
    benchIds === undefined
      ? Object.values(BENCHES_NAMES)
      : Object.entries(BENCHES_NAMES)
          .filter(([benchId, _]) => benchIds.includes(benchId))
          .map(([_, val]) => val);

  if (!skipValidation) {
    await validateCommonBenches(runners);
  }

  benches.forEach((benchName) => {
    group(benchName, () => {
      runBenchmarkForRunners(benchName, runners);
    });
  });
}

type ValidationResult = { runnerName: string } & BenchResult;

function runBenchmarkForRunners(benchName: string, runners: Runner<any>[]) {
  runners.forEach((runner) => {
    const benchRunner = Object.entries(runner.benchRunner).find(
      ([name, _]) => name == benchName
    )?.[1];

    if (benchRunner) {
      bench(runner.name, async () => benchRunner(runner.client));
    }
  });
}

// Ensure benchmarks results are comparable to each others, mostly by checking the rows length.
async function validateCommonBenches(runners: Runner<any>[]) {
  console.log('Validating benchmarks...');

  const results = {} as Record<string, ValidationResult[]>;

  // Run trivial benchmarks
  for (let runner of runners) {
    for (let [name, fn] of Object.entries(runner.benchRunner)) {
      if (!results[name]) {
        results[name] = [];
      }
      try {
        results[name].push({
          runnerName: runner.name,
          data: (await fn(runner.client)).data,
        });
      } catch (e) {
        throw new Error(`Benchmark "${name} failed for ${runner.name}: ${e}"`);
      }
    }
  }

  // Ensure results are comparable to each others
  Object.entries(results).forEach(([benchName, results]) => {
    const invalidBenchmark = findInvalidBenchmark(results);

    if (invalidBenchmark) {
      console.log(
        `Benchmark result lengths: ${JSON.stringify(
          sampleBenchmarkResults(results),
          null,
          2
        )}`
      );

      throw new Error(
        `Benchmark ${findBenchId(
          benchName
        )} is not comparing the same data for all providers.`
      );
    }
  });
}

function findBenchId(benchName: string): string {
  return Object.entries(BENCHES_NAMES).find(([_, v]) => v == benchName)?.[0]!;
}

function findInvalidBenchmark(
  results: ValidationResult[]
): ValidationResult | undefined {
  const length = uniqBy(results[0].data, (row: any) => row.id).length;

  return results.find(
    (result) => uniqBy(result.data, (row: any) => row.id).length !== length
  );
}

function sampleBenchmarkResults(
  results: ValidationResult[]
): Record<string, unknown> {
  const samples = {} as Record<string, unknown>;

  for (const result of results) {
    samples[result.runnerName] = uniqBy(
      result.data,
      (row: any) => row.id
    ).length;
  }

  return samples;
}

export function getDatabaseUrl(): string {
  dotenv.config();

  if (!process.env.DATABASE_URL) {
    throw new Error('No database url set.');
  }

  return process.env.DATABASE_URL;
}

export function getSchemaName(): string | null {
  const dbUrl = getDatabaseUrl();
  const schema = new URL(dbUrl).searchParams.get('schema');

  return schema;
}
