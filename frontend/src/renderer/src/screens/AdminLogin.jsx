import React, { useState } from 'react'
import { useUser } from '../context/UserContext'
import styles from './AdminLogin.module.css'

export default function AdminLogin() {
  const { adminLogin, backToRegistration } = useUser()

  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Введите пароль')
      return
    }

    setLoading(true)
    try {
      await adminLogin(password)
    } catch (err) {
      setError('Неверный пароль')
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🔐</span>
        </div>

        <h1 className={styles.title}>Вход для администратора</h1>
        <p className={styles.subtitle}>Введите пароль для доступа к панели управления</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label className={styles.label}>Пароль</label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              disabled={loading}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Проверка...' : 'Войти'}
          </button>

          <button
            type="button"
            className={styles.backButton}
            onClick={backToRegistration}
            disabled={loading}
          >
            ← Назад
          </button>
        </form>
      </div>
    </div>
  )
}
