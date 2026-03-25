import React from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'
import { TOPIC_COLORS } from '../theme'
import PageHeader from '../components/PageHeader/PageHeader'
import Loading from './Loading'
import styles from './TestResults.module.css'

export default function TestResults() {
  const { sessionId } = useParams()
  const navigate      = useNavigate()
  const location      = useLocation()

  // Prefer data passed via navigation state (instant), fallback to API fetch
  const { data: sessionData, loading: sLoading } = useAsync(
    () => location.state?.session ? Promise.resolve(location.state.session) : api.get(`/sessions/${sessionId}`),
    [sessionId]
  )
  const { data: testData, loading: tLoading } = useAsync(
    () => location.state?.test ? Promise.resolve(location.state.test) : api.get(`/tests/${sessionData?.test_id}`),
    [sessionData?.test_id]
  )

  if (sLoading || tLoading || !sessionData || !testData) return <Loading />

  const session  = sessionData
  const test     = testData
  const color    = TOPIC_COLORS[test.topic_id] ?? 'var(--color-accent)'

  // Build answer map
  const answerMap = {}
  for (const a of session.answers) {
    answerMap[a.question_id] = a
  }

  // Calculate score
  let correctCount = 0
  for (const q of test.questions) {
    const correctIds = new Set(q.answers.filter(a => a.is_correct).map(a => a.id))
    const selected   = new Set(answerMap[q.id]?.selected_answer_ids ?? [])
    if (correctIds.size === selected.size && [...correctIds].every(id => selected.has(id))) {
      correctCount++
    }
  }
  const total   = test.questions.length
  const pct     = total ? Math.round(correctCount / total * 100) : 0
  const scoreColor = pct >= 70 ? 'var(--color-success)' : pct >= 40 ? 'var(--color-warning)' : 'var(--color-error)'

  return (
    <>
      <PageHeader title="Результаты теста">
        <button className={styles.homeBtn} onClick={() => navigate('/')}>На главную</button>
      </PageHeader>

      <div className={styles.content}>

        {/* Score summary */}
        <div className={styles.summary}>
          <div className={styles.summaryScore} style={{ borderColor: scoreColor }}>
            <span className={styles.scoreNumber} style={{ color: scoreColor }}>{pct}%</span>
            <span className={styles.scoreLabel}>{correctCount} из {total} верно</span>
          </div>
          <div className={styles.summaryInfo}>
            <h2 className={styles.summaryTitle} style={{ color }}>{test.title}</h2>
            <p className={styles.summaryDate}>
              {new Date(session.finished_at).toLocaleDateString('ru-RU', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>
            <div className={styles.analysisBlock}>
              <p className={styles.analysisItem}>
                <span className={styles.analysisIcon} style={{ color: 'var(--color-success)' }}>✓</span>
                <span>{test.analysis_good}</span>
              </p>
              <p className={styles.analysisItem}>
                <span className={styles.analysisIcon} style={{ color: 'var(--color-warning)' }}>△</span>
                <span>{test.analysis_improve}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Per-question breakdown */}
        <h3 className={styles.sectionTitle}>Разбор вопросов</h3>
        <div className={styles.questions}>
          {test.questions.map((q, qi) => {
            const sessionAns = answerMap[q.id] ?? { selected_answer_ids: [], comment: '' }
            const selectedSet = new Set(sessionAns.selected_answer_ids)
            const correctSet  = new Set(q.answers.filter(a => a.is_correct).map(a => a.id))
            const isCorrect   = correctSet.size === selectedSet.size &&
              [...correctSet].every(id => selectedSet.has(id))

            return (
              <div key={q.id} className={`${styles.qCard} ${isCorrect ? styles.qCorrect : styles.qWrong}`}>
                <div className={styles.qHeader}>
                  <span
                    className={styles.qStatus}
                    style={{ background: isCorrect ? 'var(--color-success)' : 'var(--color-error)' }}
                  >
                    {isCorrect ? '✓' : '✗'}
                  </span>
                  <span className={styles.qNum}>Вопрос {qi + 1}</span>
                  <span className={styles.qText}>{q.text}</span>
                </div>

                <div className={styles.answers}>
                  {q.answers.map(ans => {
                    const wasSelected = selectedSet.has(ans.id)
                    const isRight     = ans.is_correct

                    let cls = styles.ansDefault
                    if (isRight && wasSelected) cls = styles.ansCorrectSelected
                    else if (isRight && !wasSelected) cls = styles.ansCorrectMissed
                    else if (!isRight && wasSelected) cls = styles.ansWrongSelected

                    return (
                      <div key={ans.id} className={`${styles.ansRow} ${cls}`}>
                        <span className={styles.ansMarker}>
                          {isRight && wasSelected  ? '✓' :
                           !isRight && wasSelected ? '✗' :
                           isRight                  ? '→' : ''}
                        </span>
                        <span className={styles.ansText}>{ans.text}</span>
                        <span className={styles.ansMeta}>
                          ⏱ {ans.time_hours}ч &nbsp; 💰 {ans.cost_rub.toLocaleString('ru-RU')}₽
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className={styles.explanation}>
                  <span className={styles.explanationLabel}>Пояснение:</span>
                  {q.explanation}
                </div>

                {sessionAns.comment && (
                  <div className={styles.studentComment}>
                    <span className={styles.explanationLabel}>Ваш комментарий:</span>
                    {sessionAns.comment}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className={styles.actions}>
          <button
            className={styles.actionSecondary}
            onClick={() => navigate(`/tests/${test.topic_id}`)}
          >
            Пройти снова
          </button>
          <button
            className={styles.actionSecondary}
            onClick={() => navigate('/reports')}
          >
            Перейти к отчётам
          </button>
          <button
            className={styles.actionPrimary}
            style={{ background: color, borderColor: color }}
            onClick={() => navigate('/')}
          >
            На главную
          </button>
        </div>

      </div>
    </>
  )
}
