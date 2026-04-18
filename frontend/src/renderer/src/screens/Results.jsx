import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'
import { TOPIC_COLORS, TOPIC_ID_ICONS } from '../theme'
import styles from './Results.module.css'

const DATE_OPTIONS = [
  { value: 'all',   label: 'Все время' },
  { value: 'today', label: 'Сегодня' },
  { value: 'week',  label: 'Последние 7 дней' },
  { value: 'month', label: 'Этот месяц' },
  { value: 'year',  label: 'Этот год' },
]

function scoreColor(pct) {
  if (pct >= 70) return 'var(--color-success)'
  if (pct >= 40) return 'var(--color-warning)'
  return 'var(--color-error)'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
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

export default function Results() {
  const navigate = useNavigate()
  const [activeTopicId, setActiveTopicId] = useState('all')
  const [datePeriod, setDatePeriod]       = useState('all')

  const { data: sessions, loading, error } = useAsync(
    () => api.get('/sessions/detailed')
  )
  const { data: topics } = useAsync(() => api.get('/topics'))

  // Build topic filter tabs from sessions that actually have data
  const usedTopicIds = useMemo(() => {
    if (!sessions) return []
    return [...new Set(sessions.map(s => s.topic_id))]
  }, [sessions])

  const filtered = useMemo(() => {
    if (!sessions) return []
    let result = activeTopicId === 'all' ? sessions : sessions.filter(s => s.topic_id === activeTopicId)
    return filterByDate(result, datePeriod)
  }, [sessions, activeTopicId, datePeriod])

  const topicsMap = useMemo(() => {
    if (!topics) return {}
    return Object.fromEntries(topics.map(t => [t.id, t.name]))
  }, [topics])

  return (
    <>
      <PageHeader title="Мои результаты" />

      <div className={styles.content}>

        {/* Filters */}
        {!loading && sessions?.length > 0 && (
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

        {/* States */}
        {loading && <div className={styles.skeleton} />}
        {error   && <p className={styles.errorText}>Ошибка загрузки: {error}</p>}

        {!loading && !error && sessions?.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🏆</span>
            <p className={styles.emptyTitle}>Результатов пока нет</p>
            <p className={styles.emptySub}>Пройдите первый тест, чтобы увидеть статистику</p>
            <button className={styles.emptyBtn} onClick={() => navigate('/tests')}>
              Перейти к тестам →
            </button>
          </div>
        )}

        {/* Results list */}
        {!loading && !error && filtered.length > 0 && (
          <div className={styles.list}>
            {filtered.map(s => {
              const topicColor = TOPIC_COLORS[s.topic_id] ?? '#6b7280'
              const sColor     = scoreColor(s.correct_pct)
              const icon       = TOPIC_ID_ICONS[s.topic_id] ?? '📋'

              return (
                <div key={s.session_id} className={styles.row}>

                  {/* Score circle */}
                  <div
                    className={styles.scoreCircle}
                    style={{ borderColor: sColor, color: sColor }}
                  >
                    <span className={styles.scoreNum}>{s.correct_pct}</span>
                    <span className={styles.scorePct}>%</span>
                  </div>

                  {/* Main info */}
                  <div className={styles.info}>
                    <span className={styles.testTitle}>{s.test_title}</span>
                    <div className={styles.meta}>
                      <span
                        className={styles.topicBadge}
                        style={{ background: topicColor + '18', color: topicColor }}
                      >
                        {icon} {s.topic_name}
                      </span>
                      <span className={styles.metaDot}>·</span>
                      <span className={styles.date}>{formatDate(s.finished_at)}</span>
                      <span className={styles.metaDot}>·</span>
                      <span className={styles.fraction} style={{ color: sColor }}>
                        {s.correct} из {s.total} верно
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    className={styles.reviewBtn}
                    onClick={() => navigate(`/results/${s.session_id}`)}
                  >
                    Посмотреть разбор
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* No matches for filter */}
        {!loading && !error && sessions?.length > 0 && filtered.length === 0 && (
          <p className={styles.noMatch}>Нет прохождений по выбранным фильтрам</p>
        )}

      </div>
    </>
  )
}
