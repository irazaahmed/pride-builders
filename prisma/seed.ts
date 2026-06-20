import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateFlats, type FlatComposition } from "@/lib/flat-generator";

async function main() {
  const password = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@dummypride.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@dummypride.com",
      password,
      role: "ADMIN",
    },
  });

  const customers = [
    { name: "Ali Raza", email: "ali@example.com", phone: "0300-1234567" },
    { name: "Sana Khan", email: "sana@example.com", phone: "0301-2345678" },
    { name: "Bilal Ahmed", email: "bilal@example.com", phone: "0302-3456789" },
  ];

  for (const customer of customers) {
    await prisma.user.upsert({
      where: { email: customer.email },
      update: {},
      create: { ...customer, password, role: "CUSTOMER" },
    });
  }

  console.log("Seeded admin + sample customers.");

  const existingDummyPride = await prisma.project.findFirst({
    where: { name: "Dummy Pride" },
  });

  if (existingDummyPride) {
    console.log("Dummy Pride project already exists, skipping flat seeding.");
  } else {
    const dummyPride = await prisma.project.create({
      data: { name: "Dummy Pride", totalFloors: 6 },
    });

    const composition: FlatComposition[] = [
      { type: "TWO_BED_DD", count: 3, basePrice: 5000000 },
      { type: "TWO_BED_LAUNCH", count: 3, basePrice: 4000000 },
      { type: "ONE_BED_LAUNCH", count: 4, basePrice: 3000000 },
    ];

    const flats = generateFlats(dummyPride.totalFloors, composition);

    await prisma.flat.createMany({
      data: flats.map((flat) => ({ ...flat, projectId: dummyPride.id })),
    });

    console.log(`Seeded Dummy Pride project with ${flats.length} flats.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
