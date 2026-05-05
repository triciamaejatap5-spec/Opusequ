import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} catch (initErr) {
  console.error("Opusequ Initialization Error:", initErr);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="min-height: 100vh; background: #050505; color: #D4AF37; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-family: serif; padding: 20px;">
        <h1 style="font-style: italic;">Hello!</h1>
        <p style="font-size: 14px; opacity: 0.8;">System is checking your credentials. Please refresh in 1 minute.</p>
        <p style="font-size: 10px; opacity: 0.4; margin-top: 20px; text-transform: uppercase; letter-spacing: 2px;">Quezon City Working Students Productivity Hub</p>
      </div>
    `;
  }
}
