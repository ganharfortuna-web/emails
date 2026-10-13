const fs = require('fs');
const arq = 'app/api/cron/send-emails-v3/route.ts';

let c = fs.readFileSync(arq, 'utf-8');
let alterou = false;

// 1. Batch de 8 → 5
if (c.includes('.slice(0, 8)')) {
  c = c.replace('.slice(0, 8)', '.slice(0, 5)');
  alterou = true;
  console.log('ok: batch 8 -> 5');
}

// 2. Delay de 1s → 0ms (remove)
if (c.includes('await new Promise(r => setTimeout(r, 1000))')) {
  c = c.replace(
    'await new Promise(r => setTimeout(r, 1000))',
    'await new Promise(r => setTimeout(r, 0))'
  );
  alterou = true;
  console.log('ok: delay 1000ms -> 0ms');
} else if (c.includes('await new Promise(r => setTimeout(r, 200))')) {
  c = c.replace(
    'await new Promise(r => setTimeout(r, 200))',
    'await new Promise(r => setTimeout(r, 0))'
  );
  alterou = true;
  console.log('ok: delay 200ms -> 0ms');
}

// 3. Socket timeout 20s → 6s
if (c.includes('socketTimeout: 20000,')) {
  c = c.replace('socketTimeout: 20000,', 'socketTimeout: 6000,');
  alterou = true;
  console.log('ok: socket 20000ms -> 6000ms');
}

if (alterou) {
  fs.writeFileSync(arq, c);
  console.log('\n✅ Arquivo atualizado');
} else {
  console.log('⚠️ Nada foi alterado - bloco não encontrado');
}
