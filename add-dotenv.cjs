const fs = require('fs');
const file = 'server/index.ts';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes('dotenv/config')) {
  content = "import 'dotenv/config';\n" + content;
  fs.writeFileSync(file, content);
  console.log('Added dotenv import');
} else {
  console.log('dotenv already imported');
}
