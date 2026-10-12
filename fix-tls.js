const fs = require('fs');

const arquivos = [
  'app/api/cron/send-emails/route.ts',
  'app/api/disparo/processar/route.ts',
];

for (const arq of arquivos) {
  if (!fs.existsSync(arq)) {
    console.log('skip:', arq);
    continue;
  }
  
  let c = fs.readFileSync(arq, 'utf-8');
  
  if (c.includes('rejectUnauthorized')) {
    console.log('ok:', arq, '(ja tem tls)');
    continue;
  }
  
  const antigo = 'auth: { user: contaAtual.email, pass: contaAtual.app_password },';
  
  if (c.includes(antigo)) {
    const novo = `auth: { user: contaAtual.email, pass: contaAtual.app_password },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,`;
    c = c.replace(antigo, novo);
    fs.writeFileSync(arq, c, 'utf-8');
    console.log('ok:', arq, '(tls adicionado)');
  } else {
    console.log('aviso:', arq, '(bloco nao encontrado)');
  }
}
