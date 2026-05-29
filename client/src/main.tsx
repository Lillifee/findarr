import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';

// @ts-ignore
// oxlint-disable-next-line import/no-unassigned-import
import './index.css';

const rootElement = document.querySelector('#root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
