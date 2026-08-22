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
import './index.css'

/* <DataProvider> wraps <App> so that EVERY page inside it can call
   useData() and read the same shared data. This is the one line that
   makes the "connected modules" behaviour possible. */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </React.StrictMode>
)
