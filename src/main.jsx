/**
 * THE STARTING POINT OF THE WHOLE APP
 * ===================================
 * index.html loads this one file, and this file loads everything else.
 *
 * Reading order for the project:
 *   index.html  ->  src/main.jsx (you are here)  ->  src/App.jsx  ->  pages
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { DataProvider } from './store/DataContext'
import { AuthProvider } from './store/AuthContext'
import './index.css'

/* TWO PROVIDERS, AND THE ORDER MATTERS.
   <DataProvider> holds the expedition data. <AuthProvider> holds who is
   signed in. Data is on the OUTSIDE so that the sign-in screen can read it —
   that is how src/pages/Login.jsx shows the real expedition and personnel
   counts before anybody has signed in.

   <DataProvider> wrapping <App> is the one line that makes the "connected
   modules" behaviour possible: every page inside it calls useData() and
   reads the same shared records. */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DataProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </DataProvider>
  </React.StrictMode>
)
