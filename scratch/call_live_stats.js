const jwt = require('jsonwebtoken');

const payload = {
  sub: 1,
  username: 'admin',
  role: 'ADMIN'
};
const token = jwt.sign(payload, 'aminov', { expiresIn: '1h' });

async function testAPI(label, url) {
  console.log(`\n=== ${label} ===`);
  console.log('Calling API:', url);
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    console.error('API Error:', response.status, response.statusText);
    return;
  }
  const data = await response.json();
  if (url.includes('user-report')) {
    console.log('User Report Stats:', JSON.stringify(data.stats, null, 2));
  } else {
    console.log('Top Employees:', JSON.stringify(data.topEmployees, null, 2));
  }
}

async function main() {
  await testAPI('Statistics: 2025-01-01 to 2026-01-01', 'https://alikafecrmm.uz/statistics?startDate=2025-01-01&endDate=2026-01-01');
  await testAPI('User Report: 2025-01-01 to 2026-01-01', 'https://alikafecrmm.uz/transactions/user-report/7?startDate=2025-01-01&endDate=2026-01-01');
}

main().catch(console.error);
