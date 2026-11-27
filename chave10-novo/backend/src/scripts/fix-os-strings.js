/**
 * fix-os-strings.js
 * Corrige strings específicas corrompidas no OS.jsx
 * Usa split/join para evitar problemas com regex e encoding
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../../frontend/src/pages/app/OS.jsx');
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

const fixes = [
  // Seletor de período
  [`n\u2551 OS`, `nº OS`],
  [`M\u00dbs atual`, `Mês atual`],
  [`M\u00dbs anterior`, `Mês anterior`],
  [`\u250cltimos 7 dias`, `Últimos 7 dias`],
  [`\u250cltimos 30 dias`, `Últimos 30 dias`],
  [`\u250cltimos`, `Últimos`],
  [`\u00db`, `ê`],
  [`\u250c`, `Ú`],
  // Botão OS Rápida
  [`? OS R\u00e1pida`, `⚡ OS Rápida`],
  [`? OS R`, `⚡ OS R`],
  // empty state  
  [`??\n`, `📋\n`],
  // outros padrões
  [`M\u00fas`, `Mês`],
  [`m\u00fas`, `mês`],
];

let count = 0;
for (const [from, to] of fixes) {
  const n = c.split(from).length - 1;
  if (n > 0) {
    c = c.split(from).join(to);
    console.log(`  "${from}" → "${to}" (${n}x)`);
    count += n;
  }
}

if (count > 0) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log(`\n✅ ${count} correções aplicadas`);
} else {
  console.log('Nenhuma correção necessária — verificando padrões...');
  // Mostra os caracteres ao redor de "MÚ" e "n║"
  const idx1 = c.indexOf('MÚ');
  const idx2 = c.indexOf('n║');
  if (idx1 > -1) console.log('Encontrado "MÚ" em:', JSON.stringify(c.slice(idx1-5, idx1+15)));
  if (idx2 > -1) console.log('Encontrado "n║" em:', JSON.stringify(c.slice(idx2-5, idx2+15)));
  // Mostra bytes ao redor do período
  const idx = c.indexOf('tual');
  if (idx > -1) {
    const bytes = Buffer.from(c.slice(idx-10, idx+10));
    console.log('Bytes ao redor de "tual":', bytes.toString('hex'));
    console.log('Texto:', c.slice(idx-10, idx+10));
  }
}
