const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp1.s.ipzmarketing.com',
  port: 587,
  secure: false,
  auth: { user: 'qxwkbvebgkvd', pass: 'P39EwWfGNC8' },
  tls: { rejectUnauthorized: false },
});

(async () => {
  const t0 = Date.now();
  let ok = 0, falhou = 0;

  for (let i = 1; i <= 5; i++) {
    const inicio = Date.now();
    try {
      await transporter.sendMail({
        from: '"Teste" <suporte@marketingdigitaltop.com.br>',
        to: 'suporte@marketingdigitaltop.com.br',
        subject: `Teste seq ${i}`,
        text: 'ping',
      });
      console.log(`✅ ${i}: OK (${Date.now() - inicio}ms)`);
      ok++;
    } catch (e) {
      console.log(`❌ ${i}: ${e.message} (${Date.now() - inicio}ms)`);
      falhou++;
    }
  }
  console.log(`\nTotal: ${Date.now() - t0}ms | OK: ${ok} | Falhou: ${falhou}`);
  process.exit(0);
})();
