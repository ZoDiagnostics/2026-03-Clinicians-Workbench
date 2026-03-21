import React from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from './lib/store';
import { I18nProvider } from './lib/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Router } from './lib/router';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found — check index.html has <div id="root"></div>');

createRoot(rootEl).render(
  <React.StrictMode>
    <StoreProvider>
      <I18nProvider>
        <ErrorBoundary context="App Root">
          <Router />
        </ErrorBoundary>
      </I18nProvider>
    </StoreProvider>
  </React.StrictMode>
);
