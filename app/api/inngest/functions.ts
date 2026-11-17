import { inngest } from "@/lib/inngest";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { prepararHtmlEmail } from "@/lib/email-html";

export const processarFilaEmails = inngest.createFunction(
  { id: "processar-fila-emails", concurrency: 1, triggers: [{ event: "campanha/iniciar" }], retries: 3 },
  async ({ event, step }) => {
    const { campanhaId } = event.data;
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ganharfortuna-web.vercel.app';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const statusProvedor = await step.run("checar-provedor", async () => {
      const { data } = await supabase.from('system_settings').select('active_provider').eq('id', 1).single();
      return data?.active_provider;
    });
    if (statusProvedor !== 'inngest') return "Ignorado: QStash ativo.";

    const statusCampanha = await step.run("checar-status", async () => {
      const { data } = await supabase.from('campanhas').select('status').eq('id', campanhaId).single();
      return data?.status;
    });
    if (statusCampanha === 'Pausada') return "Campanha pausada.";

    const conta = await step.run("buscar-smtp", async () => {
      const { data } = await supabase.from('smtp_accounts').select('*').eq('is_active', true).limit(1).single();
      if (!data) throw new Error("Nenhuma conta SMTP ativa.");
      return data;
    });

    const { data: suprimidos } = await supabase.from('suppression_list').select('email');
    const emailsSuprimidos = new Set((suprimidos || []).map(s => (s.email || '').toLowerCase()));

    const loteRaw = await step.run("buscar-lote", async () => {
      const { data } = await supabase.from('email_queue').select('*').eq('campaign_id', campanhaId).eq('status', 'pending').order('created_at', { ascending: true }).limit(10);
      return data || [];
    });

    const lote = loteRaw.filter((item: any) => !emailsSuprimidos.has((item.recipient_email || '').toLowerCase())).slice(0, 10);

    if (lote.length === 0) {
      await step.run("finalizar-campanha", async () => {
        const { count } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', campanhaId).eq('status', 'pending');
        if ((count || 0) === 0) await supabase.from('campanhas').update({ status: 'Enviada' }).eq('id', campanhaId);
      });
      return "Fila vazia. Campanha finalizada.";
    }

    const transporter = nodemailer.createTransport({
      pool: true, maxConnections: 5, maxMessages: 100, host: conta.host, port: Number(conta.port), secure: Number(conta.port) === 465,
      auth: { user: conta.email, pass: conta.app_password }, tls: { rejectUnauthorized: false },
    });

    await step.run("processar-lote-emails", async () => {
      for (const item of lote) {
        try {
          await supabase.from('campanhas').update({ updated_at: new Date().toISOString() }).eq('id', campanhaId);

          const unsubUrl = `${baseUrl}/api/unsubscribe?id=${item.id}&email=${encodeURIComponent(item.recipient_email || '')}`;
          let corpo = (item.body || '')
            .replace(/\{\{email\}\}/gi, item.recipient_email || '')
            .replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente')
            .replace(/\{\{unsubscribe_link\}\}/gi, unsubUrl);
            
          corpo = prepararHtmlEmail(corpo);
          
          corpo = corpo.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (_m: string, quote: string, url: string) => {
            if (url.includes('/api/unsubscribe')) return _m;
            return `href="${baseUrl}/api/track/click?id=${item.id}&url=${encodeURIComponent(url)}"`;
          });
          
          if (!/(descadastr|unsubscribe)/i.test(corpo)) {
             corpo += `
               <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-family: Arial, sans-serif; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                 <p style="margin: 0 0 8px 0;">Este e-mail foi enviado para: <strong style="color: #64748b;">${item.recipient_email}</strong></p>
                 <p style="margin: 0;">Não quer mais receber nossos e-mails? <a href="${unsubUrl}" clicktracking="off" data-msys-clicktrack="0" style="color: #64748b; text-decoration: underline;">Clique aqui para descadastrar</a>.</p>
               </div>
             `;
          }
          
          corpo += `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" />`;

          // 🛑 ESTRUTURA HTML COMPLETA PARA O GMAIL NÃO ESCONDER O RODAPÉ
          const htmlFinal = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.5;">
              ${corpo}
            </body>
            </html>
          `;

          await transporter.sendMail({
            from: { name: conta.sender_name || 'Equipe', address: conta.sender_email || conta.email },
            to: item.recipient_email, 
            subject: item.subject, 
            html: htmlFinal, // <-- Enviando o HTML completo
            headers: {
              'List-Unsubscribe': `<${unsubUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            }
          });
          await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', item.id);
          await supabase.from('smtp_accounts').update({ sent_today: (conta.sent_today || 0) + 1 }).eq('id', conta.id);
          await new Promise(resolve => setTimeout(resolve, 100)); 
        } catch (err: any) {
          await supabase.from('email_queue').update({ status: 'failed', error_log: err.message?.slice(0, 500) }).eq('id', item.id);
        }
      }
    });

    const restantes = await step.run("checar-restantes", async () => {
      const { count } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', campanhaId).eq('status', 'pending');
      return count || 0;
    });

    if (restantes > 0) {
      await step.sleep("aguardar", "2s"); 
      await step.sendEvent("continuar", { name: "campanha/iniciar", data: { campanhaId } });
      return `Lote enviado. Restam ${restantes}.`;
    }

    await step.run("marcar-como-enviada", async () => {
      await supabase.from('campanhas').update({ status: 'Enviada' }).eq('id', campanhaId);
    });
    return "Campanha concluída!";
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
    if (statusProvedor !== 'inngest') return "Ignorado: QStash ativo.";

    const agendadasVencidas = await step.run("buscar-agendadas", async () => {
      const { data } = await supabase.from('campanhas').select('id').eq('status', 'Agendada').lte('scheduled_at', new Date().toISOString()); 
      return data || [];
    });
    for (const camp of agendadasVencidas) {
      await supabase.from('campanhas').update({ status: 'Enviando...' }).eq('id', camp.id);
      await step.sendEvent("iniciar", { name: "campanha/iniciar", data: { campanhaId: camp.id } });
    }

    const campanhasParadas = await step.run("buscar-paradas", async () => {
      const dataLimite = new Date(Date.now() - 10 * 60000).toISOString();
      const { data } = await supabase.from('campanhas').select('id').eq('status', 'Enviando...').lt('updated_at', dataLimite);
      return data || [];
    });
    for (const camp of campanhasParadas) {
      const { count } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', camp.id).eq('status', 'pending');
      if (count && count > 0) {
        await supabase.from('campanhas').update({ updated_at: new Date().toISOString() }).eq('id', camp.id);
        await step.sendEvent("reativar", { name: "campanha/iniciar", data: { campanhaId: camp.id } });
      }
    }
    return `Agendamentos: ${agendadasVencidas.length}. Resgatadas: ${campanhasParadas.length}.`;
  }
);
