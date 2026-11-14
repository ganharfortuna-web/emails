import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";

export async function POST(request: Request) {
  try {
    const { campanhaId } = await request.json();
    if (!campanhaId) return NextResponse.json({ error: "ID da campanha obrigatório" }, { status: 400 });

    // Envia o comando para o Inngest na nuvem
    await inngest.send({
      name: "campanha/iniciar",
      data: { campanhaId },
    });

    return NextResponse.json({ success: true, message: "Envio iniciado em background." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
