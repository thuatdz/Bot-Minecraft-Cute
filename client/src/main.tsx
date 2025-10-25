import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers - suppress development noise
window.addEventListener('unhandledrejection', (event) => {
  // Always prevent default to suppress console errors
  event.preventDefault();
  
  // Only log actual application errors in development
  if (import.meta.env.DEV) {
    const reason = event.reason;
    if (reason && typeof reason === 'object') {
      const message = reason.message || String(reason);
      
      // Skip all Vite/HMR/WebSocket/fetch related errors
      if (message.includes('WebSocket') || 
          message.includes('vite') ||
          message.includes('Failed to fetch') ||
          message.includes('fetch') ||
          message.includes('connection') ||
          message.toLowerCase().includes('hmr') ||
          message.includes('ECONNREFUSED') ||
          message.includes('NetworkError')) {
        return; // Silent skip
      }
      
      // Only log real application errors
      console.warn('App error:', reason);
    }
  }
});

window.addEventListener('error', (event) => {
  // Skip all development infrastructure errors
  if (import.meta.env.DEV && event.error?.message) {
    const message = event.error.message;
    if (message.includes('WebSocket') ||
        message.includes('vite') ||
        message.includes('fetch') ||
        message.includes('connection') ||
        message.toLowerCase().includes('hmr')) {
      return; // Silent skip
    }
    console.warn('App error:', event.error);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
