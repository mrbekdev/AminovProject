const { PrismaClient } = require('@prisma/client');
const { StatisticsService } = require('../dist/statistics/statistics.service');

const prisma = new PrismaClient();
const statsService = new StatisticsService(prisma);

async function test() {
  console.log("=== TEST 1: No Dates (All-time fallback) ===");
  const allTime = await statsService.getDashboardStats(undefined, undefined, undefined, undefined, 'price');
  console.log("Top Employees (All-time):", allTime.topEmployees);

  console.log("\n=== TEST 2: Date range 2025-09-19 to 2025-11-28 (Matches UserDetails screenshot) ===");
  const range1 = await statsService.getDashboardStats(undefined, undefined, '2025-09-19', '2025-11-28', 'price');
  console.log("Top Employees (Range 1):", range1.topEmployees);

  console.log("\n=== TEST 3: Default 30 Days (2026-05-18 to 2026-06-17) ===");
  const range2 = await statsService.getDashboardStats(undefined, undefined, '2026-05-18', '2026-06-17', 'price');
  console.log("Top Employees (Range 2):", range2.topEmployees);
}

test()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
