"use client"

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CexManager } from "@/components/settings/cex-manager";
import { WalletManager } from "@/components/settings/wallet-manager";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { isChromeExtension } from '@/lib/storage';
import { GeneralSettings } from "@/components/settings/general-settings";
import { DonationSection } from "@/components/donation/donation-section";
import { useI18n } from '@/hooks/use-i18n';

export default function SettingsPage() {
  const { t } = useI18n();
  const [defaultTab, setDefaultTab] = useState<string>('cex');

  useEffect(() => {
    const initTab = async () => {
      let tabToOpen = 'cex';
      
      // 检查 Chrome storage（用于扩展内跳转）
      if (isChromeExtension && chrome.storage) {
        try {
          const result = await new Promise<{ openTab?: string }>((resolve) => {
            chrome.storage.local.get(['openTab'], resolve);
          });
          if (result.openTab && ['cex', 'wallet', 'general', 'donation'].includes(result.openTab)) {
            tabToOpen = result.openTab;
            // 清除存储，避免下次打开时还跳转
            chrome.storage.local.remove(['openTab']);
          }
        } catch (e) {
          console.error('Failed to read chrome.storage:', e);
        }
      }
      
      // 检查 URL 参数（用于 Web 版本）
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        const hash = window.location.hash.replace('#', '');
        
        if (tabParam && ['cex', 'wallet', 'general', 'donation'].includes(tabParam)) {
          tabToOpen = tabParam;
        } else if (hash && ['cex', 'wallet', 'general', 'donation'].includes(hash)) {
          tabToOpen = hash;
        }
      }
      
      setDefaultTab(tabToOpen);
    };
    
    initTab();
  }, []);

  const goBack = () => {
    if (isChromeExtension) {
      window.close();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center gap-4 pb-6 border-b border-border/60">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goBack}
            className="h-10 w-10 rounded-xl border-2 hover:border-primary/50"
          >
            <ArrowLeft 
              className="h-4 w-4"
              style={{
                color: 'var(--foreground)',
                stroke: 'var(--foreground)',
              }}
            />
          </Button>
          <h1 className="text-4xl font-bold tracking-tight">{t('settings.pageTitle')}</h1>
        </div>
        
        <Tabs value={defaultTab} onValueChange={setDefaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-14 rounded-xl border-2 border-border/50 bg-muted/30 p-1.5">
            <TabsTrigger 
              value="cex"
              className="rounded-lg font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md"
            >
              {t('settings.cexTab')}
            </TabsTrigger>
            <TabsTrigger 
              value="wallet"
              className="rounded-lg font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md"
            >
              {t('settings.walletTab')}
            </TabsTrigger>
            <TabsTrigger 
              value="general"
              className="rounded-lg font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md"
            >
              {t('settings.generalTab')}
            </TabsTrigger>
            <TabsTrigger 
              value="donation"
              className="rounded-lg font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md"
            >
              {t('settings.donationTab')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cex" className="mt-8">
            <CexManager />
          </TabsContent>
          <TabsContent value="wallet" className="mt-8">
            <WalletManager />
          </TabsContent>
          <TabsContent value="general" className="mt-8">
            <GeneralSettings />
          </TabsContent>
          <TabsContent value="donation" className="mt-8">
            <DonationSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

