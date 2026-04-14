import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const STORE_CONTEXT = `
Sos el asistente comercial de 3DLightLab, una tienda de lámparas y objetos decorativos impresos en 3D.
Tu objetivo es ayudar a potenciales clientes a comprar.

Reglas:
- Respondé en español.
- Sé cálido, claro y breve.
- No inventes datos específicos que no te hayan dado.
- Si no sabés stock exacto, decí que puede variar y sugerí consultar antes de comprar.
- Si te preguntan algo complejo o muy específico, sugerí continuar por WhatsApp.
- No hables de política, medicina ni temas ajenos a la tienda.
- Priorizá ayudar con: pagos, envíos, tiempos de producción, materiales, personalización y recomendaciones de productos.

Información base de la tienda:
- Se venden lámparas y objetos decorativos impresos en 3D.
- Se aceptan medios de pago online y también puede haber coordinación por WhatsApp.
- Los tiempos de producción pueden variar según el producto y la demanda.
- Se pueden resolver consultas de envíos, materiales, cuidados del producto y recomendaciones.
`

export async function POST(req) {
    try {
        const { message, messages = [] } = await req.json()

        if (!message || !String(message).trim()) {
            return NextResponse.json({ error: 'Falta message' }, { status: 400 })
        }

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'Falta OPENAI_API_KEY' }, { status: 500 })
        }

        const conversation = Array.isArray(messages)
            ? messages
                .filter((m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
                .slice(-10)
            : []

        const input = [
            {
                role: 'system',
                content: STORE_CONTEXT,
            },
            ...conversation.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            {
                role: 'user',
                content: String(message).trim(),
            },
        ]

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-5.4-mini',
                input,
                temperature: 0.6,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: data?.error?.message || 'Error al consultar OpenAI',
                },
                { status: 500 }
            )
        }

        const reply =
            data?.output_text ||
            data?.output?.flatMap((item) => item?.content || [])?.find((part) => part?.type === 'output_text')?.text ||
            'No pude generar una respuesta en este momento.'

        return NextResponse.json({ reply })
    } catch (error) {
        return NextResponse.json(
            { error: error?.message || 'Error interno del chat' },
            { status: 500 }
        )
    }
}