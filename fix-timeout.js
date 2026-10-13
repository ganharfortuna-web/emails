const fs = require('fs');
const arq = 'app/api/cron/send-emails-v3/route.ts';

let c = fs.readFileSync(arq, 'utf-8');

// Reduz batch de 8 para 5
c = c.replace('.slice(0, 8)', '.slice(0, 5)');

// Reduz delay de 1s para 200ms
c = c.replace(
  'await new Promise(r => setTimeout(r, 1000))',
  'await new Promise(r => setTimeout(r, 200))'
);

// Adiciona timeout explícito no transporter
c = c.replace(
  'socketTimeout: 20000,',
  'socketTimeout: 8000,'
);

fs.writeFileSync(arq, c);
console.log('ok: batch reduzido para 5, delay 200ms, socket 8s');
