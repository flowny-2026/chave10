const https = require('https');
const fs = require('fs');
const path = require('path');

const data = JSON.stringify({ email: 'teste@teste.com', senha: 'demo1234' });

const req = https.request({
  hostname: 'chave10-api.onrender.com',
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
}, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    try {
      const j = JSON.parse(body);
      if (j.token) {
        const out = path.join(__dirname, '_token.txt');
        fs.writeFileSync(out, j.token);
        console.log('OK ' + out);
      } else {
        console.error('ERRO: ' + body.slice(0, 200));
      }
    } catch(e) { console.error('PARSE: ' + e.message); }
  });
});
req.on('error', e => console.error('REQ: ' + e.message));
req.write(data);
req.end();
