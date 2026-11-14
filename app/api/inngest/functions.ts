import { inngest } from "@/lib/inngest";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { classificarErro, calcularProximaTentativa } from "@/lib/bounce";
import { prepararHtmlEmail } from "@/lib/email-html";

export const processarFilaEmails = inngest.createFunction(
  { 
    id: "processar-fila-emails", 
    concurrency: 1, // Impede que dois processos rodem ao mesmo tempo
    triggers: [{ event: "campanha/iniciar" }] 
  },
  async ({ event, step }) => {
    const { campanhaId } = event.data;
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    const conta = await step.run("buscar-smtp", async () => {
      const { data } = await supabase.from('smtp_accounts').select('*').eq('is_active', true).limit(1).single();
      if (!data) throw new Error("Nenhuma conta SMTP ativa configurada.");
      return data;
    });

    const lote = await step.run("buscar-lote", async () => {
      const { data } = await supabase
        .from('email_queue')
        .select('*')
        .eq('campaign_id', campanhaId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(20); // 20 e-mails por lote para não sobrecarregar
      return data || [];
    });

    if (lote.length === 0) {
      await step.run("finalizar-campanha", async () => {
        const { count } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', campanhaId).eq('status', 'pending');
        if ((count || 0) === 0) {
          await supabase.from('campanhas').update({ status: 'Enviada' }).eq('id', campanhaId);
        }
      });
      return "Fila vazia. Campanha finalizada.";
    }

    const transporter = nodemailer.createTransport({
      host: conta.host, port: Number(conta.port), secure: Number(conta.port) === 465,
      auth: { user: conta.email, pass: conta.app_password }, tls: { rejectUnauthorized: false },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });

    for (const item of lote) {
      await step.run(`enviar-${item.id}`, async () => {
        try {
          let corpo = (item.body || '').replace(/\{\{email\}\}/gi, item.recipient_email || '').replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente');
          corpo = prepararHtmlEmail(corpo);
          
          if (baseUrl) {
            corpo = corpo.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (_m: string, quote: string, url: string) => 
              `href="${baseUrl}/api/track/click?id=${item.id}&url=${encodeURIComponent(url)}"`
            ) + `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" />`;
          }

          await transporter.sendMail({
            from: { name: conta.sender_name || 'Equipe', address: conta.sender_email || conta.email },
            to: item.recipient_email, subject: item.subject, html: corpo,
          });

          await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', item.id);
          await supabase.from('smtp_accounts').update({ sent_today: (conta.sent_today || 0) + 1 }).eq('id', conta.id);
        } catch (err: any) {
          // Se der erro de rate limit, joga de volta para pending e falha o lote
          const isRateLimit = err.message?.includes('421') || err.message?.includes('429') || err.message?.includes('too many');
          
          if (isRateLimit) {
            throw new Error("Rate Limit atingido. Vou pausar e tentar novamente."); // Força o Inngest a falhar a step e tentar de novo
          } else {
            await supabase.from('email_queue').update({ status: 'failed', error_log: err.message?.slice(0, 500) }).eq('id', item.id);
          }
        }
      });
    }

    const restantes = await step.run("checar-restantes", async () => {
      const { count } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', campanhaId).eq('status', 'pending');
      return count || 0;
    });

    if (restantes > 0) {
      // ✅ O SEGREDO: Espera 30 segundos antes de chamar o próximo lote
      await step.sleep("aguardar-rate-limit", "30s");
      
      await step.sendEvent("continuar-envio", {
        name: "campanha/iniciar",
        data: { campanhaId },
      });
      return `Lote enviado. Restam ${restantes}. Aguardando 30s para o próximo lote.`;
    }

    await step.run("marcar-como-enviada", async () => {
      await supabase.from('campanhas').update({ status: 'Enviada' }).eq('id', campanhaId);
    });

    return "Campanha concluída!";
  }
);
