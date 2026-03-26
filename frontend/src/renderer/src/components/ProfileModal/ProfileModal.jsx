import React, { useState, useRef } from 'react'
import { useUser, AUTH_STATE } from '../../context/UserContext'
import { CloseIcon, UploadIcon } from '../Icons'
import { api } from '../../api'
import { CONFIG } from '../../config'
import styles from './ProfileModal.module.css'

export default function ProfileModal({ onClose }) {
  const { user, authState, updateUser, logout } = useUser()
  const isAdmin = authState === AUTH_STATE.ADMIN

  const [lastName,  setLastName]  = useState(user?.last_name  ?? '')
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [group,     setGroup]     = useState(user?.group      ?? '')
  const [avatarSrc, setAvatarSrc] = useState(null)
  const [avatarTs, setAvatarTs] = useState(() => Date.now())
  const [error,     setError]     = useState('')
  const [saving,    setSaving]    = useState(false)

  const fileInputRef = useRef(null)

  // Build avatar display URL
  const displayAvatar = avatarSrc
    || (user?.avatar_path ? `${CONFIG.API_BASE_URL}/user/avatar?t=${avatarTs}` : null)

  const initials = `${lastName?.[0] ?? ''}${firstName?.[0] ?? ''}`.toUpperCase() || '?'

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      setError('Только JPG или PNG')
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarSrc(ev.target.result)
    reader.readAsDataURL(file)

    // Upload immediately
    const formData = new FormData()
    formData.append('file', file)
    try {
      await fetch(`${CONFIG.API_BASE_URL}/user/avatar`, {
        method: 'POST',
        body: formData
      })
      setAvatarTs(Date.now())
    } catch {
      // Non-critical — preview still works
    }
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
            {/* Avatar */}
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrap}>
                {displayAvatar
                  ? <img src={displayAvatar} alt="avatar" className={styles.avatarImg} />
                  : <span className={styles.avatarInitials}>{initials}</span>
                }
              </div>
              <button
                className={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon size={14} />
                Загрузить фото
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
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
