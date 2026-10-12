const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp1.s.ipzmarketing.com',
  port: 587,
  secure: false,
  auth: { user: 'qxwkbvebgkvd', pass: 'P39EwWfGNC8' },
  tls: { rejectUnauthorized: false },
});

const DESTINO = 'suporte@marketingdigitaltop.com.br';

async function testar(descricao, opcoes) {
  try {
    await transporter.sendMail(opcoes);
    console.log('✅ OK   :', descricao);
  } catch (e) {
    console.log('❌ FALHA:', descricao);
    console.log('        →', e.message);
  }
}

(async () => {
  // Teste 1: nome simples, assunto simples
  await testar('1. Nome simples + assunto simples', {
    from: '"Equipe" <suporte@marketingdigitaltop.com.br>',
    to: DESTINO,
    subject: 'Teste 1',
    text: 'Corpo teste 1',
  });

  // Teste 2: nome COM acento
  await testar('2. Nome COM acento (José Valderi)', {
    from: '"José Valderi" <suporte@marketingdigitaltop.com.br>',
    to: DESTINO,
    subject: 'Teste 2',
    text: 'Corpo teste 2',
  });

  // Teste 3: assunto COM acento
  await testar('3. Assunto COM acento (Olá você?)', {
    from: '"Equipe" <suporte@marketingdigitaltop.com.br>',
    to: DESTINO,
    subject: 'Olá tudo bem? Você é terapeuta?',
    text: 'Corpo teste 3',
  });

  // Teste 4: objeto from (formato alternativo)
  await testar('4. From objeto {name, address}', {
    from: { name: 'Equipe', address: 'suporte@marketingdigitaltop.com.br' },
    to: DESTINO,
    subject: 'Teste 4',
    text: 'Corpo teste 4',
  });

  // Teste 5: HTML no corpo
  await testar('5. Corpo HTML simples', {
    from: '"Equipe" <suporte@marketingdigitaltop.com.br>',
    to: DESTINO,
    subject: 'Teste 5',
    html: '<p>Corpo HTML</p>',
  });

  process.exit(0);
})();
