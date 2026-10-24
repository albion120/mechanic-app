import fs from 'node:fs';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
const traverse = traverseModule.default;
const files = ['src/App.jsx','src/api.js', ...fs.readdirSync('src/pages').filter(x => x.endsWith('.jsx') && !x.includes('.test.')).map(x => 'src/pages/' + x)];
const strings = new Set();
const normalize = s => s.replace(/\s+/g, ' ').trim();
const dictionary = JSON.parse(fs.readFileSync('src/locales/translations.json', 'utf8'));
const apply = process.argv.includes('--apply');
for (const file of files) {
  let source = fs.readFileSync(file, 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const edits = [];
  traverse(ast, {
    JSXText(path) {
      const key = normalize(path.node.value);
      if (!/[A-Za-zëËçÇ]/.test(key) || ['Mechanic', 'App', 'MechanicApp', 'M'].includes(key)) return;
      strings.add(key);
      if (apply && dictionary[key]) edits.push([path.node.start, path.node.end, `{t(${JSON.stringify(key)})}`]);
    },
    StringLiteral(path) {
      const key = path.node.value;
      if (["Pending", "InProgress", "Completed", "Cancelled"].includes(key)) return;
      if (path.parent.type === 'ImportDeclaration') return;
      if (path.parent.type === 'JSXAttribute' && !['placeholder','aria-label','title','alt'].includes(path.parent.name.name)) return;
      if (path.parent.type === 'CallExpression' && path.parent.callee.name === 't') { strings.add(key); return; }
      if (dictionary[key] || /[ëËçÇ]/.test(key) || (/^[A-Z][a-z]/.test(key) && /\s/.test(key) && !key.includes('Could not read'))) {
        strings.add(key);
        if (apply && dictionary[key] && path.getFunctionParent()) {
          let expr = `t(${JSON.stringify(key)})`;
          if (path.parent.type === 'JSXAttribute') expr = `{${expr}}`;
          edits.push([path.node.start, path.node.end, expr]);
        }
      }
    }
  });
  if (apply && edits.length) {
    for (const [a,b,text] of edits.sort((a,b) => b[0]-a[0])) source = source.slice(0,a) + text + source.slice(b);
    if (!source.match(/import \{[^}]*\bt\b[^}]*\} from ["']\.\.?\/i18n/)) source = `import { t } from "${file.includes('/pages/') ? '../' : './'}i18n";\n` + source;
    fs.writeFileSync(file, source);
  }
}
fs.writeFileSync('scripts/ui-strings.json', JSON.stringify([...strings].sort(), null, 2));
console.log(`${strings.size} strings; ${apply ? 'resources applied' : 'inventory only'}`);
