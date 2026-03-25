// Inline SVG icon set — no external dependency
import React from 'react'

const Icon = ({ d, size = 18, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {Array.isArray(d)
      ? d.map((path, i) => <path key={i} d={path} />)
      : <path d={d} />}
  </svg>
)

export const HomeIcon     = (p) => <Icon size={p.size} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
export const TestsIcon    = (p) => <Icon size={p.size} d={["M9 11l3 3L22 4","M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"]} />
export const ResultsIcon  = (p) => <Icon size={p.size} d={["M18 20V10","M12 20V4","M6 20v-6"]} />
export const CalendarIcon = (p) => <Icon size={p.size} d={["M8 2v4","M16 2v4","M3 10h18","M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"]} />
export const ReportsIcon  = (p) => <Icon size={p.size} d={["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M16 13H8","M16 17H8","M10 9H8"]} />
export const AdminIcon    = (p) => <Icon size={p.size} d={["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"]} />
export const EditIcon     = (p) => <Icon size={p.size} d={["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7","M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"]} />
export const ChevronIcon  = (p) => <Icon size={p.size} d="M6 9l6 6 6-6" />
export const CloseIcon    = (p) => <Icon size={p.size} d={["M18 6L6 18","M6 6l12 12"]} />
export const UploadIcon   = (p) => <Icon size={p.size} d={["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4","M17 8l-5-5-5 5","M12 3v12"]} />
export const DotsIcon     = (p) => <Icon size={p.size} d={["M12 5v.01","M12 12v.01","M12 19v.01"]} strokeWidth={3} />
