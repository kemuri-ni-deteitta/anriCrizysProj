import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'
import { TOPIC_COLORS, TOPIC_ID_ICONS } from '../theme'
import styles from './Calendar.module.css'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const MONTHS_RU = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
]

function scoreColor(pct) {
  if (pct >= 70) return 'var(--color-success)'
  if (pct >= 40) return 'var(--color-warning)'
  return 'var(--color-error)'
}

// Build a 6×7 grid of Date|null for a given year/month
function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  // Monday-based: 0=Mon … 6=Sun
  let startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function isoDate(date) {
  return date.toISOString().slice(0, 10) // "YYYY-MM-DD"
}

export default function Calendar() {
  const navigate  = useNavigate()
  const today     = new Date()

  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(null) // "YYYY-MM-DD" | null

  const { data: sessions, loading, error } = useAsync(
    () => api.get('/sessions/detailed')
  )

  // Group sessions by date string "YYYY-MM-DD"
  const sessionsByDate = useMemo(() => {
    if (!sessions) return {}
    const map = {}
    for (const s of sessions) {
      const d = s.finished_at?.slice(0, 10)
      if (!d) continue
      if (!map[d]) map[d] = []
      map[d].push(s)
    }
    return map
  }, [sessions])

  const cells        = buildCalendarGrid(year, month)
  const todayStr     = isoDate(today)
  const selectedSessions = selectedDay ? (sessionsByDate[selectedDay] ?? []) : []

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  function handleDayClick(date) {
    const str = isoDate(date)
    setSelectedDay(prev => prev === str ? null : str)
  }

  return (
    <>
      <PageHeader title="Календарь" />

      <div className={styles.content}>
        <div className={styles.layout}>

          {/* Calendar panel */}
          <div className={styles.calPanel}>

            {/* Month navigation */}
            <div className={styles.navRow}>
              <button className={styles.navBtn} onClick={prevMonth}>‹</button>
              <h2 className={styles.monthTitle}>
                {MONTHS_RU[month]} {year}
              </h2>
              <button className={styles.navBtn} onClick={nextMonth}>›</button>
            </div>

            {/* Weekday headers */}
            <div className={styles.grid7}>
              {WEEKDAYS.map(d => (
                <div key={d} className={styles.weekday}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            {loading ? (
              <div className={styles.skeleton} />
            ) : (
              <div className={styles.grid7}>
                {cells.map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} className={styles.emptyCell} />

                  const str       = isoDate(date)
                  const isToday   = str === todayStr
                  const daySess   = sessionsByDate[str] ?? []
                  const hasData   = daySess.length > 0
                  const isSelected = str === selectedDay

                  // pick dominant color: best score of the day
                  const bestPct = hasData
                    ? Math.max(...daySess.map(s => s.correct_pct))
                    : null

                  return (
                    <button
                      key={str}
                      className={`
                        ${styles.dayCell}
                        ${isToday    ? styles.dayCellToday    : ''}
                        ${hasData    ? styles.dayCellHasData  : ''}
                        ${isSelected ? styles.dayCellSelected : ''}
                      `}
                      onClick={() => hasData && handleDayClick(date)}
                      disabled={!hasData}
                      title={hasData ? `${daySess.length} прохожд.` : undefined}
                    >
                      <span className={styles.dayNum}>{date.getDate()}</span>
                      {hasData && (
                        <span
                          className={styles.dayDot}
                          style={{ background: scoreColor(bestPct) }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Legend */}
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: 'var(--color-success)' }} />
                ≥70%
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: 'var(--color-warning)' }} />
                40–69%
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: 'var(--color-error)' }} />
                &lt;40%
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendToday} />
                Сегодня
              </span>
            </div>
          </div>

          {/* Day detail panel */}
          <div className={styles.detailPanel}>
            {!selectedDay && (
              <div className={styles.detailEmpty}>
                <span className={styles.detailEmptyIcon}>📅</span>
                <p>Выберите день с прохождением</p>
              </div>
            )}

            {selectedDay && selectedSessions.length === 0 && (
              <div className={styles.detailEmpty}>
                <p>Нет прохождений в этот день</p>
              </div>
            )}

            {selectedDay && selectedSessions.length > 0 && (
              <>
                <h3 className={styles.detailTitle}>
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long'
                  })}
                </h3>
                <div className={styles.detailList}>
                  {selectedSessions.map(s => {
                    const topicColor = TOPIC_COLORS[s.topic_id] ?? '#6b7280'
                    const sColor     = scoreColor(s.correct_pct)
                    const icon       = TOPIC_ID_ICONS[s.topic_id] ?? '📋'
                    return (
                      <button
                        key={s.session_id}
                        className={styles.detailCard}
                        onClick={() => navigate(`/results/${s.session_id}`)}
                      >
                        <div
                          className={styles.detailIcon}
                          style={{ background: topicColor + '18', color: topicColor }}
                        >
                          {icon}
                        </div>
                        <div className={styles.detailInfo}>
                          <span className={styles.detailTestTitle}>{s.test_title}</span>
                          <span
                            className={styles.detailTopicName}
                            style={{ color: topicColor }}
                          >
                            {s.topic_name}
                          </span>
                        </div>
                        <div className={styles.detailScore} style={{ color: sColor }}>
                          {s.correct_pct}%
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
