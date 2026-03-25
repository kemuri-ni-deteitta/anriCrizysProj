import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useUser, AUTH_STATE } from '../../context/UserContext'
import {
  HomeIcon, TestsIcon, ResultsIcon,
  CalendarIcon, ReportsIcon, AdminIcon
} from '../Icons'
import ProfileModal from '../ProfileModal/ProfileModal'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/',         label: 'Главная',        Icon: HomeIcon     },
  { to: '/tests',    label: 'Тесты',          Icon: TestsIcon    },
  { to: '/results',  label: 'Мои результаты', Icon: ResultsIcon  },
  { to: '/calendar', label: 'Календарь',      Icon: CalendarIcon },
  { to: '/reports',  label: 'Отчёты',         Icon: ReportsIcon  }
]

const STORAGE_KEY = 'sidebar_collapsed'

export default function Sidebar() {
  const { user, authState } = useUser()
  const [profileOpen, setProfileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  )

  const isAdmin = authState === AUTH_STATE.ADMIN
  const initials = user
    ? `${user.last_name?.[0] ?? ''}${user.first_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  function toggleCollapse() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <>
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>

        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoMark}>АУ</div>
          {!collapsed && (
            <div className={styles.logoText}>
              <span className={styles.logoTitle}>Тренажёр антикризисного управления</span>
              <span className={styles.logoVersion}>v1.0</span>
            </div>
          )}
        </div>

        {/* Main navigation */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <span className={styles.navIcon}><Icon size={17} /></span>
              {!collapsed && <span className={styles.navLabel}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className={styles.divider} />
            <nav className={styles.nav}>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `${styles.navItem} ${styles.navItemAdmin} ${isActive ? styles.navItemActive : ''}`
                }
                title={collapsed ? 'Админ-панель' : undefined}
              >
                <span className={styles.navIcon}><AdminIcon size={17} /></span>
                {!collapsed && <span className={styles.navLabel}>Админ-панель</span>}
              </NavLink>
            </nav>
          </>
        )}

        <div className={styles.spacer} />

        {/* Collapse toggle */}
        <button
          className={styles.collapseBtn}
          onClick={toggleCollapse}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          <svg
            width={16} height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${styles.collapseIcon} ${collapsed ? styles.collapseIconFlipped : ''}`}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {!collapsed && <span>Свернуть</span>}
        </button>

        {/* User profile */}
        <button
          className={styles.profile}
          onClick={() => setProfileOpen(true)}
          title={collapsed ? `${user?.last_name} ${user?.first_name}` : 'Редактировать профиль'}
        >
          <div className={styles.avatar}>{initials}</div>
          {!collapsed && (
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>
                {user?.last_name} {user?.first_name}
              </span>
              <span className={styles.profileGroup}>
                {isAdmin ? 'Администратор' : `Группа ${user?.group}`}
              </span>
            </div>
          )}
          {!collapsed && <div className={styles.profileDots}>···</div>}
        </button>

      </aside>

      {profileOpen && (
        <ProfileModal onClose={() => setProfileOpen(false)} />
      )}
    </>
  )
}
