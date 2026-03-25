import React, { useState } from 'react'
import { useUser } from '../context/UserContext'
import styles from './Registration.module.css'

export default function Registration() {
  const { register, requestAdminLogin } = useUser()

  const [lastName, setLastName]   = useState('')
  const [firstName, setFirstName] = useState('')
  const [group, setGroup]         = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmed = {
      lastName:  lastName.trim(),
      firstName: firstName.trim(),
      group:     group.trim()
    }

    if (!trimmed.lastName || !trimmed.firstName || !trimmed.group) {
      setError('Заполните все поля')
      return
    }

    // Admin entry point
    if (trimmed.lastName.toLowerCase() === 'admin') {
      requestAdminLogin()
      return
    }

    setLoading(true)
    try {
      await register(trimmed.lastName, trimmed.firstName, trimmed.group)
    } catch (err) {
      setError(err.message || 'Ошибка при сохранении данных')
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
        </div>

        <h1 className={styles.title}>Тренажёр антикризисного управления</h1>
        <p className={styles.subtitle}>Введите ваши данные для начала работы</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label className={styles.label}>Фамилия</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Иванов"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              autoFocus
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Имя</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Алексей"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Группа</label>
            <input
              className={styles.input}
              type="text"
              placeholder="ИТ-21"
              value={group}
              onChange={e => setGroup(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Сохранение...' : 'Приступить'}
          </button>
        </form>

        <p className={styles.version}>v1.0</p>
      </div>
    </div>
  )
}
