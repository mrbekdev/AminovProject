const fs = require('fs');
const path = require('path');

const targetFile = '/Users/ismadbek/Desktop/aminov/src/pages/AdminPanel/pages/Statistika.jsx';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add table header using regex
const headerRegex = /<tr className="bg-gray-50 border-b border-gray-100">\s*<th[^>]*>Мижоз<\/th>\s*<th[^>]*>Буюртмалар<\/th>\s*<th[^>]*>Хариди миқдори<\/th>\s*<\/tr>/;

if (headerRegex.test(content)) {
  content = content.replace(headerRegex, `<tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Мижоз</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Буюртмалар</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Хариди миқдори</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Соф фойда</th>
                </tr>`);
  console.log('Successfully replaced table header.');
} else {
  console.log('Target header not found via regex!');
}

// 2. Add table cell using regex
const cellRegex = /<td[^>]*>\s*\{cust\.totalSpent\.toLocaleString\(\)\}\s*so'm\s*<\/td>\s*<\/tr>/;

if (cellRegex.test(content)) {
  content = content.replace(cellRegex, `<td className="px-6 py-4 text-base font-black text-gray-950 text-right">
                        {cust.totalSpent.toLocaleString()} so'm
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">
                        {cust.netProfit.toLocaleString()} so'm
                      </td>
                    </tr>`);
  console.log('Successfully replaced table cell.');
} else {
  console.log('Target cell not found via regex!');
}

// 3. Update empty state colSpan (if not already done)
const targetColSpan = /colSpan=\{3\}/;
if (content.includes('colSpan={3}') && content.includes('Мижозлар статистикаси топилмади')) {
  content = content.replace('colSpan={3}', 'colSpan={4}');
  console.log('Successfully replaced empty state colSpan.');
} else {
  console.log('Target colSpan already modified or not found.');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Done.');
