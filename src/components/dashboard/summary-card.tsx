"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Asset } from '@/types';
import { TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
import { ratesCache, currencyPreference } from '@/lib/storage';
import { useI18n } from '@/hooks/use-i18n';

type Currency = 'USD' | 'CNY' | 'BTC';

export function SummaryCard({ assets, loading }: { assets: Asset[], loading: boolean }) {
  const { t } = useI18n();
  const [currency, setCurrency] = useState<Currency>('USD');
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [usdToCny, setUsdToCny] = useState<number>(7.2); // 默认汇率，如果API失败则使用此值
  const [loadingRates, setLoadingRates] = useState(false);

  const totalValueUsd = assets.reduce((sum, asset) => sum + asset.valueUsd, 0);
  const assetCount = assets.length;

  // 初始化时从存储中读取上次选择的货币单位
  useEffect(() => {
    const loadCurrencyPreference = async () => {
      const savedCurrency = await currencyPreference.get();
      if (savedCurrency) {
        setCurrency(savedCurrency);
      }
    };
    loadCurrencyPreference();
  }, []);

  // 获取 BTC 价格和 USD 到 CNY 的汇率（带缓存）
  useEffect(() => {
    const fetchRates = async () => {
      // 先从缓存读取
      const cached = await ratesCache.get();
      if (cached) {
        setBtcPrice(cached.btcPrice);
        setUsdToCny(cached.usdToCny);
        setLoadingRates(false);
        // 如果缓存存在，仍然在后台更新（不阻塞UI）
        updateRatesInBackground();
        return;
      }

      // 缓存不存在或已过期，立即获取
      setLoadingRates(true);
      await updateRates();
      setLoadingRates(false);
    };

    const updateRates = async (): Promise<void> => {
      let fetchedBtcPrice = 0;
      let fetchedUsdToCny = 7.2; // 默认值

      // 获取 BTC 价格
      try {
        const btcResponse = await fetch('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD');
        const btcData = await btcResponse.json();
        if (btcData.USD) {
          fetchedBtcPrice = btcData.USD;
          setBtcPrice(fetchedBtcPrice);
        }
      } catch (e) {
        console.error('Failed to fetch BTC price:', e);
      }

      // 获取 USD 到 CNY 的汇率
      try {
        const cnyResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const cnyData = await cnyResponse.json();
        if (cnyData.rates && cnyData.rates.CNY) {
          fetchedUsdToCny = cnyData.rates.CNY;
          setUsdToCny(fetchedUsdToCny);
        }
      } catch (e) {
        console.error('Failed to fetch USD/CNY rate:', e);
        // 如果 API 失败，尝试备用 API
        try {
          const backupResponse = await fetch('https://api.fixer.io/latest?base=USD&symbols=CNY');
          const backupData = await backupResponse.json();
          if (backupData.rates && backupData.rates.CNY) {
            fetchedUsdToCny = backupData.rates.CNY;
            setUsdToCny(fetchedUsdToCny);
          }
        } catch (e2) {
          console.error('Failed to fetch USD/CNY rate from backup API:', e2);
        }
      }

      // 保存到缓存（只有当获取到有效数据时才保存）
      if (fetchedBtcPrice > 0 && fetchedUsdToCny > 0) {
        await ratesCache.set(fetchedBtcPrice, fetchedUsdToCny);
      }
    };

    const updateRatesInBackground = async (): Promise<void> => {
      // 后台更新，不显示加载状态
      await updateRates();
    };

    fetchRates();
    // 每 30 分钟更新一次汇率（与缓存过期时间一致）
    const interval = setInterval(updateRatesInBackground, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 根据选择的货币计算总值
  const getDisplayValue = (): string => {
    if (loading || loadingRates) {
      return t('dashboard.calculating');
    }

    switch (currency) {
      case 'USD':
        return `$${totalValueUsd.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`;
      case 'CNY':
        const cnyValue = totalValueUsd * usdToCny;
        return `¥${cnyValue.toLocaleString('zh-CN', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`;
      case 'BTC':
        if (btcPrice > 0) {
          const btcValue = totalValueUsd / btcPrice;
          return `${btcValue.toLocaleString('en-US', { 
            minimumFractionDigits: 8, 
            maximumFractionDigits: 8 
          })} BTC`;
        }
          return t('dashboard.loading');
        default:
        return `$${totalValueUsd.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`;
    }
  };

  const getCurrencySymbol = (): string => {
    switch (currency) {
      case 'USD':
        return 'USD';
      case 'CNY':
        return 'CNY';
      case 'BTC':
        return 'BTC';
      default:
        return 'USD';
    }
  };

  return (
    <Card className="relative overflow-hidden border-2 border-border/50 bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 group">
      {/* 渐变背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      
      <CardHeader 
        className="relative flex flex-row items-center justify-between space-y-0 pb-6"
        style={{ padding: '2rem 2rem 1.5rem 2rem' }}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t('dashboard.totalAssets')}
            </CardTitle>
            <div className="mt-1">
              <Select 
                value={currency} 
                onValueChange={async (value: Currency) => {
                  setCurrency(value);
                  // 保存用户选择的货币单位
                  await currencyPreference.set(value);
                }}
              >
                <SelectTrigger className="h-8 w-20 text-xs font-medium border-border/50 bg-background/50 hover:bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-muted/50">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent 
        className="relative"
        style={{ padding: '0 2rem 2rem 2rem' }}
      >
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <div className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/95 to-foreground/80 bg-clip-text text-transparent">
              {loading || loadingRates ? (
                <span className="inline-flex items-center gap-2 text-3xl">
                  <span className="animate-pulse">计算中...</span>
                </span>
              ) : (
                getDisplayValue()
              )}
            </div>
            {!loading && !loadingRates && totalValueUsd > 0 && (
              <ArrowUpRight className="h-5 w-5 text-primary/70" />
            )}
          </div>
          <div className="flex items-center gap-2.5 pt-2 border-t border-border/50">
            <div className="h-2 w-2 rounded-full bg-primary shadow-lg shadow-primary/50 animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('dashboard.assetCount', { count: assetCount })}
                  </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

