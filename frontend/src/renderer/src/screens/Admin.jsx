import React, { useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'
import PageHeader from '../components/PageHeader/PageHeader'
import Loading from './Loading'
import { TOPIC_COLORS, TOPIC_ICONS } from '../theme'
import styles from './Admin.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeKey() {
  return Math.random().toString(36).slice(2)
}

function emptyAnswer() {
  return { _key: makeKey(), id: null, text: '', time_hours: '', cost_rub: '', hint: '', is_correct: false }
}

function emptyQuestion(order) {
  return {
    _key: makeKey(), id: null, order,
    text: '', type: 'single', explanation: '',
    answers: [emptyAnswer(), emptyAnswer()]
  }
}

function emptyForm(topics) {
  return {
    topic_id: topics[0]?.id ?? '',
    title: '', description: '',
    analysis_good: '', analysis_improve: '',
    questions: [emptyQuestion(1)]
  }
}

function testToForm(test) {
  return {
    topic_id: test.topic_id,
    title: test.title,
    description: test.description,
    analysis_good: test.analysis_good,
    analysis_improve: test.analysis_improve,
    questions: test.questions.map(q => ({
      _key: makeKey(),
      id: q.id, order: q.order,
      text: q.text, type: q.type, explanation: q.explanation,
      answers: q.answers.map(a => ({
        _key: makeKey(),
        id: a.id, text: a.text,
        time_hours: String(a.time_hours),
        cost_rub: String(a.cost_rub),
        hint: a.hint ?? '',
        is_correct: a.is_correct
      }))
    }))
  }
}

function formToPayload(form) {
  return {
    topic_id: form.topic_id,
    title: form.title.trim(),
    description: form.description.trim(),
    analysis_good: form.analysis_good.trim(),
    analysis_improve: form.analysis_improve.trim(),
    questions: form.questions.map((q, qi) => ({
      id: q.id || undefined,
      order: qi + 1,
      text: q.text.trim(),
      type: q.type,
      explanation: q.explanation.trim(),
      answers: q.answers.map(a => ({
        id: a.id || undefined,
        text: a.text.trim(),
        time_hours: parseFloat(a.time_hours) || 0,
        cost_rub: parseFloat(a.cost_rub) || 0,
        hint: a.hint.trim(),
        is_correct: a.is_correct
      }))
    }))
  }
}

function validateForm(form) {
  if (!form.title.trim()) return 'Введите название теста'
  if (!form.description.trim()) return 'Введите описание сценария'
  if (form.questions.length === 0) return 'Добавьте хотя бы один вопрос'
  for (let qi = 0; qi < form.questions.length; qi++) {
    const q = form.questions[qi]
    if (!q.text.trim()) return `Вопрос ${qi + 1}: введите текст`
    if (q.answers.length < 2) return `Вопрос ${qi + 1}: добавьте минимум 2 варианта ответа`
    const hasCorrect = q.answers.some(a => a.is_correct)
    if (!hasCorrect) return `Вопрос ${qi + 1}: отметьте хотя бы один правильный ответ`
    for (let ai = 0; ai < q.answers.length; ai++) {
      if (!q.answers[ai].text.trim()) return `Вопрос ${qi + 1}, ответ ${ai + 1}: введите текст`
    }
  }
  return null
}

// ── TestEditor ────────────────────────────────────────────────────────────────

