const nodemailer = require('nodemailer');

const CONFIG = {
  host: 'smtp1.s.ipzmarketing.com',
  port: 587,
  secure: false,
  user: 'qxwkbvebgkvd',
  pass: 'P39EwWfGNC8',
  from: 'suporte@marketingdigitaltop.com.br'
};

console.log('Usuario:', JSON.stringify(CONFIG.user));
console.log('Tamanho do usuario:', CONFIG.user.length);
console.log('Senha tem:', CONFIG.pass.length);
console.log('---');

const transporter = nodemailer.createTransport({
  host: CONFIG.host,
  port: CONFIG.port,
  secure: CONFIG.secure,
  auth: { user: CONFIG.user, pass: CONFIG.pass },
  tls: { rejectUnauthorized: false },
});

console.log('Testando...');

transporter.verify((err, ok) => {
  if (err) {
    console.log('FALHOU:', err.message);
    console.log('Confira usuario exato: qxwkbvebgkvd');
  } else {
    console.log('CONEXAO OK!');
    transporter.sendMail({
      from: '"Teste" <' + CONFIG.from + '>',
      to: CONFIG.from,
      subject: 'Teste SMTP ipz',
      text: 'Se chegou, esta funcionando!',
    }, (err2, info) => {
      if (err2) console.log('Erro ao enviar:', err2.message);
      else console.log('E-mail enviado! ID:', info.messageId);
      process.exit(0);
    });
  }
});
