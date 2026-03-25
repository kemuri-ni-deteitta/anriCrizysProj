import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser, AUTH_STATE } from './context/UserContext'

import Loading      from './screens/Loading'
import Registration from './screens/Registration'
import AdminLogin   from './screens/AdminLogin'
import Layout       from './components/Layout/Layout'
import Home         from './screens/Home'
import Tests        from './screens/Tests'
import TestResults  from './screens/TestResults'
import Results      from './screens/Results'
import Calendar     from './screens/Calendar'
import Reports      from './screens/Reports'
import Admin        from './screens/Admin'

function Router() {
  const { authState } = useUser()

  if (authState === AUTH_STATE.LOADING)      return <Loading />
  if (authState === AUTH_STATE.UNREGISTERED) return <Registration />
  if (authState === AUTH_STATE.ADMIN_LOGIN)  return <AdminLogin />

  // Authenticated — student or admin
  const isAdmin = authState === AUTH_STATE.ADMIN

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="tests/*"          element={<Tests />} />
          <Route path="results"          element={<Results />} />
          <Route path="results/:sessionId" element={<TestResults />} />
          <Route path="calendar"         element={<Calendar />} />
          <Route path="reports"          element={<Reports />} />
          {isAdmin && <Route path="admin/*" element={<Admin />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default function App() {
  return (
    <UserProvider>
      <Router />
    </UserProvider>
  )
}
