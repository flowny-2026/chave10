const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../../../frontend/src/pages/app/OS.jsx');
let c = fs.readFileSync(p, 'utf8');

const fixes = [
  ['n║ OS', 'nº OS'],
  ['┌ltimos', 'Últimos'],
  ['MÛs atual', 'Mês atual'],
  ['MÛs anterior', 'Mês anterior'],
  ['Mûs', 'Mês'],
  ['mûs', 'mês'],
  ['║', 'º'],
  ['┌', 'Ú'],  // Ú = Ú mas vamos usar texto simples
  ['Û', 'ê'],
  ['û', 'ê'],
  ['╔', 'É'],
  ['╚', 'ê'],
  ['╩', 'ê'],
];

let total = 0;
for (const [from, to] of fixes) {
  const count = c.split(from).length - 1;
  if (count > 0) {
    c = c.split(from).join(to);
    console.log(`  "${from}" → "${to}" (${count}x)`);
    total += count;
  }
}

// Correção específica para Últimos
c = c.split('Últimos').join('Últimos');

fs.writeFileSync(p, c, 'utf8');
console.log(`\n✅ ${total} substituições`);