function TestEditor({ topics, initialForm, testId, onSave, onCancel }) {
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedQ, setExpandedQ] = useState(0)

  // ── Field helpers ──────────────────────────────────────────────────────────

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setQuestion(qi, field, value) {
    setForm(f => {
      const qs = [...f.questions]
      qs[qi] = { ...qs[qi], [field]: value }
      return { ...f, questions: qs }
    })
  }

  function setAnswer(qi, ai, field, value) {
    setForm(f => {
      const qs = [...f.questions]
      const ans = [...qs[qi].answers]
      ans[ai] = { ...ans[ai], [field]: value }
      // For single-type: uncheck others when checking one
      if (field === 'is_correct' && value && qs[qi].type === 'single') {
        ans.forEach((a, idx) => { if (idx !== ai) ans[idx] = { ...a, is_correct: false } })
      }
      qs[qi] = { ...qs[qi], answers: ans }
      return { ...f, questions: qs }
    })
  }

  function addQuestion() {
    setForm(f => {
      const next = [...f.questions, emptyQuestion(f.questions.length + 1)]
      setExpandedQ(next.length - 1)
      return { ...f, questions: next }
    })
  }

  function removeQuestion(qi) {
    setForm(f => {
      const next = f.questions.filter((_, i) => i !== qi)
      setExpandedQ(prev => Math.min(prev, next.length - 1))
      return { ...f, questions: next }
    })
  }

  function addAnswer(qi) {
    setForm(f => {
      const qs = [...f.questions]
      qs[qi] = { ...qs[qi], answers: [...qs[qi].answers, emptyAnswer()] }
      return { ...f, questions: qs }
    })
  }

  function removeAnswer(qi, ai) {
    setForm(f => {
      const qs = [...f.questions]
      qs[qi] = { ...qs[qi], answers: qs[qi].answers.filter((_, i) => i !== ai) }
      return { ...f, questions: qs }
    })
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    const err = validateForm(form)
    if (err) { setError(err); return }
    setSaving(true)
    setError('')
    try {
      const payload = formToPayload(form)
      if (testId) {
        await api.put(`/admin/tests/${testId}`, payload)
      } else {
        await api.post('/admin/tests', payload)
      }
      onSave()
    } catch (e) {
      setError(e.message || 'Ошибка сохранения')
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const topic = topics.find(t => t.id === form.topic_id)
  const accentColor = topic ? TOPIC_COLORS[topic.color_key] : 'var(--color-accent)'

  return (
    <div className={styles.editorPage}>

      {/* Header */}
      <div className={styles.editorHeader}>
        <button className={styles.backBtn} onClick={onCancel} disabled={saving}>
          ← Назад
        </button>
        <h1 className={styles.editorTitle}>
          {testId ? 'Редактировать тест' : 'Новый тест'}
        </h1>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
          style={{ background: accentColor }}
        >
          {saving ? 'Сохранение...' : (testId ? 'Сохранить' : 'Создать тест')}
        </button>
      </div>

      {error && <div className={styles.formError}>{error}</div>}

      <div className={styles.editorScroll}>
      <div className={styles.editorBody}>

        {/* ── Meta section ──────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Основная информация</h2>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Категория</label>
              <select
                className={styles.select}
                value={form.topic_id}
                onChange={e => setField('topic_id', e.target.value)}
                disabled={saving}
              >
                {topics.map(t => (
                  <option key={t.id} value={t.id}>
                    {TOPIC_ICONS[t.icon_key]} {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Название теста</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="Например: Утечка данных через внутренний сервис"
              disabled={saving}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Описание сценария</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              placeholder="Опишите кризисную ситуацию, с которой столкнулась компания..."
              disabled={saving}
            />
          </div>
        </section>

        {/* ── Analysis section ──────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Разбор результатов</h2>
          <p className={styles.sectionHint}>Показывается студенту после прохождения теста</p>

          <div className={styles.field}>
            <label className={styles.label}>Что было сделано правильно</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={form.analysis_good}
              onChange={e => setField('analysis_good', e.target.value)}
              placeholder="Опишите правильные решения и их обоснование..."
              disabled={saving}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Что можно улучшить</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={form.analysis_improve}
              onChange={e => setField('analysis_improve', e.target.value)}
              placeholder="Укажите типичные ошибки и рекомендации по улучшению..."
              disabled={saving}
            />
          </div>
        </section>

        {/* ── Questions section ─────────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Вопросы</h2>
              <p className={styles.sectionHint}>{form.questions.length} вопр.</p>
            </div>
            <button
              className={styles.addQuestionBtn}
              onClick={addQuestion}
              disabled={saving}
              style={{ borderColor: accentColor, color: accentColor }}
            >
              + Добавить вопрос
            </button>
          </div>

          <div className={styles.questionsList}>
            {form.questions.map((q, qi) => {
              const isOpen = expandedQ === qi
              const hasCorrect = q.answers.some(a => a.is_correct)
              return (
                <div key={q._key} className={`${styles.questionCard} ${isOpen ? styles.questionCardOpen : ''}`}>

                  {/* Question header (click to expand) */}
                  <div
                    className={styles.questionCardHeader}
                    onClick={() => setExpandedQ(isOpen ? -1 : qi)}
                  >
                    <span
                      className={styles.qIndex}
                      style={{ background: accentColor + '22', color: accentColor }}
                    >
                      {qi + 1}
                    </span>
                    <span className={styles.qPreview}>
                      {q.text.trim() || <span className={styles.qPlaceholder}>Без текста</span>}
                    </span>
                    <div className={styles.qCardMeta}>
                      <span className={`${styles.qTypeBadge} ${q.type === 'multiple' ? styles.qTypeBadgeMulti : ''}`}>
                        {q.type === 'single' ? 'один' : 'несколько'}
                      </span>
                      {!hasCorrect && <span className={styles.qWarn}>⚠ нет правильного</span>}
                      <span className={styles.qAnswerCount}>{q.answers.length} отв.</span>
                    </div>
                    <button
                      className={styles.removeQBtn}
                      onClick={e => { e.stopPropagation(); removeQuestion(qi) }}
                      disabled={saving || form.questions.length <= 1}
                      title="Удалить вопрос"
                    >
                      ✕
                    </button>
                    <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>›</span>
                  </div>

                  {/* Question body */}
                  {isOpen && (
                    <div className={styles.questionCardBody}>

                      <div className={styles.field}>
                        <label className={styles.label}>Текст вопроса</label>
                        <textarea
                          className={styles.textarea}
                          rows={2}
                          value={q.text}
                          onChange={e => setQuestion(qi, 'text', e.target.value)}
                          placeholder="Сформулируйте вопрос для студента..."
                          disabled={saving}
                        />
                      </div>

                      <div className={styles.fieldRow}>
                        <div className={styles.field}>
                          <label className={styles.label}>Тип ответа</label>
                          <div className={styles.typeToggle}>
                            <button
                              className={`${styles.typeBtn} ${q.type === 'single' ? styles.typeBtnActive : ''}`}
                              onClick={() => setQuestion(qi, 'type', 'single')}
                              disabled={saving}
                              style={q.type === 'single' ? { background: accentColor, borderColor: accentColor } : {}}
                            >
                              Один ответ
                            </button>
                            <button
                              className={`${styles.typeBtn} ${q.type === 'multiple' ? styles.typeBtnActive : ''}`}
                              onClick={() => setQuestion(qi, 'type', 'multiple')}
                              disabled={saving}
                              style={q.type === 'multiple' ? { background: accentColor, borderColor: accentColor } : {}}
                            >
                              Несколько ответов
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className={styles.field}>
                        <label className={styles.label}>Объяснение правильного ответа</label>
                        <textarea
                          className={styles.textarea}
                          rows={2}
                          value={q.explanation}
                          onChange={e => setQuestion(qi, 'explanation', e.target.value)}
                          placeholder="Объясните, почему именно такой ответ является верным..."
                          disabled={saving}
                        />
                      </div>

                      {/* Answers */}
                      <div className={styles.answersSection}>
                        <div className={styles.answersHeader}>
                          <span className={styles.label}>Варианты ответов</span>
                          <button
                            className={styles.addAnswerBtn}
                            onClick={() => addAnswer(qi)}
                            disabled={saving}
                          >
                            + Ответ
                          </button>
                        </div>

                        <div className={styles.answersList}>
                          {q.answers.map((a, ai) => (
                            <div key={a._key} className={`${styles.answerRow} ${a.is_correct ? styles.answerRowCorrect : ''}`}
                              style={a.is_correct ? { borderColor: accentColor } : {}}>

                              {/* Correct checkbox */}
                              <button
                                className={`${styles.correctBtn} ${a.is_correct ? styles.correctBtnActive : ''}`}
                                onClick={() => setAnswer(qi, ai, 'is_correct', !a.is_correct)}
                                disabled={saving}
                                title="Правильный ответ"
                                style={a.is_correct ? { background: accentColor, borderColor: accentColor } : {}}
                              >
                                ✓
                              </button>

                              <div className={styles.answerFields}>
                                <input
                                  className={styles.input}
                                  value={a.text}
                                  onChange={e => setAnswer(qi, ai, 'text', e.target.value)}
                                  placeholder="Текст варианта ответа..."
                                  disabled={saving}
                                />
                                <div className={styles.answerMeta}>
                                  <div className={styles.metaField}>
                                    <span className={styles.metaLabel}>⏱ Время (ч)</span>
                                    <input
                                      className={`${styles.input} ${styles.inputSmall}`}
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={a.time_hours}
                                      onChange={e => setAnswer(qi, ai, 'time_hours', e.target.value)}
                                      placeholder="0"
                                      disabled={saving}
                                    />
                                  </div>
                                  <div className={styles.metaField}>
                                    <span className={styles.metaLabel}>💰 Стоимость (₽)</span>
                                    <input
                                      className={`${styles.input} ${styles.inputSmall}`}
                                      type="number"
                                      min="0"
                                      step="100"
                                      value={a.cost_rub}
                                      onChange={e => setAnswer(qi, ai, 'cost_rub', e.target.value)}
                                      placeholder="0"
                                      disabled={saving}
                                    />
                                  </div>
                                  <div className={`${styles.metaField} ${styles.metaFieldHint}`}>
                                    <span className={styles.metaLabel}>ℹ Подсказка</span>
                                    <input
                                      className={styles.input}
                                      value={a.hint}
                                      onChange={e => setAnswer(qi, ai, 'hint', e.target.value)}
                                      placeholder="Пояснение к этому варианту..."
                                      disabled={saving}
                                    />
                                  </div>
                                </div>
                              </div>

                              <button
                                className={styles.removeAnswerBtn}
                                onClick={() => removeAnswer(qi, ai)}
                                disabled={saving || q.answers.length <= 2}
                                title="Удалить ответ"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            className={styles.addQuestionBtnBottom}
            onClick={addQuestion}
            disabled={saving}
          >
            + Добавить ещё вопрос
          </button>
        </section>

      </div>
      </div>
    </div>
  )
}

// ── TestsList ─────────────────────────────────────────────────────────────────

function TestsList({ topics, tests, onEdit, onCreate, onDelete, onReload }) {
  const [deletingId, setDeletingId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete(id) {
    setDeleting(true)
    try {
      await api.delete(`/admin/tests/${id}`)
      setDeletingId(null)
      onReload()
    } catch (e) {
      alert('Ошибка удаления: ' + e.message)
    } finally {
      setDeleting(false)
    }
  }

  // Group tests by topic
  const byTopic = {}
  topics.forEach(t => { byTopic[t.id] = [] })
  tests.forEach(t => {
    if (!byTopic[t.topic_id]) byTopic[t.topic_id] = []
    byTopic[t.topic_id].push(t)
  })

  return (
    <div className={styles.listScroll}>
    <div className={styles.listPage}>
      <div className={styles.listHeader}>
        <div>
          <h1 className={styles.listTitle}>Управление тестами</h1>
          <p className={styles.listSubtitle}>{tests.length} тест{tests.length === 1 ? '' : tests.length < 5 ? 'а' : 'ов'} в {topics.length} категориях</p>
        </div>
        <button className={styles.createBtn} onClick={onCreate}>
          + Создать тест
        </button>
      </div>

      <div className={styles.topicSections}>
        {topics.map(topic => {
          const topicTests = byTopic[topic.id] ?? []
          const color = TOPIC_COLORS[topic.color_key]
          const icon = TOPIC_ICONS[topic.icon_key]
          return (
            <div key={topic.id} className={styles.topicSection}>
              <div className={styles.topicSectionHeader}>
                <span className={styles.topicIcon} style={{ background: color + '22', color }}>
                  {icon}
                </span>
                <span className={styles.topicName}>{topic.name}</span>
                <span className={styles.topicCount}>{topicTests.length}</span>
              </div>

              {topicTests.length === 0 ? (
                <div className={styles.emptyTopic}>Тестов нет — <button className={styles.emptyCreateLink} onClick={onCreate}>создать первый</button></div>
              ) : (
                <div className={styles.testCards}>
                  {topicTests.map(test => (
                    <div key={test.id} className={styles.testCard}>
                      <div className={styles.testCardBody}>
                        <span className={styles.testCardTitle}>{test.title}</span>
                        <span className={styles.testCardMeta}>{test.question_count} вопр.</span>
                      </div>
                      <div className={styles.testCardActions}>
                        <button
                          className={styles.editBtn}
                          onClick={() => onEdit(test.id)}
                        >
                          Редактировать
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => setDeletingId(test.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Delete confirm modal */}
      {deletingId && (
        <div className={styles.overlay}>
          <div className={styles.confirmModal}>
            <h3>Удалить тест?</h3>
            <p>Это действие необратимо. Все прохождения этого теста останутся в истории, но сам тест будет удалён.</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmCancel}
                onClick={() => setDeletingId(null)}
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                className={styles.confirmDelete}
                onClick={() => confirmDelete(deletingId)}
                disabled={deleting}
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

// ── Main Admin ────────────────────────────────────────────────────────────────

export default function Admin() {
  const [view, setView] = useState('list') // 'list' | 'editor'
  const [editingTestId, setEditingTestId] = useState(null)
  const [editorForm, setEditorForm] = useState(null)
  const [loadingEditor, setLoadingEditor] = useState(false)

  const { data: topics, loading: topicsLoading } = useAsync(() => api.get('/topics'), [])
  const { data: tests, loading: testsLoading, reload: reloadTests } = useAsync(
    () => api.get('/admin/tests'), []
  )

  async function openCreate() {
    setEditorForm(emptyForm(topics ?? []))
    setEditingTestId(null)
    setView('editor')
  }

  async function openEdit(testId) {
    setLoadingEditor(true)
    try {
      const test = await api.get(`/tests/${testId}`)
      setEditorForm(testToForm(test))
      setEditingTestId(testId)
      setView('editor')
    } catch (e) {
      alert('Не удалось загрузить тест: ' + e.message)
    } finally {
      setLoadingEditor(false)
    }
  }

  function handleSaved() {
    reloadTests()
    setView('list')
    setEditorForm(null)
    setEditingTestId(null)
  }

  function handleCancel() {
    setView('list')
    setEditorForm(null)
    setEditingTestId(null)
  }

  if (topicsLoading || testsLoading || loadingEditor) return <Loading />

  if (view === 'editor' && editorForm) {
    return (
      <TestEditor
        topics={topics ?? []}
        initialForm={editorForm}
        testId={editingTestId}
        onSave={handleSaved}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <>
      <PageHeader title="Админ-панель" />
      <TestsList
        topics={topics ?? []}
        tests={tests ?? []}
        onEdit={openEdit}
        onCreate={openCreate}
        onDelete={() => {}}
        onReload={reloadTests}
      />
    </>
  )
}
