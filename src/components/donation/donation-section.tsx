"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/hooks/use-i18n';

// 捐赠链接配置 - 请替换为您的实际链接
const DONATION_LINKS = {
  crypto: {
    btc: 'bc1pyqygqqkplg0f9dt5ph8dhvnr4zeqaquh79zxty3w9c2jhqq3ch9s36gyn5',
    eth: '0xd0c058adfc561049b24fb3d15d87964f31e9b2df',
    usdt: '0xd0c058adfc561049b24fb3d15d87964f31e9b2df',
  }
};

export function DonationSection() {
  const { t } = useI18n();
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card className="mt-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent shadow-xl">
      <CardHeader className="space-y-3 pb-6" style={{ padding: '2rem 2rem 1.5rem 2rem' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <Heart className="h-5 w-5 text-primary fill-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{t('donation.title')}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              {t('donation.description')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6" style={{ padding: '0 2rem 2rem 2rem' }}>
        {/* 加密货币捐赠 */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">
            {t('donation.crypto.title')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('donation.crypto.description')}
          </p>
          <div className="space-y-2">
            {Object.entries(DONATION_LINKS.crypto).map(([chain, address]) => (
              <div 
                key={chain} 
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/70 transition-colors"
              >
                <span className="text-xs font-semibold text-primary min-w-[3rem] uppercase">
                  {chain}
                </span>
                <span className="text-xs font-mono flex-1 truncate text-muted-foreground">
                  {address}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy(address, chain)}
                  className="h-8 w-8 p-0 flex-shrink-0"
                  title={copied === chain ? t('donation.crypto.copied') : t('donation.crypto.copy')}
                >
                  {copied === chain ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* 底部感谢文字 */}
        <div className="pt-2">
          <p className="text-xs text-center text-muted-foreground">
            {t('donation.footer')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

