import { inngest } from "@/lib/inngest";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { prepararHtmlEmail } from "@/lib/email-html";

export const processarFilaEmails = inngest.createFunction(
  { id: "processar-fila-emails", concurrency: 1, triggers: [{ event: "campanha/iniciar" }], retries: 3 },
  async ({ event, step }) => {
    const { campanhaId } = event.data;
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    // Fallback de segurança
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ganharfortuna-web.vercel.app';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const statusProvedor = await step.run("checar-provedor", async () => {
      const { data } = await supabase.from('system_settings').select('active_provider').eq('id', 1).single();
      return data?.active_provider;
    });
    if (statusProvedor !== 'inngest') return "Ignorado: QStash ativo.";

    const conta = await step.run("buscar-smtp", async () => {
      const { data } = await supabase.from('smtp_accounts').select('*').eq('is_active', true).limit(1).single();
      if (!data) throw new Error("Nenhuma conta SMTP ativa.");
      return data;
    });

    const loteRaw = await step.run("buscar-lote", async () => {
      const { data } = await supabase.from('email_queue').select('*').eq('campaign_id', campanhaId).eq('status', 'pending').order('created_at', { ascending: true }).limit(10);
      return data || [];
    });

    if (loteRaw.length === 0) return "Fila vazia.";

    const transporter = nodemailer.createTransport({
      pool: true, host: conta.host, port: Number(conta.port), secure: Number(conta.port) === 465,
      auth: { user: conta.email, pass: conta.app_password }, tls: { rejectUnauthorized: false },
    });

    await step.run("processar-lote-emails", async () => {
      for (const item of loteRaw) {
        try {
          const unsubUrl = `${baseUrl}/api/unsubscribe?id=${item.id}&email=${encodeURIComponent(item.recipient_email || '')}`;
          
          let corpo = (item.body || '')
            .replace(/\{\{email\}\}/gi, item.recipient_email || '')
            .replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente')
            .replace(/\{\{unsubscribe_link\}\}/gi, unsubUrl);
            
          corpo = prepararHtmlEmail(corpo);
          
          // 🛑 FORÇANDO A INJEÇÃO DO RODAPÉ (Sem verificação de duplicidade)
          const footer = `
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-family: Arial, sans-serif; font-size: 11px; color: #94a3b8; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">Este e-mail foi enviado para: <strong style="color: #64748b;">${item.recipient_email}</strong></p>
              <p style="margin: 0;">Não quer mais receber nossos e-mails? <a href="${unsubUrl}" style="color: #64748b; text-decoration: underline;">Clique aqui para descadastrar</a>.</p>
            </div>
          `;

          // 🛑 ESTRUTURA HTML COMPLETA (Força o Gmail a renderizar)
          const htmlFinal = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.5;">
              ${corpo}
              ${footer}
              <img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" />
            </body>
            </html>
          `;

          await transporter.sendMail({
            from: { name: conta.sender_name || 'Equipe', address: conta.sender_email || conta.email },
            to: item.recipient_email, 
            subject: item.subject, 
            html: htmlFinal,
            headers: {
              'List-Unsubscribe': `<${unsubUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            }
          });
          await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', item.id);
        } catch (err: any) {
          await supabase.from('email_queue').update({ status: 'failed', error_log: err.message?.slice(0, 500) }).eq('id', item.id);
        }
      }
    });
    return "Lote processado!";
  }
);

export const autoRecuperacao = inngest.createFunction(
  { id: "auto-recuperacao", concurrency: 1, triggers: [{ cron: "*/10 * * * *" }] },
  async ({ step }) => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const statusProvedor = await step.run("checar-provedor-cron", async () => {
      const { data } = await supabase.from('system_settings').select('active_provider').eq('id', 1).single();
      return data?.active_provider;
    });
    if (statusProvedor !== 'inngest') return "Ignorado.";
    return "Cron rodou.";
  }
);
