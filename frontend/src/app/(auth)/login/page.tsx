'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Shield, Mail, Lock, User, Building2, Loader2, Eye, EyeOff, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type Mode = 'login' | 'register' | 'forgot' | 'reset'

const NETWORK_ERROR_MESSAGE =
  'No pudimos conectarte. Revisa tu conexión e intenta de nuevo. Si el problema sigue, escríbenos a soporte@cobrodetector.cl con el código AUTH-503.'

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
  if (NETWORK_ERROR_HINTS.some((hint) => m.includes(hint))) {
    return NETWORK_ERROR_MESSAGE
  }
  if (m.includes('email not confirmed')) {
    return 'Tu email aún no está confirmado. Revisa tu bandeja de entrada y la carpeta de spam.'
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
  return 'No pudimos completar la operación. Intenta de nuevo o escríbenos a soporte@cobrodetector.cl.'
}

const CALLBACK_ERRORS: Record<string, string> = {
  auth_callback: 'El enlace no es válido o ya expiró. Solicita uno nuevo.',
  otp_expired: 'El enlace expiró. Solicita uno nuevo.',
  access_denied: 'El enlace fue cancelado o expiró. Solicita uno nuevo.',
}

const inputClass =
  'w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-ring/20'

const labelClass = 'mb-1 block text-sm font-medium text-foreground'
const iconClass = 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground'

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

  const clearAuthError = () => {
    setError('')
    setErrorDetail('')
  }

  const showAuthError = (message: string) => {
    setError(getAuthErrorMessage(message))
    // El detalle técnico solo en desarrollo: en producción no exponemos
    // infraestructura ni mensajes crudos del SDK.
    setErrorDetail(process.env.NODE_ENV !== 'production' ? message : '')
  }

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
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
    login: 'Ingresa a tu cuenta',
    register: 'Crea tu cuenta',
    forgot: 'Recupera tu contraseña',
    reset: 'Define una nueva contraseña',
  }[mode]

  const subheading = {
    login: 'Revisa tus análisis y descarga tus cartas de reclamo.',
    register: 'Analiza tus cartolas en minutos. Sin claves bancarias.',
    forgot: 'Te enviaremos un enlace para restablecerla.',
    reset: 'Elige una contraseña de al menos 6 caracteres.',
  }[mode]

  return (
    <main id="main-content" className="grid min-h-screen bg-background lg:grid-cols-[0.95fr_1.05fr]">
      {/* Panel de marca */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#0d1220] p-10 text-white lg:flex xl:p-14 dark:bg-[#0b0f1a]">
        <div className="pointer-events-none absolute inset-0 hero-glow opacity-60" aria-hidden="true" />
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#0d1220]">
              <Shield className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight">CobroDetector</span>
          </Link>

          <h2 className="mt-20 max-w-md font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight">
            Tu banco cobra de más.
            <br />
            <span className="text-success-500">Tú puedes reclamarlo.</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65">
            Sube tu cartola y recibe el detalle de cada cobro injustificado, con evidencia
            y una carta lista para presentar.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              'Comisiones duplicadas y cuotas mal calculadas',
              'Evidencia por transacción, sin humo',
              'Carta en PDF o Word para el banco',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[13px] text-white/80">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl border border-white/15 bg-white/5 p-5">
          <p className="text-[13px] leading-relaxed text-white/80">
            “Revisé 300 pagos de mi carnicería y recuperé $500.000 en comisiones que se
            repetían en cada cuota.”
          </p>
          <p className="mt-3 text-[11px] font-medium text-white/50">
            Rodrigo · Carnicería · Rancagua
          </p>
        </div>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-display text-[15px] font-semibold tracking-tight">CobroDetector</span>
            </Link>
            <Link href="/" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Volver al inicio
            </Link>
          </div>

          {confirmationEmail && (mode === 'register' || mode === 'forgot') ? (
            <div className="animate-fade-in-up">
              <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </span>
              <h1 className="font-display text-2xl font-semibold tracking-tight">Revisa tu correo</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Enviamos un enlace a <strong className="text-foreground">{confirmationEmail}</strong>.
                {mode === 'register'
                  ? ' Confírmalo para activar tu cuenta.'
                  : ' Úsalo para restablecer tu contraseña.'}
              </p>
              <div className="mt-6 space-y-3">
                {mode === 'register' ? (
                  <button
                    type="button"
                    onClick={resendConfirmation}
                    disabled={loading}
                    className="h-11 w-full rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                  >
                    {loading ? 'Reenviando…' : 'Reenviar correo'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setConfirmationEmail('')
                    switchMode('login')
                  }}
                  className="h-11 w-full text-sm font-semibold text-primary hover:underline"
                >
                  Volver a iniciar sesión
                </button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                ¿No lo ves? Revisa spam o promociones.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-7">
                {mode !== 'login' ? (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Volver a iniciar sesión
                  </button>
                ) : null}
                <h1 className="font-display text-2xl font-semibold tracking-tight">{heading}</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">{subheading}</p>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-500/25 dark:bg-danger-500/10 dark:text-danger-500"
                >
                  {error}
                  {errorDetail ? (
                    <p className="mt-2 break-all font-mono text-[11px] text-danger-600/80 dark:text-danger-500/80">
                      {errorDetail}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <form
                onSubmit={
                  mode === 'login'
                    ? handleLogin
                    : mode === 'register'
                      ? handleRegister
                      : mode === 'forgot'
                        ? handleForgot
                        : handleReset
                }
                className="space-y-4"
              >
                {mode === 'register' ? (
                  <>
                    <div>
                      <label htmlFor="full-name" className={labelClass}>Nombre completo</label>
                      <div className="relative">
                        <User aria-hidden="true" className={iconClass} />
                        <input
                          id="full-name"
                          type="text"
                          required
                          autoComplete="name"
                          placeholder="Juan Pérez"
                          value={form.fullName}
                          onChange={(e) => updateField('fullName', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="business-name" className={labelClass}>
                        Nombre del negocio <span className="font-normal text-muted-foreground">(opcional)</span>
                      </label>
                      <div className="relative">
                        <Building2 aria-hidden="true" className={iconClass} />
                        <input
                          id="business-name"
                          type="text"
                          autoComplete="organization"
                          placeholder="Carnicería El Principal"
                          value={form.businessName}
                          onChange={(e) => updateField('businessName', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                <div>
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail aria-hidden="true" className={iconClass} />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="tu@email.com"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {mode !== 'forgot' ? (
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label htmlFor="password" className="block text-sm font-medium text-foreground">
                        {mode === 'reset' ? 'Nueva contraseña' : 'Contraseña'}
                      </label>
                      {mode === 'login' ? (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      ) : null}
                    </div>
                    <div className="relative">
                      <Lock aria-hidden="true" className={iconClass} />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        placeholder="Mínimo 6 caracteres"
                        value={form.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        aria-describedby={mode !== 'login' ? 'password-help' : undefined}
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        aria-pressed={showPassword}
                        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                      </button>
                    </div>
                    {mode !== 'login' ? (
                      <p id="password-help" className="mt-1.5 text-[11px] text-muted-foreground">
                        Usa al menos 6 caracteres. No necesitas símbolos especiales.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {mode === 'reset' ? (
                  <div>
                    <label htmlFor="confirm-password" className={labelClass}>Confirmar contraseña</label>
                    <div className="relative">
                      <Lock aria-hidden="true" className={iconClass} />
                      <input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="Repite la contraseña"
                        value={form.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                  {mode === 'login'
                    ? 'Ingresar'
                    : mode === 'register'
                      ? 'Crear cuenta'
                      : mode === 'forgot'
                        ? 'Enviar enlace'
                        : 'Guardar contraseña'}
                </button>
              </form>

              <div className="mt-5 text-center">
                {mode === 'login' ? (
                  <button onClick={() => switchMode('register')} className="text-sm font-medium text-primary hover:underline">
                    ¿No tienes cuenta? Regístrate
                  </button>
                ) : mode === 'register' ? (
                  <button onClick={() => switchMode('login')} className="text-sm font-medium text-primary hover:underline">
                    ¿Ya tienes cuenta? Inicia sesión
                  </button>
                ) : null}
              </div>

              <div className="mt-8 flex items-start gap-2 rounded-xl border border-border/70 bg-secondary/30 px-3.5 py-3 text-[11px] leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600 dark:text-success-500" aria-hidden="true" />
                No te pedimos claves bancarias ni acceso a tu cuenta. Solo necesitamos la cartola que descargas tú.
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-primary" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
