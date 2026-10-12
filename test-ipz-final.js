const nodemailer = require('nodemailer');

// ⚠️ SUBSTITUA a senha pela que você vê no vitrine (9 caracteres)
const CONFIG = {
  host: 'smtp1.s.ipzmarketing.com',
  port: 587,
  secure: false,
  user: 'qxxwkbvebgkvd',
  pass: 'COLE_A_SENHA_DO_VITRINE_AQUI',  // 9 caracteres
  from: 'suporte@marketingdigitaltop.com.br'  // ← use este
};

async function testar() {
  console.log('🔍 Testando SMTP com config do vitrine...\n');
  console.log('Host:', CONFIG.host);
  console.log('Porta:', CONFIG.port);
  console.log('Usuário:', CONFIG.user);
  console.log('Remetente:', CONFIG.from);
  console.log('Senha tem', CONFIG.pass.length, 'caracteres\n');

  const transporter = nodemailer.createTransport({
    host: CONFIG.host,
    port: CONFIG.port,
    secure: CONFIG.secure,
    auth: { user: CONFIG.user, pass: CONFIG.pass },
    tls: { rejectUnauthorized: false },
    logger: true,   // ← mostra o diálogo SMTP
    debug: true,
  });

  try {
    console.log('Verificando conexão...');
    await transporter.verify();
    console.log('\n✅✅✅ CONEXÃO OK!');

    const info = await transporter.sendMail({
      from: `"Teste" <${CONFIG.from}>`,
      to: CONFIG.from,
      subject: 'Teste SMTP ipz',
      text: 'Se você recebeu isso, está funcionando!',
    });
    console.log('✅ E-mail enviado! ID:', info.messageId);
  } catch (err) {
    console.error('\n❌ ERRO:', err.message);
    console.error('Code:', err.code);
    console.error('Response:', err.response);
  }
}

testar();
