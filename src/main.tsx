import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)

if ('serviceWorker' in navigator) window.addEventListener('load', () => { try { if (localStorage.getItem('fit-picker:offline') === '1') navigator.serviceWorker.register('/sw.js').catch(() => {}) } catch { /* Online use remains available. */ } })
