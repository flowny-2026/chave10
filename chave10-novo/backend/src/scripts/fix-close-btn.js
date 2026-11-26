const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../../../frontend/src/pages/app/OS.jsx');
let c = fs.readFileSync(p, 'utf8');
// Substitui ">?<" após modal-close por ">✕<"
const before = (c.split('modal-close').length - 1);
c = c.split('>?</button>').join('>✕</button>');
fs.writeFileSync(p, c, 'utf8');
console.log('Feito —', before, 'botões processados');
