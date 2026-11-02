'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Shield, Mail, Lock, User, Building2, Loader2, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type Mode = 'login' | 'register' | 'forgot' | 'reset'

const NETWORK_ERROR_MESSAGE =
  'No pudimos conectar con el servidor de autenticación. Revisa tu conexión a internet e intenta de nuevo.'

// Se muestra junto al error de red para saber contra qué servidor se intentó
// conectar (local vs. remoto) sin exponer nada sensible: la URL es pública.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'no configurada'

const NETWORK_ERROR_HINTS = [
  'failed to fetch',
  'fetch failed',
  'networkerror',
  'network request failed',
  'load failed',
  'err_name_not_resolved',
  'enotfound',
  'econnrefused',
  'timeout',
  'aborted',
]

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return ''
}

function getAuthErrorMessage(message: string): string {
  const m = message.toLowerCase()
  if (!m) {
    return 'Ocurrió un error inesperado. Intenta de nuevo en unos segundos.'
  }
  if (NETWORK_ERROR_HINTS.some(hint => m.includes(hint))) {
    return NETWORK_ERROR_MESSAGE
  }
  if (m.includes('email not confirmed')) {
    return 'Tu email aún no está confirmado. Revisa tu bandeja de entrada y spam.'
  }
  if (m.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos. Verifica tus datos.'
  }
  if (m.includes('user already registered')) {
    return 'Ya existe una cuenta con este email. Inicia sesión.'
  }
  if (m.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Demasiados intentos. Espera un momento e intenta de nuevo.'
  }
  return message
}

const CALLBACK_ERRORS: Record<string, string> = {
  auth_callback: 'El enlace no es válido o ya expiró. Solicita uno nuevo.',
  otp_expired: 'El enlace expiró. Solicita uno nuevo.',
  access_denied: 'El enlace fue cancelado o expiró. Solicita uno nuevo.',
}

