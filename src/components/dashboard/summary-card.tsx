"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Asset } from '@/types';
import { TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
import { ratesCache, currencyPreference } from '@/lib/storage';
import { useI18n } from '@/hooks/use-i18n';
import { fetchMarketRates } from '@/lib/api';
import { DEFAULT_USD_TO_CNY } from '@/lib/rates';

type Currency = 'USD' | 'CNY' | 'BTC';

export function SummaryCard({ assets, loading }: { assets: Asset[], loading: boolean }) {
  const { t } = useI18n();
  const [currency, setCurrency] = useState<Currency>('USD');
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [usdToCny, setUsdToCny] = useState<number>(DEFAULT_USD_TO_CNY);
  const [loadingRates, setLoadingRates] = useState(false);
  const [loadingDots, setLoadingDots] = useState(0);

  const totalValueUsd = assets.reduce((sum, asset) => sum + asset.valueUsd, 0);
  const assetCount = assets.length;
  const hasPartialLoadWarning =
    assets.some((a) => a.loadFailed) ||
    assets.some((a) => a.amount > 0 && a.price === 0);

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
    const loadRates = async () => {
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
      let fetchedUsdToCny = DEFAULT_USD_TO_CNY;

      try {
        const rates = await fetchMarketRates();
        if (rates.btcPrice > 0) {
          fetchedBtcPrice = rates.btcPrice;
          setBtcPrice(fetchedBtcPrice);
        }
        if (rates.usdToCny > 0) {
          fetchedUsdToCny = rates.usdToCny;
          setUsdToCny(fetchedUsdToCny);
        }
      } catch (e) {
        console.warn('[SummaryCard] Failed to fetch market rates:', e);
      }

      // 行情 API 全失败时，尝试从已加载的 BTC 资产取价
      if (fetchedBtcPrice <= 0) {
        const btcAsset = assets.find(
          (a) =>
            a.price > 0 &&
            (a.symbol === 'BTC' || a.symbol.split(' ')[0].trim() === 'BTC')
        );
        if (btcAsset) {
          fetchedBtcPrice = btcAsset.price;
          setBtcPrice(fetchedBtcPrice);
        }
      }

      if (fetchedBtcPrice > 0 && fetchedUsdToCny > 0) {
        await ratesCache.set(fetchedBtcPrice, fetchedUsdToCny);
      }
    };

    const updateRatesInBackground = async (): Promise<void> => {
      // 后台更新，不显示加载状态
      await updateRates();
    };

    loadRates();
    // 每 30 分钟更新一次汇率（与缓存过期时间一致）
    const interval = setInterval(updateRatesInBackground, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [assets]);

  // 加载时循环显示省略号
  useEffect(() => {
    if (!loading && !loadingRates) {
      setLoadingDots(0);
      return;
    }

    const id = window.setInterval(() => {
      setLoadingDots((d) => (d + 1) % 4);
    }, 450);

    return () => window.clearInterval(id);
  }, [loading, loadingRates]);

  // 根据选择的货币计算总值
  const getDisplayValue = (): string => {
    if (loading || loadingRates) {
      const base = t('dashboard.loading').replace(/[.\u2026]+$/, '');
      return `${base}${'.'.repeat(loadingDots)}`;
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
              {getDisplayValue()}
            </div>
            {!loading && !loadingRates && totalValueUsd > 0 && (
              <ArrowUpRight className="h-5 w-5 text-primary/70" />
            )}
          </div>
          {!loading && !loadingRates && hasPartialLoadWarning && (
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {t('dashboard.partialLoadWarning')}
            </div>
          )}
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

