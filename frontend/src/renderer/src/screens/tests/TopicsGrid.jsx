import React from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../api'
import { TOPIC_COLORS, TOPIC_ICONS } from '../../theme'
import styles from './TopicsGrid.module.css'

export default function TopicsGrid() {
  const navigate = useNavigate()

  const { data: topics,   loading: tLoading, error: tError } = useAsync(() => api.get('/topics'))
  const { data: tests,    loading: testsLoading }             = useAsync(() => api.get('/tests'))

  const loading = tLoading || testsLoading

  // Count tests per topic
  const countByTopic = React.useMemo(() => {
    if (!tests) return {}
    return tests.reduce((acc, t) => {
      acc[t.topic_id] = (acc[t.topic_id] || 0) + 1
      return acc
    }, {})
  }, [tests])

  if (loading) {
    return (
      <>
        <PageHeader title="Тесты" />
        <div className={styles.loading}>Загрузка...</div>
      </>
    )
  }

  if (tError) {
    return (
      <>
        <PageHeader title="Тесты" />
        <div className={styles.error}>Ошибка загрузки: {tError}</div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Тесты" />
      <div className={styles.content}>
        <p className={styles.hint}>Выберите тематику для прохождения теста</p>
        <div className={styles.grid}>
          {(topics || []).map(topic => {
            const color = TOPIC_COLORS[topic.color_key] || '#6b7280'
            const icon  = TOPIC_ICONS[topic.icon_key]   || '📁'
            const count = countByTopic[topic.id] || 0

            return (
              <button
                key={topic.id}
                className={styles.card}
                onClick={() => navigate(topic.id)}
                style={{ '--topic-color': color }}
              >
                <div className={styles.cardIcon} style={{ background: color + '22' }}>
                  <span className={styles.cardEmoji}>{icon}</span>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{topic.name}</h3>
                  <p className={styles.cardCount}>
                    {count} {pluralTests(count)}
                  </p>
                </div>
                <div
                  className={styles.cardAccent}
                  style={{ background: color }}
                />
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function pluralTests(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'тест'
  if (n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14)) return 'теста'
  return 'тестов'
}
