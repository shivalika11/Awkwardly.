import { PrismaClient } from "@prisma/client";
import { guides } from "../src/data.js";

const prisma = new PrismaClient();

async function main() {
  for (const guide of guides) {
    await prisma.guide.upsert({
      where: { id: guide.id },
      create: { ...guide, variants: JSON.stringify(guide.variants) },
      update: {
        title: guide.title,
        category: guide.category,
        description: guide.description,
        say: guide.say,
        avoid: guide.avoid,
        variants: JSON.stringify(guide.variants),
        advice: guide.advice,
        scenario: guide.scenario,
      },
    });
  }
  console.log(`Seeded ${guides.length} Awkwardly survival guides.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
