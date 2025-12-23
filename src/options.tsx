import React from 'react';
import ReactDOM from 'react-dom/client';
import { AssetProvider } from '@/components/providers/asset-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import SettingsPage from '@/app/settings/page';
import '@/app/globals.css';

function Options() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AssetProvider>
        <SettingsPage />
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
    <Options />
  </React.StrictMode>
);

// 确保页面可见
document.body.style.visibility = 'visible';

