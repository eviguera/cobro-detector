import Link from 'next/link'
import {
  Shield, TrendingDown, Upload, Brain, FileText,
  ArrowRight, CheckCircle2, Zap, Star, Building2,
  AlertTriangle, CreditCard, Clock, Sparkles,
  Quote, BarChart3, Percent, Banknote, Eye, ChevronRight
} from 'lucide-react'
import { PLANS } from '@/lib/plans'
import { formatCLP } from '@/lib/utils'

/* ── Highlightable Word ── */
function HighlightWord({ children, color = '#4c6ef5' }: { children: string; color?: string }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 z-0 rounded-xl opacity-30" style={{ backgroundColor: color, transform: 'rotate(-2deg) scale(1.08)', boxShadow: `0 1px 3px ${color}40` }} />
    </span>
  )
}

function PillButton({ children, variant = 'primary', href, className = '' }: { children: React.ReactNode; variant?: 'primary' | 'outline' | 'teal'; href: string; className?: string }) {
  const styles = {
    primary: 'bg-[#4c6ef5] text-white hover:bg-[#3b5bdb] shadow-lg shadow-[#4c6ef5]/25 hover:shadow-xl hover:shadow-[#4c6ef5]/40',
    outline: 'bg-white dark:bg-gray-800 text-[#4c6ef5] dark:text-blue-400 border-2 border-[#4c6ef5]/20 hover:border-[#4c6ef5]/40 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    teal: 'bg-[#10b981] text-white hover:bg-[#059669] shadow-lg shadow-[#10b981]/25 hover:shadow-xl hover:shadow-[#10b981]/40',
  }
  return (
    <Link href={href} className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-[30px] text-base font-bold transition-all duration-300 hover:-translate-y-0.5 ${styles[variant]} ${className}`}>
      {children}
    </Link>
  )
}

function KpiCard({ value, label, icon: Icon, color = 'blue' }: { value: string; label: string; icon: typeof Shield; color?: 'blue' | 'emerald' | 'amber' }) {
  const colors = { blue: 'text-[#4c6ef5] bg-blue-50 dark:bg-blue-900/20', emerald: 'text-[#10b981] bg-emerald-50 dark:bg-emerald-900/20', amber: 'text-[#f59e0b] bg-amber-50 dark:bg-amber-900/20' }
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 p-8 text-center" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.07))' }}>
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-gray-900 dark:text-gray-100 tabular-nums leading-none mb-2">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, color = 'blue' }: { icon: typeof Shield; title: string; description: string; color?: 'blue' | 'emerald' | 'amber' | 'red' }) {
  const borders = { blue: 'border-t-[3px] border-t-[#4c6ef5]', emerald: 'border-t-[3px] border-t-[#10b981]', amber: 'border-t-[3px] border-t-[#f59e0b]', red: 'border-t-[3px] border-t-[#ef4444]' }
  return (
    <div className={`rounded-xl bg-white dark:bg-gray-900 p-6 ${borders[color]}`} style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.06))' }}>
      <div className="w-10 h-10 rounded-xl bg-[#f8fafc] dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[#4c6ef5]" />
      </div>
      <h3 className="font-display font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description, icon: Icon }: { number: number; title: string; description: string; icon: typeof Shield }) {
  return (
    <div className="flex gap-5 items-start">
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#4c6ef5] text-white flex items-center justify-center font-display font-bold text-xl shadow-lg shadow-[#4c6ef5]/20">{number}</div>
      <div className="flex-1 pt-1">
        <div className="flex items-center gap-2 mb-2"><Icon className="w-5 h-5 text-[#4c6ef5]" /><h3 className="font-display font-bold text-xl text-gray-900 dark:text-gray-100">{title}</h3></div>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function TestimonialCard({ quote, name, role, company }: { quote: string; name: string; role: string; company: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 p-6 sm:p-8" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.06))' }}>
      <Quote className="w-8 h-8 text-[#4c6ef5]/20 mb-4" />
      <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6 italic">{quote}</p>
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="w-11 h-11 rounded-full bg-[#4c6ef5] flex items-center justify-center text-white font-bold text-sm">{name.charAt(0)}</div>
        <div><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{role} · {company}</p></div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const plans = [
    { key: 'inicial', name: 'Inicial', price: '$20.000', credits: '1 análisis', features: PLANS[0].features.slice(0, 4), cta: 'Comenzar', href: '/login', highlighted: false },
    { key: 'plus', name: 'Plus', price: '$30.000', originalPrice: '$40.000', credits: '2 análisis', features: PLANS[1].features.slice(0, 4), cta: 'Elegir Plus', href: '/login', highlighted: true },
    { key: 'contador', name: 'Contador', price: '$100.000', originalPrice: '$200.000', credits: '10 análisis', features: PLANS[2].features.slice(0, 4), cta: 'Elegir Contador', href: '/login', highlighted: false },
    { key: 'platino', name: 'Platino', price: '20%', prefix: 'Solo', suffix: 'de lo recuperado', credits: 'Ilimitados', features: PLANS[3].features.slice(0, 4), cta: 'Comenzar gratis', href: '/login', highlighted: false },
  ]

  return (
    <div className="bg-white dark:bg-gray-950" id="top">
      <style>{`html { scroll-behavior: smooth; }`}</style>

      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4c6ef5] flex items-center justify-center shadow-lg shadow-[#4c6ef5]/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-gray-900 dark:text-gray-100">CobroDetector</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#precios" className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors px-3 py-2">Precios</a>
            <Link href="/login" className="px-5 py-2.5 bg-[#4c6ef5] hover:bg-[#3b5bdb] text-white rounded-[30px] text-sm font-semibold transition-all duration-300 shadow-lg shadow-[#4c6ef5]/20 hover:-translate-y-0.5">
              Comenzar ahora
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="bg-[#0f172a] pt-28 pb-24 sm:pt-36 sm:pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#4c6ef5]/10 via-transparent to-transparent" />
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-[#4c6ef5]/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-[#10b981]/10 blur-3xl" />
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4c6ef5]/10 border border-[#4c6ef5]/20 text-[#818cf8] text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" /> Detecta cobros injustificados en minutos
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white leading-[1.08] tracking-tight">
              Tu banco te puede estar{' '}
              <HighlightWord color="#4c6ef5">cobrando de más</HighlightWord>
              <br />sin que lo sepas
            </h1>
            <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
              Analizamos tus estados de cuenta con inteligencia artificial y detectamos comisiones duplicadas, errores en cuotas y cargos no reconocidos. Miles de pymes chilenas ya recuperaron su plata.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <PillButton variant="teal" href="/login">
                Analizar mi estado de cuenta <ArrowRight className="w-5 h-5" />
              </PillButton>
              <PillButton variant="outline" href="#como-funciona">
                Ver cómo funciona <Eye className="w-5 h-5" />
              </PillButton>
            </div>
            <p className="mt-5 text-sm text-gray-500">3 minutos · Sin compromiso · 97% de precisión</p>
          </div>
        </div>
      </section>

      {/* ═══ STATISTICS ═══ */}
      <section className="bg-white dark:bg-gray-950 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={Banknote} value="$500M+" label="Pesos recuperados por nuestros usuarios" color="emerald" />
            <KpiCard icon={BarChart3} value="12.000+" label="Estados de cuenta analizados" color="blue" />
            <KpiCard icon={Percent} value="97%" label="Precisión de detección con IA Groq" color="blue" />
            <KpiCard icon={Clock} value="3 min" label="Tiempo promedio por análisis" color="amber" />
          </div>
        </div>
      </section>

      {/* ═══ CÓMO FUNCIONA ═══ */}
      <section id="como-funciona" className="bg-[#f8fafc] dark:bg-gray-900 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-gray-900 dark:text-gray-100 leading-tight">¿<HighlightWord color="#4c6ef5">Cómo</HighlightWord> funciona?</h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Tres pasos. Cero fricción. Resultados en minutos.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            <StepCard number={1} icon={Upload} title="Subí tu archivo" description="Arrastrá tu estado de cuenta en CSV, Excel o PDF. Compatible con Santander, BCI, BancoEstado y todos los bancos chilenos." />
            <StepCard number={2} icon={Brain} title="La IA lo analiza" description="Nuestra IA revisa cada transacción buscando cobros duplicados, comisiones indebidas y errores en cuotas con 97% de precisión." />
            <StepCard number={3} icon={FileText} title="Recibí tu reporte" description="Obtené un reporte detallado listo para presentar en el banco. Con el monto exacto a recuperar e instrucciones paso a paso." />
          </div>
        </div>
      </section>

      {/* ═══ QUÉ DETECTAMOS ═══ */}
      <section className="bg-white dark:bg-gray-950 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-gray-900 dark:text-gray-100 leading-tight">¿Qué <HighlightWord color="#ef4444">detectamos</HighlightWord>?</h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">4 tipos de anomalías que nuestros usuarios más recuperan</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <FeatureCard color="red" icon={AlertTriangle} title="Comisiones duplicadas" description="La comisión de apertura se cobra UNA SOLA VEZ, no en cada cuota. Caso típico: venta en 6 cuotas sin interés con comisión duplicada en todas." />
            <FeatureCard color="amber" icon={TrendingDown} title="Errores en cuotas sin interés" description="Ventas 'sin interés' con montos de cuota inconsistentes. Detectamos la diferencia acumulada para que el banco te devuelva cada peso." />
            <FeatureCard color="blue" icon={AlertTriangle} title="Cargos no reconocidos" description="Cargos genéricos sin relación clara a una operación real. Nuestra IA identifica transacciones que no deberían estar en tu estado de cuenta." />
            <FeatureCard color="red" icon={TrendingDown} title="Cobros duplicados" description="Misma operación cobrada dos veces en una ventana de 7 días. Detectado por reglas determinísticas antes de que pase desapercibido." />
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIOS ═══ */}
      <section className="bg-[#f8fafc] dark:bg-gray-900 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-gray-900 dark:text-gray-100 leading-tight">Lo que dicen <HighlightWord color="#10b981">nuestros usuarios</HighlightWord></h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Miles de pymes chilenas ya están recuperando su plata</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard quote="Encontré $320.000 en comisiones duplicadas en un solo estado de cuenta. El banco me las reversó en 5 días. Increíble." name="Rodrigo Muñoz" role="Dueño" company="Carnicería El Novillo" />
            <TestimonialCard quote="Como contador, analizo estados de cuenta de 15 clientes. CobroDetector me ahorra horas de revisión manual. Es indispensable." name="Carolina Vásquez" role="Contadora" company="CV Asesorías" />
            <TestimonialCard quote="No tenía idea que MiPyme podía tener cobros indebidos. En 3 minutos subí mi cartola y detecté $85.000 en cargos que no correspondían." name="Felipe Rojas" role="Fundador" company="Rojas Digital" />
          </div>
        </div>
      </section>

      {/* ═══ PRECIOS ═══ */}
      <section id="precios" className="bg-white dark:bg-gray-950 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-gray-900 dark:text-gray-100 leading-tight">Planes <HighlightWord color="#4c6ef5">simples</HighlightWord> y transparentes</h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Planes flexibles. Sin letra chica. Créditos sin vencimiento.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {plans.map(plan => (
              <div key={plan.key} className={`relative rounded-xl p-6 sm:p-8 ${plan.highlighted ? 'bg-[#4c6ef5] text-white scale-[1.03]' : 'bg-white dark:bg-gray-900'}`} style={{ filter: plan.highlighted ? 'drop-shadow(0px 8px 16px rgba(76,110,245,0.3))' : 'drop-shadow(0px 4px 6px rgba(0,0,0,0.06))' }}>
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#10b981] text-white rounded-full text-xs font-bold shadow-lg shadow-[#10b981]/30">
                    <Zap className="w-3 h-3" /> Más popular
                  </div>
                )}
                <h3 className={`font-display font-bold text-xl mb-1 ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{plan.name}</h3>
                <p className={`text-sm mb-4 ${plan.highlighted ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>{plan.credits}</p>
                {plan.originalPrice && <p className={`text-sm line-through mb-1 ${plan.highlighted ? 'text-blue-200/60' : 'text-gray-400'}`}>{plan.originalPrice}</p>}
                <div className="flex items-baseline gap-1 mb-5">
                  {plan.prefix && <span className={`text-lg ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>{plan.prefix}</span>}
                  <span className="font-display font-bold text-4xl">{plan.price}</span>
                  {plan.suffix && <span className={`text-base ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>{plan.suffix}</span>}
                </div>
                <ul className="space-y-2.5 mb-7">
                  {plan.features.map((f: string, j: number) => (
                    <li key={j} className="flex items-start gap-2">
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-[#10b981]' : 'text-[#10b981]'}`} />
                      <span className={`text-sm ${plan.highlighted ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300'}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className={`block w-full py-3 rounded-[30px] text-center text-base font-bold transition-all duration-300 hover:-translate-y-0.5 ${plan.highlighted ? 'bg-white text-[#4c6ef5] hover:bg-gray-100 shadow-lg' : 'bg-[#4c6ef5] text-white hover:bg-[#3b5bdb] shadow-lg shadow-[#4c6ef5]/20'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-[#f8fafc] dark:bg-gray-900 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-gray-900 dark:text-gray-100 leading-tight">Preguntas <HighlightWord color="#4c6ef5">frecuentes</HighlightWord></h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Respuestas a las preguntas más comunes</p>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {[
              { q: '¿Los créditos tienen fecha de vencimiento?', a: 'No. Los créditos que compres son tuyos para siempre. Los podés usar cuando quieras, sin presión.' },
              { q: '¿Cómo funciona el Plan Platino del 20%?', a: 'Subís tu estado de cuenta, detectamos los cobros indebidos, y solo pagás el 20% de lo que logres recuperar. Sin costo fijo.' },
              { q: '¿Qué bancos son compatibles?', a: 'Santander, BCI, Banco de Chile, BancoEstado, Itaú, Scotiabank, Security, Falabella, Ripley y más. Si tu banco no está, nos avisás y lo agregamos.' },
              { q: '¿Mis datos están seguros?', a: 'Sí. Usamos encriptación AES-256 y tus estados de cuenta se almacenan en Supabase con bases de datos encriptadas. Nadie más ve tus datos.' },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl bg-white dark:bg-gray-900" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.04))' }}>
                <summary className="flex items-center justify-between cursor-pointer p-5 list-none">
                  <span className="text-base font-semibold text-gray-900 dark:text-gray-100">{faq.q}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 transition-transform duration-200 group-open:rotate-90" />
                </summary>
                <p className="px-5 pb-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST ═══ */}
      <section className="bg-white dark:bg-gray-950 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 text-center">
          <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-10">Tecnología que respalda nuestro servicio</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { icon: Shield, label: 'Encriptación AES-256' },
              { icon: Building2, label: 'Compatible CMF Chile' },
              { icon: Brain, label: 'IA Groq Llama 3.1' },
              { icon: Star, label: 'Supabase PostgreSQL' },
              { icon: CreditCard, label: 'Pagos Mercado Pago' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="bg-[#0f172a] py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#4c6ef5]/10 via-transparent to-[#10b981]/10" />
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 relative text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white leading-tight max-w-2xl mx-auto">
            ¿Listo para descubrir si tu banco te debe <HighlightWord color="#10b981">plata</HighlightWord>?
          </h2>
          <p className="mt-5 text-lg text-gray-400 max-w-md mx-auto">El primer análisis toma 3 minutos. Sin compromiso. Sin costo hasta que recuperes.</p>
          <div className="mt-8">
            <PillButton variant="teal" href="/login">
              Comenzar ahora — es gratis <ArrowRight className="w-5 h-5" />
            </PillButton>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#10b981]" /> Sin tarjeta de crédito</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#10b981]" /> 3 minutos</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#10b981]" /> 97% precisión</span>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-[#0f172a] border-t border-gray-800 py-8">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#4c6ef5]" />
            <span className="text-sm font-semibold text-gray-400">CobroDetector</span>
          </div>
          <p className="text-xs text-gray-500">© 2026 CobroDetector · Detecta cobros injustificados de tu banco</p>
        </div>
      </footer>
    </div>
  )
}
