import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.config.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", geminiModel: "gemini-3-flash-preview" },
    update: { geminiModel: "gemini-3-flash-preview" },
  });
  console.log("Seeded singleton Config (edit it in Settings or via PUT /api/config).");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
