import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext.jsx';
import { InternProvider } from './features/intern/context/internContext';
import ErrorBoundary from './shared/components/ErrorBoundary.jsx';
import './shared/services/axiosSetup.js';
import App from './app/App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <InternProvider>
          <App />
        </InternProvider>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);