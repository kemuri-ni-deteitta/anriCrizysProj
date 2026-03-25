import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import TopicsGrid  from './tests/TopicsGrid'
import TestsList   from './tests/TestsList'
import TestSession from './tests/TestSession'

// /tests                       → topic selection grid
// /tests/:topicId               → tests list for that topic
// /tests/:topicId/:testId       → test session
export default function Tests() {
  return (
    <Routes>
      <Route index                   element={<TopicsGrid />} />
      <Route path=":topicId"         element={<TestsList />} />
      <Route path=":topicId/:testId" element={<TestSession />} />
      <Route path="*"                element={<Navigate to="" replace />} />
    </Routes>
  )
}
