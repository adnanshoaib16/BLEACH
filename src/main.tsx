import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/index.css';

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Missing #root element — check index.html');
}

createRoot(container).render(
  // StrictMode double-invokes effects in development, which is the cheapest
  // test there is for the Three.js teardown path: if the scene leaked a
  // context or a geometry, the second mount would show it immediately.
  <StrictMode>
    <App />
  </StrictMode>,
);
