import fs from 'node:fs';
const entries = fs.readFileSync('scripts/translations.tsv', 'utf8').trim().split(/\r?\n/).map(line => {
  const [sq, en, de] = line.split('|');
  if (!sq || !en || !de) throw new Error(`Incomplete translation: ${line}`);
  return [sq, { sq, en, de }];
});
fs.writeFileSync('src/locales/translations.json', JSON.stringify(Object.fromEntries(entries), null, 2) + '\n');
