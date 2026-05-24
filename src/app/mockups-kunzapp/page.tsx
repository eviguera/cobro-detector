export const dynamic = 'force-dynamic'

import {
  Shield, TrendingDown, Upload, Brain, FileText,
  ArrowRight, CheckCircle2, Zap, Star, Building2,
  AlertTriangle, CreditCard, Clock, Sparkles, Download,
  Send, ChevronRight, Quote, ArrowUpRight, BarChart3,
  Percent, Banknote, Eye
} from 'lucide-react'

/* ── Highlightable Word with rotated box behind it (Kunzapp signature) ── */
function HighlightWord({ children, color = '#4c6ef5' }: { children: string; color?: string }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <span
        className="absolute inset-0 z-0 rounded-xl opacity-30"
        style={{
          backgroundColor: color,
          transform: 'rotate(-2deg) scale(1.08)',
          boxShadow: `0 1px 3px ${color}40`,
        }}
      />
    </span>
  )
}

/* ── Pill Button (Kunzapp: 30px radius) ── */
function PillButton({ children, variant = 'primary', className = '' }: { children: React.ReactNode; variant?: 'primary' | 'outline' | 'teal'; className?: string }) {
  const styles = {
    primary: 'bg-[#4c6ef5] text-white hover:bg-[#3b5bdb] shadow-lg shadow-[#4c6ef5]/25 hover:shadow-xl hover:shadow-[#4c6ef5]/40',
    outline: 'bg-white dark:bg-gray-800 text-[#4c6ef5] dark:text-blue-400 border-2 border-[#4c6ef5]/20 hover:border-[#4c6ef5]/40 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    teal: 'bg-[#10b981] text-white hover:bg-[#059669] shadow-lg shadow-[#10b981]/25 hover:shadow-xl hover:shadow-[#10b981]/40',
  }
  return (
    <span className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-[30px] text-base font-bold transition-all duration-300 hover:-translate-y-0.5 ${styles[variant]} ${className}`}>
      {children}
    </span>
  )
}

/* ── Section Container (Kunzapp: alternating bg, spacious padding) ── */
function Section({ bg = 'white', children, id }: { bg?: 'white' | 'light' | 'dark' | 'brand'; children: React.ReactNode; id?: string }) {
  const bgs = {
    white: 'bg-white dark:bg-gray-950',
    light: 'bg-[#f8fafc] dark:bg-gray-900',
    dark: 'bg-[#0f172a]',
    brand: 'bg-[#1e3a5f]',
  }
  return (
    <section id={id} className={`${bgs[bg]} py-20 sm:py-28`}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">{children}</div>
    </section>
  )
}

/* ── Section Title (Kunzapp: bold H2, centered, optional highlight) ── */
function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="text-center mb-14">
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-gray-900 dark:text-gray-100 leading-tight tracking-tight">{children}</h2>
      {subtitle && <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  )
}

/* ── KPI Card (Kunzapp: large number, drop shadow, white bg) ── */
function KpiCard({ value, label, icon: Icon, color = 'blue' }: { value: string; label: string; icon: typeof Shield; color?: 'blue' | 'emerald' | 'amber' | 'red' }) {
  const colors = {
    blue: 'text-[#4c6ef5] bg-blue-50 dark:bg-blue-900/20',
    emerald: 'text-[#10b981] bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'text-[#f59e0b] bg-amber-50 dark:bg-amber-900/20',
    red: 'text-[#ef4444] bg-red-50 dark:bg-red-900/20',
  }
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

/* ── Feature Card (Kunzapp: white card, drop shadow, icon + title + description) ── */
function FeatureCard({ icon: Icon, title, description, color = 'blue' }: { icon: typeof Shield; title: string; description: string; color?: 'blue' | 'emerald' | 'amber' }) {
  const borders = {
    blue: 'border-t-[3px] border-t-[#4c6ef5]',
    emerald: 'border-t-[3px] border-t-[#10b981]',
    amber: 'border-t-[3px] border-t-[#f59e0b]',
  }
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

/* ── Step Numbered Card (Kunzapp how-it-works style) ── */
function StepCard({ number, title, description, icon: Icon }: { number: number; title: string; description: string; icon: typeof Shield }) {
  return (
    <div className="flex gap-5 items-start">
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#4c6ef5] text-white flex items-center justify-center font-display font-bold text-xl shadow-lg shadow-[#4c6ef5]/20">
        {number}
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-5 h-5 text-[#4c6ef5]" />
          <h3 className="font-display font-bold text-xl text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

/* ── Testimonial Card (Kunzapp: white card + quote + person) ── */
function TestimonialCard({ quote, name, role, company }: { quote: string; name: string; role: string; company: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 p-6 sm:p-8" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.06))' }}>
      <Quote className="w-8 h-8 text-[#4c6ef5]/20 mb-4" />
      <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6 italic">{quote}</p>
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="w-11 h-11 rounded-full bg-[#4c6ef5] flex items-center justify-center text-white font-bold text-sm">
          {name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{role} · {company}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Pricing Card ── */
function PricingCard({ name, price, prefix, suffix, originalPrice, credits, features, highlighted, color, cta }: {
  name: string; price: string; prefix?: string; suffix?: string; originalPrice?: string; credits: string; features: string[]; highlighted?: boolean; color: string; cta: string;
}) {
  return (
    <div className={`relative rounded-xl p-6 sm:p-8 ${highlighted ? 'bg-[#4c6ef5] text-white scale-[1.03]' : 'bg-white dark:bg-gray-900'}`}
      style={{ filter: highlighted ? 'drop-shadow(0px 8px 16px rgba(76,110,245,0.3))' : 'drop-shadow(0px 4px 6px rgba(0,0,0,0.06))' }}>
      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#10b981] text-white rounded-full text-xs font-bold shadow-lg shadow-[#10b981]/30">
          <Zap className="w-3 h-3" /> Más popular
        </div>
      )}
      <h3 className={`font-display font-bold text-xl mb-1 ${highlighted ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{name}</h3>
      <p className={`text-sm mb-4 ${highlighted ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>{credits}</p>
      {originalPrice && <p className={`text-sm line-through mb-1 ${highlighted ? 'text-blue-200/60' : 'text-gray-400'}`}>{originalPrice}</p>}
      <div className="flex items-baseline gap-1 mb-5">
        {prefix && <span className={`text-lg ${highlighted ? 'text-blue-200' : 'text-gray-500'}`}>{prefix}</span>}
        <span className="font-display font-bold text-4xl">{price}</span>
        {suffix && <span className={`text-base ${highlighted ? 'text-blue-200' : 'text-gray-500'}`}>{suffix}</span>}
      </div>
      <ul className="space-y-2.5 mb-7">
        {features.map((f, j) => (
          <li key={j} className="flex items-start gap-2">
            <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${highlighted ? 'text-[#10b981]' : 'text-[#10b981]'}`} />
            <span className={`text-sm ${highlighted ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300'}`}>{f}</span>
          </li>
        ))}
      </ul>
      <div className={`w-full py-3 rounded-[30px] text-center text-base font-bold transition-all duration-300 hover:-translate-y-0.5 cursor-pointer ${
        highlighted
          ? 'bg-white text-[#4c6ef5] hover:bg-gray-100 shadow-lg'
          : 'bg-[#4c6ef5] text-white hover:bg-[#3b5bdb] shadow-lg shadow-[#4c6ef5]/20'
      }`}>
        {cta}
      </div>
    </div>
  )
}

