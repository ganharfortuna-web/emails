const nodemailer = require('nodemailer');

// ⚠️ SUBSTITUA com os dados da ipzmarketing
const CONFIG = {
  host: 'smtp1.s.ipzmarketing.com',
  porta: 587,       // ⚠️ Tente 587 e depois 465
  usuario: 'qxxwkbvebgkvd',
  senha: 'COLE_A_SENHA_AQUI',
  remetente: 'josevalderi@marketingdigitaltop.com.br'
};

async function testar() {
  console.log('🔍 Testando SMTP:', CONFIG.host);
  console.log('   Porta:', CONFIG.porta);
  console.log('   Usuário:', CONFIG.usuario);

  const transporter = nodemailer.createTransport({
    host: CONFIG.host,
    port: CONFIG.porta,
    secure: CONFIG.porta === 465,  // true para 465, false para 587
    auth: {
      user: CONFIG.usuario,
      pass: CONFIG.senha,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    logger: true,
    debug: true,
  });

  try {
    await transporter.verify();
    console.log('\n✅ CONEXÃO OK! SMTP autenticado com sucesso.');
    
    // Tenta enviar
    const info = await transporter.sendMail({
      from: CONFIG.remetente,
      to: CONFIG.remetente,
      subject: 'Teste SMTP',
      text: 'Se você recebeu isso, o SMTP funciona!',
    });
    console.log('✅ E-mail enviado! ID:', info.messageId);
  } catch (err) {
    console.error('\n❌ ERRO:', err.message);
    console.error('   Code:', err.code);
    console.error('   Response:', err.response);
  }
}

testar();
