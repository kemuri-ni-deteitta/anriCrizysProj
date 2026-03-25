// Maps topic color_key → CSS hex color
export const TOPIC_COLORS = {
  purple: '#7c3aed',
  teal:   '#0d9488',
  amber:  '#d97706',
  blue:   '#2563eb',
  red:    '#dc2626',
  green:  '#16a34a',
  coral:  '#f97316'
}

// Maps topic icon_key → emoji fallback (no external icon dep)
export const TOPIC_ICONS = {
  shield: '🛡️',
  people: '👥',
  chart:  '📉',
  server: '🖥️',
  target: '🎯',
  task:   '📋',
  law:    '⚖️'
}

// Shortcut: topic_id → emoji (for places where we only have topic_id)
export const TOPIC_ID_ICONS = {
  cybersecurity: '🛡️',
  hr_crisis:     '👥',
  financial:     '📉',
  operational:   '🖥️',
  strategic:     '🎯',
  project:       '📋',
  regulatory:    '⚖️'
}
