import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { campanhaId } = await request.json();

  if (!campanhaId) {
    return NextResponse.json({ error: 'campanhaId obrigatório.' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    // 1. Busca a API ativa configurada no painel
    const { data: apiConfig, error: apiError } = await supabase
      .from('api_providers')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (apiError || !apiConfig) {
      return NextResponse.json({ error: 'Nenhuma API externa ativa configurada no painel.' }, { status: 400 });
    }

    // 2. Busca os dados da campanha no seu banco
    const { data: campanha, error: campanhaError } = await supabase
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single();

    if (campanhaError || !campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    }

    // 3. Valida o ID do grupo
    if (!apiConfig.list_id || String(apiConfig.list_id).trim() === '') {
      return NextResponse.json({ 
        error: 'ID da Lista/Grupo não configurado. Vá em Configurações > API Externa e preencha o ID do grupo na Mailrelay.' 
      }, { status: 400 });
    }

    // 4. Garante que a tag de descadastro esteja no HTML
    // A Mailrelay exige que o link de unsubscribe esteja presente.
    let htmlContent = campanha.mensagem || '';
    if (!htmlContent.includes('unsubscribe_url')) {
      htmlContent += `<br/><br/><hr style="border:none;border-top:1px solid #eee;margin:20px 0;"/><p style="font-size:12px;color:#888;text-align:center;">
        <a href="{{ unsubscribe_url }}">Clique aqui para se descadastrar</a>
      </p>`;
    }

    // 5. Monta o Payload no formato da Mailrelay
    const payload = {
      subject: campanha.assunto,
      html: htmlContent,
      sender_id: 1, // Substitua pelo ID numérico do remetente na Mailrelay, se necessário
      target: 'groups',
      group_ids: [Number(apiConfig.list_id)], // Garante que o ID seja um número dentro de um array
      track_opens: true,
      track_clicks: true
    };

    // 6. Dispara para a API da Mailrelay
    const apiRes = await fetch(apiConfig.api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': apiConfig.api_key,
      },
      body: JSON.stringify(payload),
    });

    const apiData = await apiRes.json().catch(() => ({}));

    if (!apiRes.ok) {
      throw new Error(`Erro da API: ${apiRes.status} - ${JSON.stringify(apiData)}`);
    }

    const mailrelayCampaignId = apiData.id;

    // 7. Dispara a campanha imediatamente
    if (mailrelayCampaignId) {
      const urlBase = apiConfig.api_url.replace('/campaigns', '');
      const sendRes = await fetch(`${urlBase}/campaigns/${mailrelayCampaignId}/send_all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': apiConfig.api_key,
        },
      });

      if (!sendRes.ok) {
        const sendError = await sendRes.json().catch(() => ({}));
        throw new Error(`Criada, mas erro ao disparar: ${sendRes.status} - ${JSON.stringify(sendError)}`);
      }
    }

    // 8. Atualiza o status no seu banco
    await supabase.from('campanhas').update({ status: 'Enviando...' }).eq('id', campanhaId);
    await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('campaign_id', campanhaId).eq('status', 'pending');

    return NextResponse.json({ success: true, message: 'Campanha enviada para a Mailrelay com sucesso!', api_response: apiData });

  } catch (error: any) {
    console.error('Erro na API do provedor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
