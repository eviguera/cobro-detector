import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { error } = await (supabase as any)
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error revocando API key:', error)
      return NextResponse.json({ error: 'Error revocando API key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Error en DELETE /api/integrations/api-keys/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
