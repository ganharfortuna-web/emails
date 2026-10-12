const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp1.s.ipzmarketing.com',
  port: 587,
  secure: false,
  auth: { user: 'qxwkbvebgkvd', pass: 'P39EwWfGNC8' },
  tls: { rejectUnauthorized: false },
  logger: true,
  debug: true,
});

(async () => {
  console.log('Enviando para 2 destinatarios diferentes...\n');

  try {
    const info = await transporter.sendMail({
      from: '"Equipe" <suporte@marketingdigitaltop.com.br>',
      to: 'josevg10@gmail.com, ganharfortuna@gmail.com',
      subject: 'Teste entrega - ' + new Date().toLocaleTimeString('pt-BR'),
      html: '<p>Se você recebeu este e-mail, o SMTP está OK.</p>',
    });

    console.log('\n📧 RESPOSTA DO IPZ:');
    console.log('   messageId:', info.messageId);
    console.log('   accepted:', info.accepted);
    console.log('   rejected:', info.rejected);
    console.log('   pending:', info.pending);
    console.log('   response:', info.response);
  } catch (e) {
    console.error('❌ ERRO:', e.message);
  }

  process.exit(0);
})();
