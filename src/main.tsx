import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)

if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Offline enhancement is optional; the app remains fully usable without the service worker.
    });
  });
}
