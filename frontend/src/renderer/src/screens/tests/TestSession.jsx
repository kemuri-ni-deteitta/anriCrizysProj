import React, { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../api'
import { TOPIC_COLORS } from '../../theme'
import Loading from '../Loading'
import styles from './TestSession.module.css'

// ── Hint tooltip ──────────────────────────────────────────────────────────────
function Hint({ text }) {
  const [visible, setVisible] = useState(false)
  return (
    <span
      className={styles.hintWrap}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <button className={styles.hintBtn} type="button" tabIndex={-1}>ℹ</button>
      {visible && <span className={styles.hintPopover}>{text}</span>}
    </span>
  )
}

// ── Single answer option ──────────────────────────────────────────────────────
function AnswerOption({ answer, type, selected, onToggle }) {
  const isRadio   = type === 'single'
  const inputType = isRadio ? 'radio' : 'checkbox'
  const inputId   = `ans_${answer.id}`

  return (
    <label
      htmlFor={inputId}
      className={`${styles.option} ${selected ? styles.optionSelected : ''}`}
    >
      <input
        id={inputId}
        type={inputType}
        className={styles.optionInput}
        checked={selected}
        onChange={() => onToggle(answer.id)}
      />
      <span className={styles.optionText}>{answer.text}</span>
      <span className={styles.optionMeta}>
        <span className={styles.metaItem} title="Затраты времени">
          ⏱ {answer.time_hours}ч
        </span>
        <span className={styles.metaItem} title="Затраты ресурсов">
          💰 {answer.cost_rub.toLocaleString('ru-RU')}₽
        </span>
        {answer.hint && <Hint text={answer.hint} />}
      </span>
    </label>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TestSession() {
  const { topicId, testId } = useParams()
  const navigate = useNavigate()

  const [currentIdx, setCurrentIdx] = useState(0)
  // answers: { [questionId]: { selectedIds: string[], comment: string } }
  const [answers, setAnswers] = useState({})
  const [startedAt]  = useState(() => new Date().toISOString())
  const [submitting, setSubmitting] = useState(false)
  const [exitConfirm, setExitConfirm] = useState(false)

  const { data: test, loading, error } = useAsync(
    () => api.get(`/tests/${testId}`),
    [testId]
  )

  // ── Derived values ──────────────────────────────────────────────────────────
  const questions = test?.questions ?? []
  const total     = questions.length
  const question  = questions[currentIdx]
  const isLast    = currentIdx === total - 1
  const isFirst   = currentIdx === 0
  const color     = TOPIC_COLORS[test?.topic_id] ?? 'var(--color-accent)'

  const currentAnswer = answers[question?.id] ?? { selectedIds: [], comment: '' }

  // ── Answer state helpers ────────────────────────────────────────────────────
  const toggleAnswer = useCallback((questionId, answerId, type) => {
    setAnswers(prev => {
      const existing = prev[questionId] ?? { selectedIds: [], comment: '' }
      let ids
      if (type === 'single') {
        ids = [answerId]
      } else {
        ids = existing.selectedIds.includes(answerId)
          ? existing.selectedIds.filter(id => id !== answerId)
          : [...existing.selectedIds, answerId]
      }
      return { ...prev, [questionId]: { ...existing, selectedIds: ids } }
    })
  }, [])

  const setComment = useCallback((questionId, comment) => {
    setAnswers(prev => {
      const existing = prev[questionId] ?? { selectedIds: [], comment: '' }
      return { ...prev, [questionId]: { ...existing, comment } }
    })
  }, [])

  // ── Navigation ──────────────────────────────────────────────────────────────
  function goNext() {
    if (!isLast) setCurrentIdx(i => i + 1)
  }

  function goBack() {
    if (!isFirst) setCurrentIdx(i => i - 1)
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleFinish() {
    setSubmitting(true)
    try {
      const payload = {
        test_id:     testId,
        topic_id:    topicId,
        started_at:  startedAt,
        finished_at: new Date().toISOString(),
        answers: questions.map(q => ({
          question_id:         q.id,
          selected_answer_ids: (answers[q.id]?.selectedIds) ?? [],
          comment:             (answers[q.id]?.comment)      ?? ''
        }))
      }
      const session = await api.post('/sessions', payload)
      navigate(`/results/${session.id}`, { state: { test, session } })
    } catch (err) {
      setSubmitting(false)
      alert('Ошибка сохранения: ' + err.message)
    }
  }

  // ── Render guards ───────────────────────────────────────────────────────────
  if (loading) return <Loading />

  if (error || !test) {
    return (
      <div className={styles.errorPage}>
        <p>Тест не найден: {error}</p>
        <button onClick={() => navigate(`/tests/${topicId}`)}>← Назад</button>
      </div>
    )
  }

  const answeredCount = questions.filter(q => (answers[q.id]?.selectedIds?.length ?? 0) > 0).length
  const progress = Math.round((answeredCount / total) * 100)

  return (
    <div className={styles.page}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className={styles.topbar}>
        <button
          className={styles.exitBtn}
          onClick={() => setExitConfirm(true)}
        >
          ✕ Выйти
        </button>
        <div className={styles.topbarCenter}>
          <span className={styles.testTitle}>{test.title}</span>
        </div>
        <span className={styles.progressLabel}>
          {answeredCount} из {total} отвечено
        </span>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────────── */}
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%`, background: color }}
        />
      </div>

      {/* ── Question navigation ──────────────────────────────────────────────── */}
      <div className={styles.questionNav}>
        {questions.map((q, i) => {
          const answered = (answers[q.id]?.selectedIds?.length ?? 0) > 0
          const isActive = i === currentIdx
          return (
            <button
              key={q.id}
              className={`${styles.qNavBtn} ${isActive ? styles.qNavBtnActive : ''} ${answered && !isActive ? styles.qNavBtnAnswered : ''}`}
              onClick={() => setCurrentIdx(i)}
              title={`Вопрос ${i + 1}`}
              style={isActive ? { background: color, borderColor: color } : {}}
            >
              {answered && !isActive ? '✓' : i + 1}
            </button>
          )
        })}
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className={styles.content}>
        <div className={styles.questionPane}>

          {/* Question header */}
          <div className={styles.questionHeader}>
            <span
              className={styles.qBadge}
              style={{ background: color + '22', color }}
            >
              {question.type === 'single' ? 'Один ответ' : 'Несколько ответов'}
            </span>
            <span className={styles.qNumber}>Вопрос {currentIdx + 1}</span>
          </div>

          <h2 className={styles.questionText}>{question.text}</h2>

          {/* Answer options */}
          <div className={styles.options}>
            {question.answers.map(answer => (
              <AnswerOption
                key={answer.id}
                answer={answer}
                type={question.type}
                selected={currentAnswer.selectedIds.includes(answer.id)}
                onToggle={(id) => toggleAnswer(question.id, id, question.type)}
              />
            ))}
          </div>

          {/* Comment block */}
          <div className={styles.commentBlock}>
            <div className={styles.commentHeader}>
              <span className={styles.commentIcon}>💬</span>
              <span className={styles.commentTitle}>Объясните свой выбор</span>
              <span className={styles.commentOptional}>необязательно</span>
            </div>
            <textarea
              className={styles.commentTextarea}
              value={currentAnswer.comment}
              onChange={e => setComment(question.id, e.target.value)}
              placeholder="Напишите, почему выбрали этот вариант..."
              rows={4}
            />
          </div>

          {/* Navigation */}
          <div className={styles.nav}>
            <button
              className={styles.navBtnSecondary}
              onClick={goBack}
              disabled={isFirst}
            >
              ← Назад
            </button>
            {isLast ? (
              <button
                className={styles.navBtnPrimary}
                onClick={handleFinish}
                disabled={submitting}
                style={{ background: color, borderColor: color }}
              >
                {submitting ? 'Сохранение...' : 'Завершить тест'}
              </button>
            ) : (
              <button
                className={styles.navBtnPrimary}
                onClick={goNext}
                style={{ background: color, borderColor: color }}
              >
                Далее →
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ── Exit confirm modal ───────────────────────────────────────────────── */}
      {exitConfirm && (
        <div className={styles.overlay}>
          <div className={styles.confirmModal}>
            <h3>Выйти из теста?</h3>
            <p>Прогресс не сохранится.</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmCancel}
                onClick={() => setExitConfirm(false)}
              >
                Продолжить тест
              </button>
              <button
                className={styles.confirmExit}
                onClick={() => navigate(`/tests/${topicId}`)}
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
