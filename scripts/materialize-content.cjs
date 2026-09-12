const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const target = path.join(root, 'generated/content.json');
const candidates = [
  path.join(root, 'content-pack/content.json.gz'),
  path.join(root, 'generated/content.json.gz')
];
const archive = candidates.find(fs.existsSync);
if (!archive) {
  console.log('SQLD Pass content pack is not materialized yet; keeping safe placeholder.');
  process.exit(0);
}
const decoded = zlib.gunzipSync(fs.readFileSync(archive));
const parsed = JSON.parse(decoded.toString('utf8'));
if (parsed?.manifest?.counts?.lessons !== 60 || parsed?.manifest?.counts?.examQuestions !== 1000) {
  throw new Error('Unexpected SQLD Pass content pack. Refusing to replace generated/content.json.');
}
fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, decoded);
console.log(`Materialized SQLD Pass content: ${decoded.length} bytes`);
