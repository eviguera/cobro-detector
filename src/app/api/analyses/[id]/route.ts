import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authError, handleApiError } from '@/lib/api-error'
import { revalidateTag } from 'next/cache'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) return authError()

    const { data: analysis, error: fetchErr } = await supabase
      .from('analyses')
      .select('file_url, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !analysis) {
      return NextResponse.json({ error: 'Análisis no encontrado' }, { status: 404 })
    }

    const { error: deleteAnomaliesErr } = await supabase
      .from('anomalies')
      .delete()
      .eq('analysis_id', params.id)

    if (deleteAnomaliesErr) {
      console.error('Error deleting anomalies:', deleteAnomaliesErr)
    }

    const { error: deleteAnalysisErr } = await supabase
      .from('analyses')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (deleteAnalysisErr) {
      console.error('Error deleting analysis:', deleteAnalysisErr)
      return NextResponse.json({ error: 'Error al eliminar el análisis' }, { status: 500 })
    }

    if (analysis.file_url) {
      const url = new URL(analysis.file_url)
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/analysis-files\/(.+)/)
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1])
        await supabase.storage.from('analysis-files').remove([filePath])
      }
    }

    revalidateTag(`analyses-${user.id}`)
    revalidateTag(`dashboard-${user.id}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err, 'DELETE /api/analyses/[id]')
  }
}
