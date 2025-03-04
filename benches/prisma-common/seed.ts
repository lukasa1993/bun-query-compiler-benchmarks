// This script was used to seed the initial database, from which we generate the migration script to consistently seed the same data.
import { PrismaClient, Prisma } from './client';
import { faker } from '@faker-js/faker';
import { setup } from './setup';
import pLimit from 'p-limit';
import { getSchemaName } from 'common';

// The sample dataset consists of 50k movies, 100k actors, 100k people, 100k users, and 500k reviews.

const N_MOVIES = 50_000;
const N_PEOPLE = 100_000;
const N_ACTOR = 100_000;
const N_USER = 100_000;
const N_REVIEWS = 500_000;

faker.seed(42);

async function seed() {
  const prisma = await setup();

  console.log('Seeding movies...');
  await seedMovies(prisma);

  console.log('Seeding people...');
  await seedPeople(prisma);

  console.log('Seeding actors...');
  await seedActors(prisma);

  console.log('Seeding users...');
  await seedUsers(prisma);

  console.log('Seeding reviews...');
  await seedReviews(prisma);

  console.log('Updating sequences...');
  await Promise.all([
    updateSequence(prisma, 'Movie'),
    updateSequence(prisma, 'Actor'),
    updateSequence(prisma, 'Person'),
    updateSequence(prisma, 'Review'),
    updateSequence(prisma, 'User'),
  ]);

  await prisma.$disconnect();
  console.log('Done!');
}

seed();

async function seedMovies(prisma: PrismaClient) {
  const movies: Prisma.MovieUncheckedCreateInput[] = [];

  for (let i = 0; i <= N_MOVIES; i++) {
    movies.push({
      id: i,
      title: faker.random.words(4),
      description: faker.random.words(30),
      year: faker.date
        .between('1950-01-01T00:00:00.000Z', '2030-01-01T00:00:00.000Z')
        .getFullYear(),
    });
  }

  await prisma.movie.createMany({
    data: movies,
  });
}

// Actors have played in 30 movies maximum.
async function seedActors(prisma: PrismaClient) {
  const tasks = [] as any;

  const limit = pLimit(3000);

  for (let i = 0; i <= N_ACTOR; i++) {
    const actor = limit(() => {
      if (i % 5000 === 0) {
        console.log(`Seeding actor: ${i}`);
      }

      return prisma.actor.create({
        data: {
          id: i,
          name: faker.name.fullName(),
          person_id: faker.datatype.number({ min: 1, max: N_PEOPLE }),
          movies: connectMovies(faker.datatype.number({ min: 10, max: 30 })),
        },
      });
    });

    tasks.push(actor);
  }

  await Promise.all(tasks);
}

function connectMovies(n: number) {
  const movies: Prisma.MovieWhereUniqueInput[] = [];

  for (let i = 0; i <= n; i++) {
    movies.push({ id: faker.datatype.number({ min: 1, max: N_MOVIES }) });
  }

  return { connect: movies };
}

async function seedPeople(prisma: PrismaClient) {
  const people: Prisma.PersonUncheckedCreateInput[] = [];

  for (let i = 0; i <= N_PEOPLE; i++) {
    people.push({
      id: i,
      first_name: faker.name.firstName(),
      last_name: faker.name.lastName(),
    });
  }

  await prisma.person.createMany({
    data: people,
  });
}

async function seedUsers(prisma: PrismaClient) {
  const users: Prisma.UserUncheckedCreateInput[] = [];

  for (let i = 0; i <= N_USER; i++) {
    users.push({
      id: i,
      name: faker.internet.userName(),
    });
  }

  await prisma.user.createMany({
    data: users,
  });
}

async function seedReviews(prisma: PrismaClient) {
  const reviews: Prisma.ReviewUncheckedCreateInput[] = [];

  for (let i = 0; i <= N_REVIEWS; i++) {
    reviews.push({
      id: i,
      body: faker.random.words(30),
      rating: faker.datatype.number({ min: 1, max: 10 }),
      author_id: faker.datatype.number({ max: N_USER }),
      movie_id: faker.datatype.number({ max: N_MOVIES }),
    });
  }

  await prisma.review.createMany({
    data: reviews,
  });
}

// We need to manually update the sequences because we haven't used them to generate the records.
async function updateSequence(prisma: PrismaClient, model: Prisma.ModelName) {
  const schemaName = getSchemaName();
  const sequenceName = schemaName
    ? `${getSchemaName()}."${model}_id_seq"`
    : `${model}_id_seq`;

  await prisma.$executeRawUnsafe(
    `SELECT setval('${sequenceName}', (SELECT MAX(id) FROM "${model}"));`
  ).catch(console.error);
}
