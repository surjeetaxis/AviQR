import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext.jsx';
import { CustomerAuthProvider } from './context/CustomerAuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import UpdateAvailableBanner from './components/UpdateAvailableBanner.jsx';
import { registerServiceWorker } from './pwa/registerServiceWorker.js';
import { initAnalytics } from './analytics.js';
import CaptchaPrompt from './components/shared/CaptchaPrompt.jsx';
import StepUpPrompt from './components/shared/StepUpPrompt.jsx';
import App from './App.jsx';
import './styles/index.css';
import './styles/hospitality.css';

registerServiceWorker();
initAnalytics();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <CustomerAuthProvider>
            <CartProvider>
              <OfflineBanner />
              <UpdateAvailableBanner />
              <App />
              <StepUpPrompt />
              <CaptchaPrompt />
            </CartProvider>
          </CustomerAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
