const fs = require('fs');

const targetFile = '/Users/ismadbek/Desktop/aminov/src/pages/AdminPanel/pages/Statistika.jsx';
let content = fs.readFileSync(targetFile, 'utf8');

const targetString = 'colSpan={3} className="px-6 py-8 text-center text-gray-400 text-sm"';
const replacementString = 'colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm"';

if (content.includes(targetString)) {
  content = content.replace(targetString, replacementString);
  console.log('Successfully replaced colSpan.');
} else {
  console.log('Target colSpan string not found!');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Done.');
