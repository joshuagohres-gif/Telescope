const fs = require('fs');
const envPath = '.env';
let content = fs.readFileSync(envPath, 'utf8');
content = content.replace(/^DATABASE_URL=/gm, '# DATABASE_URL=');
fs.writeFileSync(envPath, content);
console.log('Commented out DATABASE_URL');
