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
  let alterado = false;
  
  // Corrige o sendMail adicionando encoding explícito
  const antigo = `        await transporter.sendMail({
          from: \`"\${contaAtual.sender_name}" <\${contaAtual.sender_email || contaAtual.email}>\`,
          to: item.recipient_email,
          subject: item.subject,
          html: htmlFinal,
        })`;
  
  const novo = `        await transporter.sendMail({
          from: {
            name: (contaAtual.sender_name || 'Equipe').replace(/[^\\x00-\\x7F]/g, ''),
            address: contaAtual.sender_email || contaAtual.email,
          },
          to: item.recipient_email,
          subject: item.subject,
          html: htmlFinal,
          encoding: 'utf-8',
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
          },
        })`;
  
  if (c.includes(antigo)) {
    c = c.replace(antigo, novo);
    alterado = true;
    console.log('ok:', arq, '(sendMail encoding corrigido)');
  } else {
    console.log('aviso:', arq, '(bloco sendMail nao encontrado - tentando variacao)');
    
    // Tenta variacao sem o sender_email fallback
    const antigo2 = `        await transporter.sendMail({
          from: \`"\${contaAtual.sender_name}" <\${contaAtual.email}>\`,
          to: item.recipient_email,
          subject: item.subject,
          html: htmlFinal,
        })`;
    
    if (c.includes(antigo2)) {
      c = c.replace(antigo2, novo);
      alterado = true;
      console.log('ok:', arq, '(sendMail encoding corrigido - v2)');
    }
  }
  
  if (alterado) {
    fs.writeFileSync(arq, c, 'utf-8');
  }
}

console.log('\nPronto!');
