import Link from 'next/link'
import { Shield, TrendingDown, FileSearch, ChevronRight, CheckCircle2, Banknote } from 'lucide-react'
import { PLANS } from '@/lib/plans'
import { formatCLP } from '@/lib/utils'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">CobroDetector</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#precios" className="text-sm text-gray-600 hover:text-gray-900">Precios</Link>
            <Link href="/login" className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
          <Banknote className="w-4 h-4" />
          <span>Recupera lo que el banco te cobra de más</span>
        </div>

        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Tu banco te puede estar<br />
          <span className="text-blue-600">cobrando de más sin que lo sepas</span>
        </h1>

        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Sube tu estado de cuenta y nuestra IA detecta comisiones duplicadas,
          errores en cuotas y cargos no reconocidos en minutos.
          Genera el reporte para reclamar al banco.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link href="/login" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            Analizar gratis ahora
            <ChevronRight className="w-4 h-4" />
          </Link>
          <span className="text-sm text-gray-400">Sin tarjeta de crédito · 1 análisis gratis</span>
        </div>

        {/* Prueba social */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          {[
            { value: '$500.000+', label: 'Recuperado en promedio' },
            { value: '3 min', label: 'Tiempo de análisis' },
            { value: '97%', label: 'Precisión de detección' },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Historia real */}
      <section className="bg-amber-50 border-y border-amber-100 py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex gap-4">
            <div className="w-1 bg-amber-400 rounded-full flex-shrink-0"></div>
            <div>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                &ldquo;Revisé los 300 pagos con tarjeta de mi carnicería y descubrí que el Banco Santander me cobraba la comisión de crédito en <strong>cada cuota</strong>, cuando solo debía cobrarse una vez. Fui al banco con el reporte y me devolvieron <strong>$500.000 CLP</strong>.&rdquo;
              </p>
              <p className="text-sm text-gray-500 font-medium">— Rodrigo, dueño de carnicería · Rancagua, Chile</p>
              <p className="text-sm text-amber-700 mt-1">Historia real que inspiró CobroDetector</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Cómo funciona</h2>
        <p className="text-gray-500 text-center mb-12">Tres pasos para recuperar tu dinero</p>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: FileSearch,
              step: '01',
              title: 'Sube tu estado de cuenta',
              desc: 'PDF o Excel del banco. Compatible con Santander, BCI, Banco de Chile, BancoEstado y más.',
            },
            {
              icon: Shield,
              step: '02',
              title: 'La IA detecta anomalías',
              desc: 'Analizamos cada transacción buscando comisiones duplicadas, errores en cuotas y cargos sospechosos.',
            },
            {
              icon: TrendingDown,
              step: '03',
              title: 'Descarga el reporte y reclama',
              desc: 'Genera un reporte PDF listo para presentar al banco. Incluye evidencia detallada de cada cobro incorrecto.',
            },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-xs font-mono text-blue-400 mb-2">{item.step}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Qué detectamos */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Lo que detectamos</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Comisión de crédito duplicada',
                desc: 'La comisión de apertura se cobra una sola vez. Si aparece en cada cuota mensual, es un cobro injustificado.',
                color: 'red',
              },
              {
                title: 'Error en cuotas sin interés',
                desc: 'Ventas pactadas en cuotas sin interés que incluyen intereses o tienen montos inconsistentes.',
                color: 'amber',
              },
              {
                title: 'Cargos no reconocidos',
                desc: 'Cargos con descripción genérica o en código que no se pueden asociar a ninguna operación real.',
                color: 'blue',
              },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className={`w-2 h-2 rounded-full mb-4 ${item.color === 'red' ? 'bg-red-500' : item.color === 'amber' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Precios simples</h2>
        <p className="text-gray-500 text-center mb-12">Pago único por análisis. Sin suscripción. Sin sorpresas.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div key={plan.key} className={`rounded-2xl border p-8 ${plan.highlighted
              ? 'border-blue-500 ring-1 ring-blue-500 bg-white relative'
              : 'border-gray-200 bg-white'
            }`}>
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Más popular
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500 mb-1">{plan.name}</p>
                <p className="text-4xl font-bold text-gray-900">{formatCLP(plan.price)}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {formatCLP(plan.pricePerAnalysis)} por análisis · {plan.credits} créditos
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/login" className={`block text-center py-3 rounded-xl font-medium text-sm transition-colors ${plan.highlighted
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}>
                Comenzar
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Todos los planes incluyen 1 análisis gratis al registrarte. Los créditos no vencen.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <Shield className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-900">CobroDetector</span>
          </div>
          <p className="text-xs text-gray-400">© 2024 · Hecho en Chile para emprendedores chilenos</p>
        </div>
      </footer>
    </div>
  )
}
