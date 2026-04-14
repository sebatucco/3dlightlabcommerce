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

function buildInput(message, messages = []) {
    const conversation = Array.isArray(messages)
        ? messages
            .filter(
                (m) =>
                    m &&
                    typeof m.content === 'string' &&
                    (m.role === 'user' || m.role === 'assistant')
            )
            .slice(-10)
        : []

    return [
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
}

async function callOpenAI(input) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        throw new Error('Falta OPENAI_API_KEY')
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4.1-mini',
            input,
        }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
        const err = new Error(data?.error?.message || 'Error al consultar OpenAI')
        err.provider = 'openai'
        err.status = response.status
        err.code = data?.error?.code || null
        err.details = data
        throw err
    }

    const reply = data?.output_text?.trim()

    if (!reply) {
        const err = new Error('OpenAI no devolvió texto de respuesta')
        err.provider = 'openai'
        err.status = 500
        err.code = 'empty_response'
        err.details = data
        throw err
    }

    return {
        provider: 'openai',
        reply,
    }
}

async function callGroq(input) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        throw new Error('Falta GROQ_API_KEY')
    }

    const response = await fetch('https://api.groq.com/openai/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'openai/gpt-oss-20b',
            input,
        }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
        const err = new Error(data?.error?.message || 'Error al consultar Groq')
        err.provider = 'groq'
        err.status = response.status
        err.code = data?.error?.code || null
        err.details = data
        throw err
    }

    const reply = data?.output_text?.trim()

    if (!reply) {
        const err = new Error('Groq no devolvió texto de respuesta')
        err.provider = 'groq'
        err.status = 500
        err.code = 'empty_response'
        err.details = data
        throw err
    }

    return {
        provider: 'groq',
        reply,
    }
}

function shouldFallbackToGroq(error) {
    const text = `${error?.message || ''} ${error?.code || ''}`.toLowerCase()

    return (
        error?.provider === 'openai' &&
        (
            text.includes('insufficient_quota') ||
            text.includes('quota') ||
            text.includes('billing') ||
            error?.status === 429
        )
    )
}

export async function POST(req) {
    try {
        const { message, messages = [] } = await req.json()

        if (!message || !String(message).trim()) {
            return NextResponse.json({ error: 'Falta message' }, { status: 400 })
        }

        const input = buildInput(message, messages)

        try {
            const result = await callOpenAI(input)
            return NextResponse.json({
                reply: result.reply,
                provider: result.provider,
            })
        } catch (openaiError) {
            console.error('OPENAI ERROR:', openaiError?.message, openaiError?.details)

            if (!shouldFallbackToGroq(openaiError)) {
                throw openaiError
            }

            const groqResult = await callGroq(input)

            return NextResponse.json({
                reply: groqResult.reply,
                provider: groqResult.provider,
                fallback: true,
            })
        }
    } catch (error) {
        console.error('CHAT ROUTE ERROR:', error)

        return NextResponse.json(
            {
                error: error?.message || 'Error interno del chat',
            },
            { status: 500 }
        )
    }
}