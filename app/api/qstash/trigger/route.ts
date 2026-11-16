import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { campanhaId } = await request.json()
  const qstashUrl = process.env.QSTASH_URL
  const qstashToken = process.env.QSTASH_TOKEN

  if (!qstashUrl || !qstashToken) return NextResponse.json({ error: 'QStash não configurado' }, { status: 500 })

  // Envia mensagens iniciais para o QStash
  const promises = Array.from({ length: 5 }).map(() => 
    fetch(qstashUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${qstashToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ campanhaId }) 
    })
  )

  await Promise.all(promises)
  return NextResponse.json({ success: true })
}
