import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { store } from './store/index.js'
import { Provider } from 'react-redux'
import { initOfflineCache } from './utils/offlineCache'

initOfflineCache()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store }>
      <App />
    </Provider>
  </StrictMode>
)
