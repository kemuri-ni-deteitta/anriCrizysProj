import React, { useState } from 'react'
import { useUser, AUTH_STATE } from '../../context/UserContext'
import { CloseIcon } from '../Icons'
import styles from './ProfileModal.module.css'

export default function ProfileModal({ onClose }) {
  const { user, authState, updateUser, logout } = useUser()
  const isAdmin = authState === AUTH_STATE.ADMIN

  const [lastName,  setLastName]  = useState(user?.last_name  ?? '')
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [group,     setGroup]     = useState(user?.group      ?? '')
  const [error,     setError]     = useState('')
  const [saving,    setSaving]    = useState(false)

  const initials = `${lastName?.[0] ?? ''}${firstName?.[0] ?? ''}`.toUpperCase() || '?'

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  async function handleSave() {
    const trimmed = {
      last_name:  lastName.trim(),
      first_name: firstName.trim(),
      group:      group.trim()
    }

    if (!trimmed.last_name || !trimmed.first_name || !trimmed.group) {
      setError('Заполните все поля')
      return
    }

    setSaving(true)
    setError('')
    try {
      await updateUser(trimmed)
      onClose()
    } catch (err) {
      setError(err.message || 'Ошибка сохранения')
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{isAdmin ? 'Профиль' : 'Редактировать профиль'}</h2>
          <button className={styles.closeBtn} onClick={onClose} title="Закрыть">
            <CloseIcon size={18} />
          </button>
        </div>

        {!isAdmin && (
          <>
            {/* Avatar initials */}
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrap}>
                <span className={styles.avatarInitials}>{initials}</span>
              </div>
            </div>

            {/* Fields */}
            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.label}>Фамилия</label>
                <input
                  className={styles.input}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Имя</label>
                <input
                  className={styles.input}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Группа</label>
                <input
                  className={styles.input}
                  value={group}
                  onChange={e => setGroup(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            {/* Actions */}
            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
                Отмена
              </button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </>
        )}

        {/* Logout */}
        <div className={styles.logoutSection}>
          <button className={styles.logoutBtn} onClick={logout} disabled={saving}>
            {isAdmin ? 'Выйти из панели администратора' : 'Выйти из аккаунта'}
          </button>
        </div>
      </div>
    </div>
  )
}
