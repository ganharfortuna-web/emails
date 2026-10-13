const fs = require('fs');
const arq = 'app/api/cron/send-emails-v3/route.ts';

let c = fs.readFileSync(arq, 'utf-8');

// 1. REMOVE o delay de 1s entre e-mails
c = c.replace(
  /await new Promise\(r => setTimeout\(r, \d+\)\)/g,
  '// (delay removido)'
);

// 2. Volta batch para 8
c = c.replace('.slice(0, 5)', '.slice(0, 8)');

// 3. Reduz timeouts para caber no Hobby
c = c.replace('connectionTimeout: 15000', 'connectionTimeout: 5000');
c = c.replace('greetingTimeout: 15000', 'greetingTimeout: 3000');
c = c.replace('socketTimeout: 20000', 'socketTimeout: 5000');
c = c.replace('socketTimeout: 8000', 'socketTimeout: 5000');
c = c.replace('socketTimeout: 6000', 'socketTimeout: 5000');

fs.writeFileSync(arq, c);
console.log('✅ Delay removido, batch 8, timeouts reduzidos');
