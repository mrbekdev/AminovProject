// Test the live API endpoint with different date ranges
const token = process.argv[2];
if (!token) {
  console.log("Usage: node test_live_api.js <token>");
  process.exit(1);
}

async function testAPI(label, startDate, endDate) {
  let url = `http://localhost:4000/statistics?startDate=${startDate || ''}&endDate=${endDate || ''}`;
  console.log(`\n=== ${label} ===`);
  console.log(`URL: ${url}`);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });

  if (!res.ok) {
    console.log(`Error: ${res.status} ${res.statusText}`);
    return;
  }

  const data = await res.json();
  const topEmps = data.topEmployees || [];
  console.log(`topEmployees count: ${topEmps.length}`);
  for (const emp of topEmps) {
    console.log(`  ${emp.username || emp.userId}: salesVolume=${emp.salesVolume}, ordersCount=${emp.ordersCount}, kpi=${emp.kpi}, netProfit=${emp.netProfit}`);
  }
}

(async () => {
  // Test 1: Last 30 days (Statistika default)
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const s30 = d.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  await testAPI("Last 30 Days", s30, today);

  // Test 2: 2025-01-01 to 2026-01-01 (UserDetails range)
  await testAPI("2025-01-01 to 2026-01-01", "2025-01-01", "2026-01-01");

  // Test 3: All time
  await testAPI("All time (wide range)", "2020-01-01", today);
})();
