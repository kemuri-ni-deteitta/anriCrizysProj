import React from 'react'
import styles from './PageHeader.module.css'

export default function PageHeader({ title, children }) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  )
}
