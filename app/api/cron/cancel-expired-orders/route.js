import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req) {
    try {
        const authHeader = req.headers.get('authorization')
        const expectedToken = process.env.CRON_SECRET

        if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createAdminClient()

        const { error } = await supabase.rpc('cancel_expired_transfer_orders')

        if (error) {
            console.error('CRON ERROR:', error)

            return NextResponse.json(
                {
                    error: error.message || 'No se pudo ejecutar la cancelación automática',
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            ok: true,
            message: 'Órdenes vencidas procesadas correctamente',
            executedAt: new Date().toISOString(),
        })
    } catch (error) {
        console.error('CRON FATAL ERROR:', error)

        return NextResponse.json(
            {
                error: error?.message || 'Error interno',
            },
            { status: 500 }
        )
    }
}