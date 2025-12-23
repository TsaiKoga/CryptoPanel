import React from 'react';
import ReactDOM from 'react-dom/client';
import { AssetProvider } from '@/components/providers/asset-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import Dashboard from '@/app/page';
import '@/app/globals.css';

function Popup() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AssetProvider>
        <Dashboard />
        <Toaster />
      </AssetProvider>
    </ThemeProvider>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);

// 确保页面可见（移除任何隐藏样式）
document.body.style.visibility = 'visible';

