import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Always use dark mode
document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(
  <App />
)
