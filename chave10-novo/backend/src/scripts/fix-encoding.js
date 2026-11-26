/**
 * fix-encoding.js
 * Corrige caracteres corrompidos (Latin-1 mal lido como UTF-8) no OS.jsx
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../../frontend/src/pages/app/OS.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // Padrões mais comuns de corrupção Latin-1 → UTF-8
  ['ÒuÝ', ''],  // sequências inválidas
  ['impressÒo', 'impressão'],
  ['DescriþÒo', 'Descrição'],
  ['Serviþos realizados', 'Serviços realizados'],
  ['Serviþo / MÒo de obra', 'Serviço / Mão de obra'],
  ['MÒo de obra', 'Mão de obra'],
  ['mÒo de obra', 'mão de obra'],
  ['Observaþ§es', 'Observações'],
  ['Formulßrio', 'Formulário'],
  ['especÝfica', 'específica'],
  ['þo', 'ço'],
  ['Þo', 'ão'],
  ['§o', 'ão'],
  ['ÒuÝ', ''],
  ['Endereþo', 'Endereço'],
  ['Serviþ', 'Serviç'],
  ['serviþ', 'serviç'],
  [' ù ', ' — '],
  ["'ù'", "'—'"],
  ['DescriþÒo', 'Descrição'],
  ['descriþ', 'descriç'],
  ['Descriþ', 'Descriç'],
  ['configuraþ', 'configuraç'],
  ['Configuraþ', 'Configuraç'],
  ['informa§', 'informaç'],
  ['Informa§', 'Informaç'],
  ['opþ', 'opç'],
  ['cria§', 'criaç'],
  ['atualiza§', 'atualizaç'],
  ['valida§', 'validaç'],
  ['execu§', 'execuç'],
  ['fun§', 'funç'],
  ['ó', 'ó'],
  ['ú obrigat', 'é obrigat'],
  ['Ú obrigat', 'é obrigat'],
  ['obrigat¾rio', 'obrigatório'],
  ['obrigat³rio', 'obrigatório'],
  ['Mec×nico', 'Mecânico'],
  ['mec×nico', 'mecânico'],
  ['Mecnico', 'Mecânico'],
  ['veÝculo', 'veículo'],
  ['VeÝculo', 'Veículo'],
  ['þ§es', 'ções'],
  ['§es', 'ções'],
  ['Òo', 'ão'],
  ['§o', 'ão'],
  ['¾', 'ó'],
  ['Ý', 'í'],
  ['ß', 'á'],
  ['þ', 'ç'],
  ['Þ', 'é'],
  ['Ú', 'é'],
  ['ò', '•'],
  ['ù', '—'],
  ['×', 'â'],
];

let changed = 0;
for (const [from, to] of replacements) {
  const before = content;
  content = content.split(from).join(to);
  if (content !== before) {
    const count = (before.split(from).length - 1);
    console.log(`  "${from}" → "${to}" (${count}x)`);
    changed += count;
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ ${changed} substituições feitas`);
