import React, { useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'
import { TOPIC_COLORS, TOPIC_ID_ICONS } from '../theme'
import { CONFIG } from '../config'
import styles from './Reports.module.css'

function scoreColor(pct) {
  if (pct >= 70) return 'var(--color-success)'
  if (pct >= 40) return 'var(--color-warning)'
  return 'var(--color-error)'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

export default function Reports() {
  const [selectedId, setSelectedId] = useState(null)
  const [format, setFormat]         = useState('pdf')
  const [downloading, setDownloading] = useState(false)
  const [dlError, setDlError]       = useState(null)

  const { data: sessions, loading, error } = useAsync(
    () => api.get('/sessions/detailed')
  )

  const selected = useMemo(
    () => sessions?.find(s => s.session_id === selectedId) ?? null,
    [sessions, selectedId]
  )

  async function handleDownload() {
    if (!selectedId) return
    setDlError(null)
    setDownloading(true)
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedId, format })
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.detail ?? `Ошибка ${res.status}`)
      }
      const blob = await res.blob()
      const ext  = format === 'pdf' ? 'pdf' : 'docx'
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `report_${selectedId}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setDlError(e.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <PageHeader title="Отчёты" />

      <div className={styles.content}>

        {/* ── Loading / error states ── */}
        {loading && <div className={styles.skeleton} />}
        {error   && <p className={styles.errorText}>Ошибка загрузки: {error}</p>}

        {/* ── Empty state ── */}
        {!loading && !error && sessions?.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📄</span>
            <p className={styles.emptyTitle}>Нет прохождений</p>
            <p className={styles.emptySub}>Сначала пройдите хотя бы один тест</p>
          </div>
        )}

        {/* ── Main layout ── */}
        {!loading && !error && sessions?.length > 0 && (
          <div className={styles.layout}>

            {/* Session list */}
            <div className={styles.sessionList}>
              <p className={styles.listLabel}>Выберите прохождение</p>
              {sessions.map(s => {
                const topicColor = TOPIC_COLORS[s.topic_id] ?? '#6b7280'
                const icon       = TOPIC_ID_ICONS[s.topic_id] ?? '📋'
                const isActive   = s.session_id === selectedId
                return (
                  <button
                    key={s.session_id}
                    className={`${styles.sessionRow} ${isActive ? styles.sessionRowActive : ''}`}
                    style={isActive ? { '--tc': topicColor } : {}}
                    onClick={() => { setSelectedId(s.session_id); setDlError(null) }}
                  >
                    <span
                      className={styles.rowIcon}
                      style={{ background: topicColor + '20', color: topicColor }}
                    >
                      {icon}
                    </span>
                    <div className={styles.rowInfo}>
                      <span className={styles.rowTitle}>{s.test_title}</span>
                      <span className={styles.rowMeta}>{formatDate(s.finished_at)}</span>
                    </div>
                    <span
                      className={styles.rowScore}
                      style={{ color: scoreColor(s.correct_pct) }}
                    >
                      {s.correct_pct}%
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Right panel */}
            <div className={styles.rightPanel}>
              {!selected && (
                <div className={styles.noSelection}>
                  <span className={styles.noSelIcon}>📋</span>
                  <p>Выберите прохождение из списка слева</p>
                </div>
              )}

              {selected && (
                <>
                  {/* Preview card */}
                  <div className={styles.previewCard}>
                    <p className={styles.previewLabel}>Прохождение</p>
                    <h3 className={styles.previewTitle}>{selected.test_title}</h3>
                    <div className={styles.previewMeta}>
                      <span
                        className={styles.topicBadge}
                        style={{
                          background: (TOPIC_COLORS[selected.topic_id] ?? '#6b7280') + '20',
                          color: TOPIC_COLORS[selected.topic_id] ?? '#6b7280'
                        }}
                      >
                        {TOPIC_ID_ICONS[selected.topic_id] ?? '📋'} {selected.topic_name}
                      </span>
                      <span className={styles.previewDate}>{formatDate(selected.finished_at)}</span>
                    </div>
                    <div className={styles.scoreRow}>
                      <span
                        className={styles.scoreBig}
                        style={{ color: scoreColor(selected.correct_pct) }}
                      >
                        {selected.correct_pct}%
                      </span>
                      <span className={styles.scoreFrac}>
                        {selected.correct} из {selected.total} верно
                      </span>
                    </div>
                  </div>

                  {/* Format selector */}
                  <div className={styles.formatSection}>
                    <p className={styles.formatLabel}>Формат отчёта</p>
                    <div className={styles.formatToggle}>
                      {[
                        { val: 'pdf',  label: 'PDF',  icon: '📕' },
                        { val: 'docx', label: 'Word', icon: '📘' }
                      ].map(f => (
                        <button
                          key={f.val}
                          className={`${styles.formatBtn} ${format === f.val ? styles.formatBtnActive : ''}`}
                          onClick={() => setFormat(f.val)}
                        >
                          <span className={styles.formatIcon}>{f.icon}</span>
                          <span>{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Download */}
                  {dlError && <p className={styles.dlError}>{dlError}</p>}
                  <button
                    className={styles.downloadBtn}
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading
                      ? 'Формируем отчёт…'
                      : `Скачать ${format.toUpperCase()}`}
                  </button>

                  <p className={styles.hint}>
                    Отчёт включает все вопросы, ответы студента, правильные ответы и пояснения.
                  </p>
                </>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  )
}
