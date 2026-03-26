import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api'

const UserContext = createContext(null)

// Possible auth states
export const AUTH_STATE = {
  LOADING: 'loading',
  UNREGISTERED: 'unregistered',
  ADMIN_LOGIN: 'admin_login',
  STUDENT: 'student',
  ADMIN: 'admin'
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authState, setAuthState] = useState(AUTH_STATE.LOADING)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const data = await api.get('/user')
      setUser(data)
      setAuthState(AUTH_STATE.STUDENT)
    } catch (err) {
      if (err.message === 'User not registered') {
        setAuthState(AUTH_STATE.UNREGISTERED)
      } else {
        // Backend not ready yet — retry after a short delay
        setTimeout(checkUser, 1000)
      }
    }
  }

  async function register(lastName, firstName, group) {
    const data = await api.post('/user', {
      last_name: lastName,
      first_name: firstName,
      group
    })
    setUser(data)
    setAuthState(AUTH_STATE.STUDENT)
  }

  async function adminLogin(password) {
    const data = await api.post('/user/admin-login', {
      login: 'admin',
      password
    })
    setUser({ id: 'admin', last_name: 'Администратор', first_name: '', group: '', role: 'admin' })
    setAuthState(AUTH_STATE.ADMIN)
  }

  function requestAdminLogin() {
    setAuthState(AUTH_STATE.ADMIN_LOGIN)
  }

  function backToRegistration() {
    setAuthState(AUTH_STATE.UNREGISTERED)
  }

  async function updateUser(fields) {
    const data = await api.put('/user', fields)
    setUser(data)
    return data
  }

  async function logout() {
    try {
      await api.delete('/user')
    } catch {
      // Admin has no user.json — ignore errors
    }
    setUser(null)
    setAuthState(AUTH_STATE.UNREGISTERED)
  }

  return (
    <UserContext.Provider value={{
      user, authState,
      register, adminLogin, requestAdminLogin, backToRegistration, updateUser, logout
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
