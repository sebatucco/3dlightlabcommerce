'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Clock3, RefreshCw, Route } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-AR')
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-AR')
  } catch {
    return String(value)
  }
}

function MetricCard({ label, value, hint, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#5e89a6]">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-[#143047]">{value}</p>
          {hint ? <p className="mt-2 text-xs text-[#6d7e8b]">{hint}</p> : null}
        </div>
        <div className="rounded-2xl bg-[#f8f3ea] p-3 text-[#143047]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function AlertBadge({ status }) {
  if (status === 'critical') {
    return <span className="rounded-full bg-[#fff1ef] px-3 py-1 text-xs font-bold text-[#b44a42]">CRITICAL</span>
  }
  if (status === 'warn') {
    return <span className="rounded-full bg-[#fff7e8] px-3 py-1 text-xs font-bold text-[#9a6700]">WARN</span>
  }
  return <span className="rounded-full bg-[#ecf8f4] px-3 py-1 text-xs font-bold text-[#0f6d5f]">OK</span>
}

export default function AdminMetricasPage() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadMetrics() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/metrics', { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudieron obtener las métricas')
      }

      setMetrics(data)
    } catch (err) {
      setError(err.message || 'Error obteniendo métricas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  const topSlowRoutes = useMemo(() => {
    const routes = Array.isArray(metrics?.routes) ? metrics.routes : []
    return [...routes].sort((a, b) => (b.avgDurationMs || 0) - (a.avgDurationMs || 0)).slice(0, 5)
  }, [metrics])

  const topErrorRoutes = useMemo(() => {
    const routes = Array.isArray(metrics?.routes) ? metrics.routes : []
    return [...routes].sort((a, b) => (b.errorRate || 0) - (a.errorRate || 0)).slice(0, 5)
  }, [metrics])

  const statusDistribution = useMemo(() => {
    const recent = Array.isArray(metrics?.recent) ? metrics.recent : []
    const grouped = recent.reduce((acc, item) => {
      const status = Number(item?.status || 0)
      const key = status >= 500 ? '5xx' : status >= 400 ? '4xx' : status >= 300 ? '3xx' : '2xx'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return ['2xx', '3xx', '4xx', '5xx'].map((name) => ({ name, value: grouped[name] || 0 }))
  }, [metrics])

  const requestsTimeline = useMemo(() => {
    const recent = Array.isArray(metrics?.recent) ? metrics.recent : []
    const buckets = new Map()

    for (const item of recent) {
      const date = new Date(item?.ts)
      if (Number.isNaN(date.getTime())) continue
      const key = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      const prev = buckets.get(key) || { minute: key, requests: 0, errors: 0 }
      prev.requests += 1
      if (Number(item?.status || 0) >= 400) prev.errors += 1
      buckets.set(key, prev)
    }

    return Array.from(buckets.values()).slice(-20)
  }, [metrics])

  const slowRoutesChart = useMemo(
    () => topSlowRoutes.map((route) => ({ route: `${route.method} ${route.route}`, avg: route.avgDurationMs || 0 })),
    [topSlowRoutes]
  )

  const errorRoutesChart = useMemo(
    () => topErrorRoutes.map((route) => ({ route: `${route.method} ${route.route}`, errorRate: route.errorRate || 0 })),
    [topErrorRoutes]
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5efe3] p-10 text-[#143047]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#5e89a6]">
          Cargando métricas...
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5e89a6]">
              Administración
            </p>
            <h1 className="mt-2 text-4xl font-extrabold">Métricas de API</h1>
            <p className="mt-2 text-sm text-[#6d7e8b]">
              Última actualización: {formatDate(metrics?.generatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => (window.location.href = '/admin')}
              className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold text-[#143047] hover:bg-[#f8f3ea]"
            >
              ← Volver
            </button>
            <button
              type="button"
              onClick={loadMetrics}
              className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold text-[#143047] hover:bg-[#f8f3ea]"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-3xl border border-[#f2c7c2] bg-[#fff1ef] px-5 py-4 text-sm text-[#b44a42]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Requests totales"
            value={formatNumber(metrics?.totalRequests)}
            hint="Desde el arranque del proceso"
            icon={Activity}
          />
          <MetricCard
            label="Rutas observadas"
            value={formatNumber(metrics?.routeCount)}
            hint="Cantidad de endpoints activos"
            icon={Route}
          />
          <MetricCard
            label="Muestras recientes"
            value={formatNumber(metrics?.recent?.length || 0)}
            hint="Buffer en memoria"
            icon={Clock3}
          />
          <MetricCard
            label="Rutas con error"
            value={formatNumber((metrics?.routes || []).filter((r) => r.errorCount > 0).length)}
            hint="Con al menos 1 error HTTP"
            icon={AlertTriangle}
          />
        </div>

        {metrics?.persisted?.enabled ? (
          <div className="mt-4 rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#5e89a6]">Persistencia Supabase (24h)</p>
              <AlertBadge status={metrics?.alerts?.persisted?.status} />
            </div>
            <p className="mt-2 text-sm text-[#4e6475]">
              Requests: <strong>{formatNumber(metrics?.persisted?.totalRequests || 0)}</strong>
              {' · '}
              Rutas: <strong>{formatNumber((metrics?.persisted?.routes || []).length)}</strong>
              {' · '}
              Actualizado: <strong>{formatDate(metrics?.persisted?.generatedAt)}</strong>
            </p>
            {(metrics?.alerts?.persisted?.criticalRoutes || []).length > 0 ? (
              <p className="mt-2 text-sm text-[#b44a42]">
                Rutas críticas: {(metrics.alerts.persisted.criticalRoutes || []).slice(0, 3).map((r) => `${r.method} ${r.route}`).join(' · ')}
              </p>
            ) : null}
            {metrics?.persisted?.error ? (
              <p className="mt-2 text-sm text-[#b44a42]">{metrics.persisted.error}</p>
            ) : null}
          </div>
        ) : null}

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#143047]">Top latencia promedio</h2>
            <div className="mt-4 space-y-3">
              {topSlowRoutes.length === 0 ? (
                <p className="text-sm text-[#6d7e8b]">Sin datos todavía.</p>
              ) : (
                topSlowRoutes.map((route) => (
                  <div key={`${route.method}-${route.route}`} className="rounded-2xl bg-[#f8f3ea] p-4">
                    <p className="text-sm font-semibold text-[#143047]">{route.method} {route.route}</p>
                    <p className="mt-1 text-sm text-[#4e6475]">
                      Promedio: <strong>{route.avgDurationMs} ms</strong> · Máximo: {route.maxDurationMs} ms
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#143047]">Top error rate</h2>
            <div className="mt-4 space-y-3">
              {topErrorRoutes.length === 0 ? (
                <p className="text-sm text-[#6d7e8b]">Sin datos todavía.</p>
              ) : (
                topErrorRoutes.map((route) => (
                  <div key={`${route.method}-${route.route}`} className="rounded-2xl bg-[#f8f3ea] p-4">
                    <p className="text-sm font-semibold text-[#143047]">{route.method} {route.route}</p>
                    <p className="mt-1 text-sm text-[#4e6475]">
                      Error rate: <strong>{route.errorRate}%</strong> · Errores: {route.errorCount} / {route.count}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#143047]">Distribución de status (buffer)</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                    {statusDistribution.map((entry) => {
                      const color = entry.name === '2xx' ? '#0f6d5f' : entry.name === '3xx' ? '#5e89a6' : entry.name === '4xx' ? '#e28b3e' : '#b44a42'
                      return <Cell key={entry.name} fill={color} />
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#143047]">Requests por minuto (últimas muestras)</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={requestsTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6dcc8" />
                  <XAxis dataKey="minute" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="requests" stroke="#143047" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="errors" stroke="#b44a42" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#143047]">Latencia promedio por ruta (Top 5)</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slowRoutesChart} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6dcc8" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="route" width={180} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#5e89a6" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#143047]">Error rate por ruta (Top 5)</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errorRoutesChart} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6dcc8" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="route" width={180} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="errorRate" fill="#b44a42" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-[#143047]">Últimas requests</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#e6dcc8] text-left text-[#5e89a6]">
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Método</th>
                  <th className="px-3 py-2 font-semibold">Ruta</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Duración</th>
                </tr>
              </thead>
              <tbody>
                {(metrics?.recent || []).slice(-50).reverse().map((item, index) => (
                  <tr key={`${item.ts}-${item.route}-${index}`} className="border-b border-[#f1e9d9]">
                    <td className="px-3 py-2">{formatDate(item.ts)}</td>
                    <td className="px-3 py-2 font-semibold">{item.method}</td>
                    <td className="px-3 py-2">{item.route}</td>
                    <td className="px-3 py-2">{item.status}</td>
                    <td className="px-3 py-2">{item.durationMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
