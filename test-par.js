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
  
  const promessas = [1, 2, 3, 4, 5].map(async (i) => {
    try {
      await transporter.sendMail({
        from: '"Teste" <suporte@marketingdigitaltop.com.br>',
        to: 'suporte@marketingdigitaltop.com.br',
        subject: `Teste par ${i}`,
        text: 'ping',
      });
      console.log(`✅ ${i}: OK`);
      return 'ok';
    } catch (e) {
      console.log(`❌ ${i}: ${e.message}`);
      return 'falhou';
    }
  });

  const res = await Promise.all(promessas);
  const ok = res.filter(r => r === 'ok').length;
  console.log(`\nTotal: ${Date.now() - t0}ms | OK: ${ok} | Falhou: ${5 - ok}`);
  process.exit(0);
})();
