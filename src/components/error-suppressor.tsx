"use client"

import { useEffect } from 'react';

export function ErrorSuppressor() {
  useEffect(() => {
    // Suppress MetaMask connection errors - this app only needs addresses, not wallet connections
    const originalError = console.error;
    console.error = function(...args: any[]) {
      const message = args.join(' ');
      // Ignore MetaMask connection errors
      if (message.includes('Failed to connect to MetaMask') || 
          (message.includes('MetaMask') && message.includes('connect'))) {
        return; // Silently ignore
      }
      originalError.apply(console, args);
    };

    // Also suppress unhandled promise rejections related to MetaMask
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason || '');
      if (message.includes('Failed to connect to MetaMask') || 
          (message.includes('MetaMask') && message.includes('connect'))) {
        event.preventDefault(); // Prevent the error from showing in console
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = originalError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
