/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = process.env.DEFAULT_USER_EMAIL || "dev@travel.local";
    const name = process.env.DEFAULT_USER_NAME || "Traveler";

    const user =
      (await prisma.user.findUnique({ where: { email } })) ||
      (await prisma.user.create({ data: { email, name } }));

    const res = await prisma.place.updateMany({
      where: { ownerId: null },
      data: { ownerId: user.id },
    });

    console.log(`Backfilled ownerId on ${res.count} places.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

