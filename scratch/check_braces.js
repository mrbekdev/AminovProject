const fs = require('fs');
const content = fs.readFileSync('/Users/ismadbek/Desktop/AminovProject-main/src/transaction/transaction.service.ts', 'utf8');
let stack = [];
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let char of line) {
        if (char === '{') stack.push(i + 1);
        else if (char === '}') {
            if (stack.length === 0) console.log('Extra closing brace at line ' + (i + 1));
            else stack.pop();
        }
    }
}
if (stack.length > 0) console.log('Unclosed braces starting at lines: ' + stack.join(', '));
