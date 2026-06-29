const http = require('http');
const jwt = require('jsonwebtoken');

// Generate a valid JWT token
const token = jwt.sign({ userId: 1, username: 'bekbek', role: 'ADMIN' }, 'aminov');
console.log('Using JWT Token:', token);

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`Status Code: ${res.statusCode}, Body: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function main() {
  try {
    const users = await makeRequest('/users');
    const marketingUsers = users.filter(u => u.role === 'MARKETING');
    const marketingUserIds = marketingUsers.map(u => u.id);
    console.log('Marketing User IDs:', marketingUserIds);

    const filters = {
      startDate: '2025-01-16',
      endDate: '2026-06-16'
    };

    const txParams = new URLSearchParams();
    txParams.append("startDate", new Date(`${filters.startDate}T00:00:00`).toISOString());
    txParams.append("endDate", new Date(`${filters.endDate}T23:59:59`).toISOString());
    txParams.append("userId", marketingUserIds.join(','));

    // Try fetching bonuses
    const bonusesUrl = `/bonuses?${txParams.toString()}`;
    console.log('Fetching bonuses from:', bonusesUrl);
    const bonuses = await makeRequest(bonusesUrl).catch(e => {
      console.error('Bonuses fetch failed:', e.message);
      return [];
    });

    console.log('Number of bonuses returned from API:', Array.isArray(bonuses) ? bonuses.length : typeof bonuses);

    if (Array.isArray(bonuses)) {
      const filteredBonuses = bonuses.filter(bonus => {
        const bonusDate = new Date(bonus.createdAt || bonus.date).toISOString().split('T')[0];
        const isInDateRange =
          (!filters.startDate || bonusDate >= filters.startDate) &&
          (!filters.endDate || bonusDate <= filters.endDate);
        const isUser = bonus.userId && marketingUserIds.includes(bonus.userId);
        const isSales = bonus.reason === 'SALES_BONUS';
        const hasDesc = !!bonus.description;

        return isInDateRange && isUser && isSales && hasDesc;
      });

      console.log('Number of filtered bonuses:', filteredBonuses.length);
      const marketingTotalSofOrtiqcha = filteredBonuses.reduce((sum, bonus) => {
        const match = bonus.description.match(/Sof ortiqcha:\s*([\d,]+)/);
        return match ? sum + parseInt(match[1].replace(/,/g, '')) : sum;
      }, 0);
      console.log('Simulated marketingTotalSofOrtiqcha:', marketingTotalSofOrtiqcha);
    }
  } catch (err) {
    console.error('Request failed:', err);
  }
}

main();
