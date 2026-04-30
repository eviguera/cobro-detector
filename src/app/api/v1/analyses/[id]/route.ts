import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateApiRequest, hasPermission } from '@/lib/api-auth'
import type { Analysis, Anomaly } from '@/types/database.types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Autenticar vía API key
    const auth = await authenticateApiRequest(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'API key inválida' }, { status: 401 })
    }

    if (!hasPermission(auth, 'read')) {
      return NextResponse.json({ error: 'Sin permisos de lectura' }, { status: 403 })
    }

    const supabase = await createClient()

    // Obtener análisis (solo del usuario autenticado via API)
    const { data: analysis, error } = await (supabase as any)
      .from('analyses')
      .select('*, anomalias(*)')
      .eq('id', params.id)
      .eq('user_id', auth.user_id!)
      .single()

    if (error || !analysis) {
      return NextResponse.json({ error: 'Análisis no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      analysis: analysis as Analysis,
      anomalies: (analysis as any).anomalias as Anomaly[],
    })

  } catch (err) {
    console.error('Error en GET /api/v1/analyses/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
