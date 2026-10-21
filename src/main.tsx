import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import EnvWarning from './components/EnvWarning'
import './styles/global.css'
import './styles/motion.css'
import { watchImageLoads } from './lib/imageLoad'

watchImageLoads()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <EnvWarning />
    <App />
  </React.StrictMode>,
)
