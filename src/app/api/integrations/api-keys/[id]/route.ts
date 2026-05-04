import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authError, handleApiError, successResponse } from '@/lib/api-error'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return authError()
    }

    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      return handleApiError(error, 'DELETE /api/integrations/api-keys/[id]')
    }

    return successResponse({ success: true })

  } catch (err) {
    return handleApiError(err, 'DELETE /api/integrations/api-keys/[id]')
  }
}
