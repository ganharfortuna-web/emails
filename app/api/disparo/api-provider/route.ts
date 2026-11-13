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

    // 3. Monta o Payload (AQUI VOCÊ AJUSTA CONFORME A API QUE VOCÊ ESTÁ USANDO)
    // O exemplo abaixo é um padrão genérico. Se for Mailrelay, mude para o formato deles.
    const payload = {
      subject: campanha.assunto,
      html_content: campanha.mensagem,
      sender_name: "Sua Empresa",
      sender_email: "contato@suaempresa.com",
      list_id: apiConfig.list_id // Puxa o ID da lista que você salvou no painel
    };

    // 4. Dispara para a API externa usando as credenciais do banco
    const apiRes = await fetch(apiConfig.api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.api_key}`, // Alguns usam 'X-AUTH-TOKEN', ajuste se necessário
      },
      body: JSON.stringify(payload),
    });

    const apiData = await apiRes.json().catch(() => ({}));

    if (!apiRes.ok) {
      throw new Error(`Erro da API: ${apiRes.status} - ${JSON.stringify(apiData)}`);
    }

    // 5. Atualiza o status no seu banco para não tentar enviar via SMTP novamente
    await supabase.from('campanhas').update({ status: 'Enviando...' }).eq('id', campanhaId);
    await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('campaign_id', campanhaId).eq('status', 'pending');

    return NextResponse.json({ success: true, message: 'Campanha enviada para a API com sucesso.', api_response: apiData });

  } catch (error: any) {
    console.error('Erro na API do provedor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
