import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'
import { TOPIC_COLORS, TOPIC_ID_ICONS } from '../theme'
import styles from './Home.module.css'

const DATE_OPTIONS = [
  { value: 'all',   label: 'Все время' },
  { value: 'today', label: 'Сегодня' },
  { value: 'week',  label: 'Последние 7 дней' },
  { value: 'month', label: 'Этот месяц' },
  { value: 'year',  label: 'Этот год' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  if (diffDays < 7)  return `${diffDays} дня назад`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function scoreColor(pct) {
  if (pct === null || pct === undefined) return 'var(--color-text-secondary)'
  if (pct >= 70) return 'var(--color-success)'
  if (pct >= 40) return 'var(--color-warning)'
  return 'var(--color-error)'
}

function filterByDate(list, period) {
  if (period === 'all') return list
  const now = new Date()
  return list.filter(s => {
    if (!s.finished_at) return false
    const d = new Date(s.finished_at)
    if (period === 'today') return d.toDateString() === now.toDateString()
    if (period === 'week')  { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w }
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (period === 'year')  return d.getFullYear() === now.getFullYear()
    return true
  })
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent }) {
  return (
    <div className={styles.metricCard}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue} style={accent ? { color: accent } : {}}>
        {value ?? '—'}
      </span>
      {sub && <span className={styles.metricSub}>{sub}</span>}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const { data, loading, error }               = useAsync(() => api.get('/dashboard'))
  const { data: sessions, loading: sessLoading } = useAsync(() => api.get('/sessions/detailed'))
  const { data: topics }                       = useAsync(() => api.get('/topics'))

  const [activeTopicId, setActiveTopicId] = useState('all')
  const [datePeriod, setDatePeriod]       = useState('all')

  const usedTopicIds = useMemo(() => {
    if (!sessions) return []
    return [...new Set(sessions.map(s => s.topic_id))]
  }, [sessions])

  const topicsMap = useMemo(() => {
    if (!topics) return {}
    return Object.fromEntries(topics.map(t => [t.id, t.name]))
  }, [topics])

  const filteredSessions = useMemo(() => {
    if (!sessions) return []
    let result = activeTopicId === 'all' ? sessions : sessions.filter(s => s.topic_id === activeTopicId)
    return filterByDate(result, datePeriod)
  }, [sessions, activeTopicId, datePeriod])

  return (
    <>
      <PageHeader title="Главная" />

      <div className={styles.content}>

        {/* Metrics row */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Дашборд</h2>
          <div className={styles.metrics}>
            {loading ? (
              <div className={styles.skeleton3} />
            ) : error ? (
              <p className={styles.errorText}>Ошибка загрузки</p>
            ) : (
              <>
                <MetricCard
                  label="Пройдено тестов"
                  value={data.total_sessions}
                  sub={`из ${data.total_tests} доступных`}
                />
                <MetricCard
                  label="Правильных ответов"
                  value={data.avg_correct_pct !== null ? `${data.avg_correct_pct}%` : '—'}
                  sub="средний показатель"
                  accent={scoreColor(data.avg_correct_pct)}
                />
                <MetricCard
                  label="Последний тест"
                  value={data.last_session?.test_title ?? 'Нет данных'}
                  sub={data.last_session ? formatDate(data.last_session.finished_at) : undefined}
                />
              </>
            )}
          </div>
        </section>

        {/* Recent sessions */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Последние прохождения</h2>

          {/* Filters */}
          {!sessLoading && sessions?.length > 0 && (
            <div className={styles.filterBar}>
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTopicId === 'all' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTopicId('all')}
                >
                  Все ({sessions.length})
                </button>
                {usedTopicIds.map(id => {
                  const count = sessions.filter(s => s.topic_id === id).length
                  const color = TOPIC_COLORS[id] ?? '#6b7280'
                  return (
                    <button
                      key={id}
                      className={`${styles.tab} ${activeTopicId === id ? styles.tabActive : ''}`}
                      style={activeTopicId === id ? { borderColor: color, color } : {}}
                      onClick={() => setActiveTopicId(id)}
                    >
                      {TOPIC_ID_ICONS[id]} {topicsMap[id] ?? id} ({count})
                    </button>
                  )
                })}
              </div>
              <select
                className={styles.dateSelect}
                value={datePeriod}
                onChange={e => setDatePeriod(e.target.value)}
              >
                {DATE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {(loading || sessLoading) && <div className={styles.skeletonList} />}
          {error && <p className={styles.errorText}>Ошибка загрузки данных</p>}

          {!loading && !sessLoading && !error && sessions?.length === 0 && (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📋</span>
              <p className={styles.emptyTitle}>Тестов пока не пройдено</p>
              <p className={styles.emptySub}>Перейдите в раздел «Тесты», чтобы начать</p>
              <button
                className={styles.emptyBtn}
                onClick={() => navigate('/tests')}
              >
                Перейти к тестам →
              </button>
            </div>
          )}

          {!loading && !sessLoading && !error && sessions?.length > 0 && filteredSessions.length === 0 && (
            <p className={styles.noMatch}>Нет прохождений по выбранным фильтрам</p>
          )}

          {!loading && !sessLoading && !error && filteredSessions.length > 0 && (
            <div className={styles.sessionCards}>
              {filteredSessions.map(s => {
                const topicColor = TOPIC_COLORS[s.topic_id] ?? '#6b7280'
                const dotColor   = scoreColor(s.correct_pct)
                const icon       = TOPIC_ID_ICONS[s.topic_id] ?? '📋'
                return (
                  <button
                    key={s.session_id}
                    className={styles.sessionCard}
                    style={{ '--tc': topicColor }}
                    onClick={() => navigate(`/results/${s.session_id}`)}
                  >
                    {/* Left accent */}
                    <div className={styles.cardAccent} style={{ background: topicColor }} />

                    {/* Icon circle */}
                    <div
                      className={styles.cardIcon}
                      style={{ background: topicColor + '18', color: topicColor }}
                    >
                      {icon}
                    </div>

                    {/* Text */}
                    <div className={styles.cardBody}>
                      <span className={styles.cardTitle}>{s.test_title}</span>
                      <span className={styles.cardMeta}>
                        <span
                          className={styles.cardTopic}
                          style={{ color: topicColor }}
                        >
                          {s.topic_name}
                        </span>
                        <span className={styles.cardDot}>·</span>
                        <span>{formatDate(s.finished_at)}</span>
                      </span>
                    </div>

                    {/* Score badge */}
                    <div className={styles.cardScore}>
                      <span
                        className={styles.cardPct}
                        style={{ color: dotColor }}
                      >
                        {s.correct_pct}%
                      </span>
                      <span className={styles.cardFraction}>
                        {s.correct}/{s.total}
                      </span>
                    </div>

                    {/* Chevron */}
                    <span className={styles.cardChevron}>›</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </>
  )
}
