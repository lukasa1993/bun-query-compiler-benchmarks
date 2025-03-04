import { faker } from '@faker-js/faker';
import { Bench, BenchResult, BENCHES_NAMES } from '../common';
import { PrismaClient } from './client';

async function findManyAll(prisma: PrismaClient): Promise<BenchResult> {
  const res = await prisma.movie.findMany();

  return { data: res };
}

async function findManyAllLimit(prisma: PrismaClient): Promise<BenchResult> {
  const res = await prisma.movie.findMany({
    take: 2000,
  });

  return { data: res };
}

async function findManyAllLimitFilter(
  prisma: PrismaClient
): Promise<BenchResult> {
  const res = await prisma.movie.findMany({
    where: {
      title: { contains: 'cyan' },
    },
    take: 2000,
  });

  return { data: res };
}

export async function findManyFiftyMostRecentMovieTitleAsc(
  prisma: PrismaClient
): Promise<BenchResult> {
  const res = await prisma.movie.findMany({
    orderBy: [{ year: 'desc' }, { title: 'asc' }],
    take: 50,
  });

  return { data: res };
}

async function findManyM2MCastLimit(
  prisma: PrismaClient
): Promise<BenchResult> {
  const res = await prisma.movie.findMany({
    take: 2000,
    include: {
      cast: true,
    },
  });

  return { data: res };
}

export async function findManyM2MCastLimitFilter(
  prisma: PrismaClient
): Promise<BenchResult> {
  const res = await prisma.movie.findMany({
    where: { title: { contains: 'cyan' } },
    take: 2000,
    include: {
      cast: true,
    },
  });

  return { data: res };
}

export async function findManyM2MCastAndToOnePersonLimitFilter(
  prisma: PrismaClient
): Promise<BenchResult> {
  const res = await prisma.movie.findMany({
    where: { title: { contains: 'cyan' } },
    take: 2000,
    include: {
      cast: {
        include: {
          person: true,
        },
      },
    },
  });

  return { data: res };
}

export async function findManyMoviesWhereReviewsAuthor(
  prisma: PrismaClient
): Promise<BenchResult> {
  const res = await prisma.movie.findMany({
    where: {
      reviews: {
        some: {
          author: {
            OR: [{ name: { gt: 'a' } }, { name: { lt: 'f' } }],
          },
        },
      },
    },
    take: 100,
  });

  return { data: res };
}

export async function findManyReviewsWhereAuthor(
  prisma: PrismaClient
): Promise<BenchResult> {
  const res = await prisma.review.findMany({
    where: {
      OR: [
        { author: { name: { gt: 'a' } } },
        { author: { name: { lt: 'f' } } },
      ],
    },
    take: 100,
  });

  return { data: res };
}

export async function findManyMoviesWhereCastPerson(
  prisma: PrismaClient
): Promise<BenchResult> {
  const res = await prisma.movie.findMany({
    where: {
      cast: {
        some: {
          person: {
            OR: [
              {
                last_name: { gt: 'a' },
              },
              {
                last_name: { lt: 'f' },
              },
            ],
          },
        },
      },
    },
    take: 100,
  });

  return { data: res };
}

export async function findManyActorWhereMoviesReviewsAuthor(
  prisma: PrismaClient
): Promise<BenchResult> {
  const res = await prisma.actor.findMany({
    where: {
      movies: {
        some: {
          reviews: {
            some: {
              author: {
                OR: [{ name: { gt: 'a' } }, { name: { lt: 'f' } }],
              },
            },
          },
        },
      },
    },
    take: 20,
  });

  return { data: res };
}

export async function findUniqueOne2MLimit(
  prisma: PrismaClient
): Promise<BenchResult> {
  const res = await prisma.movie.findUnique({
    where: { id: 1273 },
    include: {
      reviews: {
        take: 3,
      },
    },
  });

  return { data: [res] };
}

export async function findUniqueM2MCastLimit(
  prisma: PrismaClient
): Promise<BenchResult> {
  const res = await prisma.movie.findUnique({
    where: { id: 22651 },
    include: {
      cast: {
        take: 3,
      },
    },
  });

  return { data: [res] };
}

// Actor with 25 most recent movies order by title ASC, including 15 actors of each movies
export async function actorDetails(prisma: PrismaClient): Promise<BenchResult> {
  const res = await prisma.actor.findUnique({
    where: {
      id: 1513, // played in 30 movies
    },
    include: {
      movies: {
        include: {
          cast: {
            take: 15,
            orderBy: { name: 'asc' },
            include: { person: true },
          },
        },
        take: 25,
        orderBy: { year: 'desc' },
      },
      person: true,
    },
  });

  return { data: [res] };
}

export async function updateOneMovie(
  prisma: PrismaClient
): Promise<BenchResult> {
  const res = await prisma.movie.update({
    where: { id: 50 },
    data: {
      year: faker.date
        .between('1950-01-01T00:00:00.000Z', '2030-01-01T00:00:00.000Z')
        .getFullYear(),
      title: faker.random.words(4),
      description: faker.random.words(30),
    },
  });

  return { data: [res] };
}

// TODO Extract from specific bench
export const benches: Bench<PrismaClient> = {
  [BENCHES_NAMES.FIND_MANY_ALL]: findManyAll,
  [BENCHES_NAMES.FIND_MANY_ALL_LIMIT]: findManyAllLimit,
  [BENCHES_NAMES.FIND_MANY_ALL_LIMIT_FILTER]: findManyAllLimitFilter,
  [BENCHES_NAMES.FIND_MANY_FIFTY_MOST_RECENT_MOVIE_TITLE_ASC]:
    findManyFiftyMostRecentMovieTitleAsc,
  [BENCHES_NAMES.FIND_MANY_M2M_CAST_LIMIT]: findManyM2MCastLimit,
  [BENCHES_NAMES.FIND_MANY_M2M_CAST_LIMIT_FILTER]: findManyM2MCastLimitFilter,
  [BENCHES_NAMES.FIND_MANY_M2M_CAST_AND_TO_ONE_PERSON_LIMIT_FILTER]:
    findManyM2MCastAndToOnePersonLimitFilter,
  [BENCHES_NAMES.FIND_MANY_MOVIE_WHERE_REVIEWS_AUTHOR]:
    findManyMoviesWhereReviewsAuthor,
  [BENCHES_NAMES.FIND_MANY_MOVIE_WHERE_CAST_PERSON]:
    findManyMoviesWhereCastPerson,
  [BENCHES_NAMES.FIND_MANY_REVIEW_WHERE_AUTHOR]: findManyReviewsWhereAuthor,
  [BENCHES_NAMES.FIND_MANY_ACTOR_WHERE_MOVIES_REVIEWS_AUTHOR]:
    findManyActorWhereMoviesReviewsAuthor,
  [BENCHES_NAMES.FIND_UNIQUE_ONE2M_LIMIT]: findUniqueOne2MLimit,
  [BENCHES_NAMES.FIND_UNIQUE_M2M_CAST_LIMIT]: findUniqueM2MCastLimit,
  [BENCHES_NAMES.ACTOR_DETAILS]: actorDetails,
  [BENCHES_NAMES.UPDATE_ONE_MOVIE]: updateOneMovie,
};