export default function KunzappInspiredPage() {
  return (
    <div className="bg-white dark:bg-gray-950">
      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <section className="bg-[#0f172a] pt-28 pb-24 sm:pt-36 sm:pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#4c6ef5]/10 via-transparent to-transparent" />
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-[#4c6ef5]/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-[#10b981]/10 blur-3xl" />
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4c6ef5]/10 border border-[#4c6ef5]/20 text-[#818cf8] text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Detecta cobros injustificados en minutos
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white leading-[1.08] tracking-tight">
              Tu banco te puede estar{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-[#4c6ef5]">cobrando de más</span>
                <span className="absolute inset-0 z-0 rounded-xl opacity-25" style={{ backgroundColor: '#4c6ef5', transform: 'rotate(-2deg) scale(1.08)', boxShadow: '0 1px 3px #4c6ef540' }} />
              </span>
              <br />sin que lo sepas
            </h1>
            <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
              Analizamos tus estados de cuenta con inteligencia artificial y detectamos comisiones duplicadas, errores en cuotas y cargos no reconocidos. Miles de pymes chilenas ya recuperaron su plata.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <PillButton variant="teal">
                Analizar mi estado de cuenta <ArrowRight className="w-5 h-5" />
              </PillButton>
              <PillButton variant="outline">
                Ver cómo funciona <Eye className="w-5 h-5" />
              </PillButton>
            </div>
            <p className="mt-5 text-sm text-gray-500">3 minutos · Sin compromiso · 97% de precisión</p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ STATISTICS ═══════════════════════════ */}
      <Section bg="white">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Banknote} value="$500M+" label="Pesos recuperados por nuestros usuarios" color="emerald" />
          <KpiCard icon={BarChart3} value="12.000+" label="Estados de cuenta analizados" color="blue" />
          <KpiCard icon={Percent} value="97%" label="Precisión de detección con IA Groq" color="blue" />
          <KpiCard icon={Clock} value="3 min" label="Tiempo promedio por análisis" color="amber" />
        </div>
      </Section>

      {/* ═══════════════════════════ CÓMO FUNCIONA ═══════════════════════════ */}
      <Section bg="light" id="como-funciona">
        <SectionTitle subtitle="Tres pasos. Cero fricción. Resultados en minutos.">
          ¿<HighlightWord color="#4c6ef5">Cómo</HighlightWord> funciona?
        </SectionTitle>
        <div className="grid sm:grid-cols-3 gap-8">
          <StepCard number={1} icon={Upload} title="Subí tu archivo" description="Arrastrá tu estado de cuenta en CSV, Excel o PDF. Compatible con Santander, BCI, BancoEstado y todos los bancos chilenos." />
          <StepCard number={2} icon={Brain} title="La IA lo analiza" description="Nuestra IA revisa cada transacción buscando cobros duplicados, comisiones indebidas y errores en cuotas con 97% de precisión." />
          <StepCard number={3} icon={FileText} title="Recibí tu reporte" description="Obtené un reporte detallado listo para presentar en el banco. Con el monto exacto a recuperar y las instrucciones paso a paso." />
        </div>
      </Section>

      {/* ═══════════════════════════ QUÉ DETECTAMOS ═══════════════════════════ */}
      <Section bg="white">
        <SectionTitle subtitle="4 tipos de anomalías que nuestros usuarios más recuperan">
          ¿Qué <HighlightWord color="#ef4444">detectamos</HighlightWord>?
        </SectionTitle>
        <div className="grid sm:grid-cols-2 gap-5">
          <FeatureCard color="red" icon={AlertTriangle} title="Comisiones duplicadas" description="La comisión de apertura se cobra UNA SOLA VEZ, no en cada cuota. Caso típico: venta en 6 cuotas sin interés con comisión duplicada en todas." />
          <FeatureCard color="amber" icon={TrendingDown} title="Errores en cuotas sin interés" description="Ventas 'sin interés' con montos de cuota inconsistentes. Detectamos la diferencia acumulada para que el banco te devuelva cada peso." />
          <FeatureCard color="blue" icon={AlertTriangle} title="Cargos no reconocidos" description="Cargos genéricos sin relación clara a una operación real. Nuestra IA identifica transacciones que no deberían estar en tu estado de cuenta." />
          <FeatureCard color="red" icon={TrendingDown} title="Cobros duplicados" description="Misma operación cobrada dos veces en una ventana de 7 días. Detectado por reglas determinísticas antes de que pase desapercibido." />
        </div>
      </Section>

      {/* ═══════════════════════════ TESTIMONIOS ═══════════════════════════ */}
      <Section bg="light">
        <SectionTitle subtitle="Miles de pymes chilenas ya están recuperando su plata">
          Lo que dicen <HighlightWord color="#10b981">nuestros usuarios</HighlightWord>
        </SectionTitle>
        <div className="grid md:grid-cols-3 gap-6">
          <TestimonialCard
            quote="Encontré $320.000 en comisiones duplicadas en un solo estado de cuenta. El banco me las reversó en 5 días. Increíble."
            name="Rodrigo Muñoz"
            role="Dueño"
            company="Carnicería El Novillo"
          />
          <TestimonialCard
            quote="Como contador, analizo estados de cuenta de 15 clientes. CobroDetector me ahorra horas de revisión manual. Es indispensable."
            name="Carolina Vásquez"
            role="Contadora"
            company="CV Asesorías"
          />
          <TestimonialCard
            quote="No tenía idea que MiPyme podía tener cobros indebidos. En 3 minutos subí mi cartola y detecté $85.000 en cargos que no correspondían."
            name="Felipe Rojas"
            role="Fundador"
            company="Rojas Digital"
          />
        </div>
      </Section>

      {/* ═══════════════════════════ PRECIOS ═══════════════════════════ */}
      <Section bg="white" id="precios">
        <SectionTitle subtitle="Planes flexibles. Sin letra chica. Créditos sin vencimiento.">
          Planes <HighlightWord color="#4c6ef5">simples</HighlightWord> y transparentes
        </SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          <PricingCard name="Inicial" price="$20.000" credits="1 análisis" features={['1 análisis de estado de cuenta', 'Detección con IA', 'Reporte descargable', 'Soporte por email']} cta="Comenzar" color="blue" />
          <PricingCard name="Plus" price="$30.000" originalPrice="$40.000" credits="2 análisis" highlighted features={['2 análisis de estados de cuenta', 'Carta de reclamo para el banco', 'Soporte prioritario', 'Todo lo del plan Inicial']} cta="Elegir Plus" color="blue" />
          <PricingCard name="Contador" price="$100.000" originalPrice="$200.000" credits="10 análisis" features={['10 análisis de estados de cuenta', 'O el 20% de lo que recuperes', 'Multi-empresa', 'Soporte telefónico']} cta="Elegir Contador" color="blue" />
          <PricingCard name="Platino" price="20%" prefix="Solo" suffix="de lo recuperado" credits="Ilimitados" features={['Análisis ilimitados', 'Pago contra resultados', 'Reporte legal completo', 'Soporte dedicado']} cta="Comenzar gratis" color="blue" />
        </div>
      </Section>

      {/* ═══════════════════════════ FAQ ═══════════════════════════ */}
      <Section bg="light">
        <SectionTitle subtitle="Respuestas a las preguntas más comunes">
          Preguntas <HighlightWord color="#4c6ef5">frecuentes</HighlightWord>
        </SectionTitle>
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
      </Section>

      {/* ═══════════════════════════ TRUST BADGES ═══════════════════════════ */}
      <Section bg="white">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tecnología que respalda nuestro servicio</p>
        </div>
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
      </Section>

      {/* ═══════════════════════════ FINAL CTA ═══════════════════════════ */}
      <section className="bg-[#0f172a] py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#4c6ef5]/10 via-transparent to-[#10b981]/10" />
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 relative text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white leading-tight tracking-tight max-w-2xl mx-auto">
            ¿Listo para descubrir si tu banco te debe <span className="relative inline-block"><span className="relative z-10 text-[#10b981]">plata</span><span className="absolute inset-0 z-0 rounded-xl opacity-25" style={{ backgroundColor: '#10b981', transform: 'rotate(-2deg) scale(1.08)' }} /></span>?
          </h2>
          <p className="mt-5 text-lg text-gray-400 max-w-md mx-auto">El primer análisis toma 3 minutos. Sin compromiso. Sin costo hasta que recuperes.</p>
          <div className="mt-8">
            <PillButton variant="teal">
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

      {/* ═══════════════════════════ FOOTER ═══════════════════════════ */}
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