function LoginForm() {
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorDetail, setErrorDetail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    businessName: '',
  })

  useEffect(() => {
    if (searchParams?.get('reset') === '1') {
      setMode('reset')
    }
    const callbackError = searchParams?.get('error')
    if (callbackError) {
      setError(CALLBACK_ERRORS[callbackError] ?? CALLBACK_ERRORS.auth_callback)
    }
  }, [searchParams])

  // Un mismo mensaje ("revisa tu conexión") ocultaba causas muy distintas:
  // Supabase caído, URL mal configurada o red del usuario. En los fallos de
  // red se agrega la URL configurada y el error original como detalle.
  const clearAuthError = () => {
    setError('')
    setErrorDetail('')
  }

  const showAuthError = (message: string) => {
    setError(getAuthErrorMessage(message))
    const isNetwork = NETWORK_ERROR_HINTS.some(hint => message.toLowerCase().includes(hint))
    setErrorDetail(isNetwork ? `${SUPABASE_URL} — ${message || 'sin detalle'}` : '')
  }

  const updateField = (field: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
    if (error) clearAuthError()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    clearAuthError()

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (loginError) {
        showAuthError(loginError.message)
        return
      }

      window.location.href = '/dashboard'
    } catch (err) {
      showAuthError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    clearAuthError()

    try {
      const { data, error: registerError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.fullName, business_name: form.businessName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (registerError) {
        showAuthError(registerError.message)
        return
      }

      // Si el proyecto no exige confirmación, ya hay sesión: entrar directo.
      if (data.session) {
        window.location.href = '/dashboard'
        return
      }

      setConfirmationEmail(form.email)
    } catch (err) {
      showAuthError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    clearAuthError()

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(form.email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })

      if (resetError) {
        showAuthError(resetError.message)
        return
      }

      setConfirmationEmail(form.email)
    } catch (err) {
      showAuthError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAuthError()

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: form.password })

      if (updateError) {
        showAuthError(updateError.message)
        return
      }

      toast.success('Contraseña actualizada. Ya puedes iniciar sesión.')
      window.location.href = '/dashboard'
    } catch (err) {
      showAuthError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const resendConfirmation = async () => {
    setLoading(true)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: confirmationEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })

      if (resendError) {
        toast.error(getAuthErrorMessage(resendError.message))
      } else {
        toast.success('Email reenviado. Revisa tu bandeja de entrada.')
      }
    } catch (err) {
      toast.error(getAuthErrorMessage(toErrorMessage(err)))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    clearAuthError()
    setShowPassword(false)
  }

  const heading = {
    login: 'Bienvenido de vuelta',
    register: 'Crea tu cuenta',
    forgot: 'Recupera tu contraseña',
    reset: 'Define una nueva contraseña',
  }[mode]

  const subheading = {
    login: 'Ingresa a tu cuenta para ver tus análisis',
    register: 'Analiza tus estados de cuenta en minutos',
    forgot: 'Te enviaremos un enlace para restablecerla',
    reset: 'Elige una contraseña segura para tu cuenta',
  }[mode]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0f] flex">
      <div className="hidden lg:flex flex-col w-1/2 bg-blue-600 p-12 text-white">
        <Link href="/" className="flex items-center gap-2 mb-auto">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-semibold">CobroDetector</span>
        </Link>

        <div className="mb-auto">
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Detecta cobros<br />injustificados<br />en minutos
          </h2>
          <p className="text-blue-200 text-lg mb-10">
            Sube tu estado de cuenta y nuestra IA analiza cada transacción para proteger tu negocio.
          </p>

          <div className="space-y-4">
            {[
              'Análisis con inteligencia artificial',
              'Compatible con todos los bancos chilenos',
              'Reporte PDF listo para presentar al banco',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
                <span className="text-blue-100 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
          <p className="text-sm text-blue-100 italic mb-3">
            &ldquo;Detecté $500.000 en cobros duplicados en mi carnicería. El reporte me ayudó a recuperar el dinero ese mismo día en el banco.&rdquo;
          </p>
          <p className="text-xs text-blue-300">— Rodrigo A. · Carnicería La Principal · Rancagua</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-foreground">CobroDetector</span>
            </Link>
            <Link href="/" className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              Volver al inicio
            </Link>
          </div>

          {confirmationEmail && (mode === 'register' || mode === 'forgot') ? (
            <div className="animate-fade-in-up">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Revisa tu email</h1>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Enviamos un enlace a <strong className="text-foreground">{confirmationEmail}</strong>.
                {mode === 'register'
                  ? ' Confírmalo para activar tu cuenta.'
                  : ' Úsalo para restablecer tu contraseña.'}
              </p>
              <div className="space-y-3">
                {mode === 'register' && (
                  <button
                    type="button"
                    onClick={resendConfirmation}
                    disabled={loading}
                    className="w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
                  >
                    {loading ? 'Reenviando...' : 'Reenviar email'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setConfirmationEmail(''); switchMode('login') }}
                  className="w-full py-2.5 text-sm font-medium text-blue-600 hover:underline"
                >
                  Volver a iniciar sesión
                </button>
              </div>
              <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
                ¿No lo ves? Revisa la carpeta de spam o promociones.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                {mode !== 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Volver a iniciar sesión
                  </button>
                )}
                <h1 className="text-2xl font-bold text-foreground mb-2">{heading}</h1>
                <p className="text-muted-foreground text-sm">{subheading}</p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300"
                >
                  {error}
                  {errorDetail && (
                    <p className="mt-2 break-all font-mono text-xs text-red-600/80 dark:text-red-300/70">
                      {errorDetail}
                    </p>
                  )}
                </div>
              )}

              <form
                onSubmit={
                  mode === 'login' ? handleLogin
                    : mode === 'register' ? handleRegister
                      : mode === 'forgot' ? handleForgot
                        : handleReset
                }
                className="space-y-4"
              >
                {mode === 'register' && (
                  <>
                    <div>
                      <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre completo</label>
                      <div className="relative">
                        <User aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <input
                          id="full-name"
                          type="text"
                          required
                          autoComplete="name"
                          placeholder="Juan Pérez"
                          value={form.fullName}
                          onChange={e => updateField('fullName', e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="business-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre del negocio <span className="font-normal text-gray-400">(opcional)</span>
                      </label>
                      <div className="relative">
                        <Building2 aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <input
                          id="business-name"
                          type="text"
                          autoComplete="organization"
                          placeholder="Carnicería El Principal"
                          value={form.businessName}
                          onChange={e => updateField('businessName', e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <div className="relative">
                    <Mail aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="tu@email.com"
                      value={form.email}
                      onChange={e => updateField('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {mode === 'reset' ? 'Nueva contraseña' : 'Contraseña'}
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        placeholder="Mínimo 6 caracteres"
                        value={form.password}
                        onChange={e => updateField('password', e.target.value)}
                        className="w-full pl-10 pr-11 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        aria-pressed={showPassword}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'reset' && (
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar contraseña</label>
                    <div className="relative">
                      <Lock aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="Repite la contraseña"
                        value={form.confirmPassword}
                        onChange={e => updateField('confirmPassword', e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />}
                  {mode === 'login' ? 'Ingresar'
                    : mode === 'register' ? 'Crear cuenta'
                      : mode === 'forgot' ? 'Enviar enlace'
                        : 'Guardar contraseña'}
                </button>
              </form>

              <div className="mt-6 text-center">
                {mode === 'login' ? (
                  <button
                    onClick={() => switchMode('register')}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ¿No tienes cuenta? Regístrate
                  </button>
                ) : mode === 'register' ? (
                  <button
                    onClick={() => switchMode('login')}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ¿Ya tienes cuenta? Inicia sesión
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0f] flex items-center justify-center">
          <Loader2 aria-hidden="true" className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
