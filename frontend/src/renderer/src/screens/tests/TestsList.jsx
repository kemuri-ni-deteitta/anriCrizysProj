import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../api'
import { TOPIC_COLORS, TOPIC_ICONS } from '../../theme'
import styles from './TestsList.module.css'

const STATUS_LABEL = {
  none:    { text: 'Не пройден', cls: 'statusNone'   },
  once:    { text: 'Пройден',    cls: 'statusDone'   },
  repeat:  { text: 'Пройден повторно', cls: 'statusRepeat' }
}

export default function TestsList() {
  const { topicId } = useParams()
  const navigate    = useNavigate()

  const { data: topics }   = useAsync(() => api.get('/topics'))
  const { data: tests, loading: testsLoading, error: testsError } =
    useAsync(() => api.get(`/tests?topic_id=${topicId}`), [topicId])
  const { data: sessions } = useAsync(() => api.get('/sessions'))

  const topic = topics?.find(t => t.id === topicId)
  const color = TOPIC_COLORS[topic?.color_key] || '#6b7280'
  const icon  = TOPIC_ICONS[topic?.icon_key]   || '📁'

  // Count sessions per test_id
  const sessionsByTest = React.useMemo(() => {
    if (!sessions) return {}
    return sessions.reduce((acc, s) => {
      acc[s.test_id] = (acc[s.test_id] || 0) + 1
      return acc
    }, {})
  }, [sessions])

  function getStatus(testId) {
    const count = sessionsByTest[testId] || 0
    if (count === 0) return 'none'
    if (count === 1) return 'once'
    return 'repeat'
  }

  function handleStart(testId) {
    navigate(`/tests/${topicId}/${testId}`)
  }

  const title = topic?.name ?? 'Тесты'

  return (
    <>
      <PageHeader title={title}>
        <button className={styles.backBtn} onClick={() => navigate('/tests')}>
          ← Назад
        </button>
      </PageHeader>

      <div className={styles.content}>
        {/* Topic badge */}
        <div className={styles.badge} style={{ background: color + '22', color }}>
          <span>{icon}</span>
          <span>{title}</span>
        </div>

        {testsLoading && <p className={styles.hint}>Загрузка...</p>}
        {testsError   && <p className={styles.error}>Ошибка: {testsError}</p>}

        {!testsLoading && tests?.length === 0 && (
          <p className={styles.hint}>В этой тематике пока нет тестов</p>
        )}

        <div className={styles.list}>
          {(tests || []).map(test => {
            const status   = getStatus(test.id)
            const statusMeta = STATUS_LABEL[status]

            return (
              <div key={test.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <div className={styles.itemHeader}>
                    <h3 className={styles.itemTitle}>{test.title}</h3>
                    <span className={`${styles.statusBadge} ${styles[statusMeta.cls]}`}>
                      {statusMeta.text}
                    </span>
                  </div>
                  <p className={styles.itemDesc}>{test.description}</p>
                  <p className={styles.itemMeta}>
                    {test.question_count} {pluralQuestions(test.question_count)}
                  </p>
                </div>
                <button
                  className={styles.startBtn}
                  style={{ '--topic-color': color }}
                  onClick={() => handleStart(test.id)}
                >
                  {status === 'none' ? 'Начать' : 'Пройти снова'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function pluralQuestions(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'вопрос'
  if (n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14)) return 'вопроса'
  return 'вопросов'
}
