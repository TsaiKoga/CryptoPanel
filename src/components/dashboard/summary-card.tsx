"use client"

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Asset } from '@/types';
import { TrendingUp, Wallet, ArrowUpRight, ChevronDown, Check } from 'lucide-react';
import { ratesCache, currencyPreference, type DisplayCurrency } from '@/lib/storage';
import { useI18n } from '@/hooks/use-i18n';
import { fetchMarketRates } from '@/lib/api';
import { DEFAULT_USD_TO_CNY } from '@/lib/rates';
import { cn } from '@/lib/utils';

type Currency = DisplayCurrency;

const CURRENCY_OPTIONS: Currency[] = ['USD', 'CNY', 'BTC', 'ETH'];

export function SummaryCard({ assets, loading }: { assets: Asset[], loading: boolean }) {
  const { t } = useI18n();
  const [currency, setCurrency] = useState<Currency>('USD');
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [usdToCny, setUsdToCny] = useState<number>(DEFAULT_USD_TO_CNY);
  const [loadingRates, setLoadingRates] = useState(false);
  const [loadingDots, setLoadingDots] = useState(0);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const currencyMenuRef = useRef<HTMLDivElement>(null);

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

  // Chrome 扩展 popup 里 Radix Select Portal 常点不开；用本地下拉并在外部点击时关闭
  useEffect(() => {
    if (!currencyMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!currencyMenuRef.current?.contains(e.target as Node)) {
        setCurrencyMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCurrencyMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [currencyMenuOpen]);

  const selectCurrency = async (value: Currency) => {
    setCurrency(value);
    setCurrencyMenuOpen(false);
    await currencyPreference.set(value);
  };

  // 获取 BTC / ETH 价格和 USD 到 CNY 的汇率（带缓存）
  useEffect(() => {
    const loadRates = async () => {
      // 先从缓存读取
      const cached = await ratesCache.get();
      if (cached) {
        setBtcPrice(cached.btcPrice);
        setEthPrice(cached.ethPrice);
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
      let fetchedEthPrice = 0;
      let fetchedUsdToCny = DEFAULT_USD_TO_CNY;

      try {
        const rates = await fetchMarketRates();
        if (rates.btcPrice > 0) {
          fetchedBtcPrice = rates.btcPrice;
          setBtcPrice(fetchedBtcPrice);
        }
        if (rates.ethPrice > 0) {
          fetchedEthPrice = rates.ethPrice;
          setEthPrice(fetchedEthPrice);
        }
        if (rates.usdToCny > 0) {
          fetchedUsdToCny = rates.usdToCny;
          setUsdToCny(fetchedUsdToCny);
        }
      } catch (e) {
        console.warn('[SummaryCard] Failed to fetch market rates:', e);
      }

      // 行情 API 全失败时，尝试从已加载的资产取价
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
      if (fetchedEthPrice <= 0) {
        const ethAsset = assets.find(
          (a) =>
            a.price > 0 &&
            (a.symbol === 'ETH' ||
              a.symbol === 'WETH' ||
              a.symbol.split(' ')[0].trim() === 'ETH' ||
              a.symbol.split(' ')[0].trim() === 'WETH')
        );
        if (ethAsset) {
          fetchedEthPrice = ethAsset.price;
          setEthPrice(fetchedEthPrice);
        }
      }

      if (fetchedBtcPrice > 0 && fetchedUsdToCny > 0) {
        await ratesCache.set(fetchedBtcPrice, fetchedUsdToCny, fetchedEthPrice);
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
      case 'ETH':
        if (ethPrice > 0) {
          const ethValue = totalValueUsd / ethPrice;
          return `${ethValue.toLocaleString('en-US', {
            minimumFractionDigits: 6,
            maximumFractionDigits: 6,
          })} ETH`;
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
      case 'ETH':
        return 'ETH';
      default:
        return 'USD';
    }
  };

  return (
    <Card className="relative overflow-visible border-2 border-border/50 bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 group">
      {/* 渐变背景装饰 */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
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
            <div className="mt-1 relative" ref={currencyMenuRef}>
              <button
                type="button"
                data-slot="select-trigger"
                data-size="sm"
                aria-haspopup="listbox"
                aria-expanded={currencyMenuOpen}
                onClick={() => setCurrencyMenuOpen((open) => !open)}
                className={cn(
                  // Match SelectTrigger visuals used before the popup fix
                  'border-2 border-border bg-background text-foreground shadow-sm',
                  'flex h-10 w-24 items-center justify-between gap-2 rounded-xl px-3 text-xs font-medium whitespace-nowrap',
                  'transition-all duration-200 outline-none',
                  'hover:bg-accent/50 hover:border-primary/50 hover:shadow-md',
                  'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  currencyMenuOpen && 'border-primary ring-2 ring-ring ring-offset-2 shadow-md'
                )}
              >
                <span data-slot="select-value">{getCurrencySymbol()}</span>
                <ChevronDown
                  className={cn(
                    'size-4 shrink-0 opacity-60 transition-transform duration-200',
                    currencyMenuOpen && 'rotate-180'
                  )}
                />
              </button>
              {currencyMenuOpen && (
                <ul
                  role="listbox"
                  data-slot="select-content"
                  className="absolute left-0 top-full z-[100] mt-1 min-w-[6.5rem] overflow-hidden rounded-xl border-2 border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <li key={option}>
                      <button
                        type="button"
                        role="option"
                        data-slot="select-item"
                        aria-selected={currency === option}
                        onClick={() => void selectCurrency(option)}
                        className={cn(
                          'relative flex w-full cursor-default items-center justify-between gap-2 rounded-lg py-2.5 pl-3 pr-8 text-xs font-medium outline-none select-none',
                          'transition-colors duration-150 hover:bg-accent hover:text-accent-foreground',
                          currency === option && 'bg-accent text-accent-foreground'
                        )}
                      >
                        <span>{option}</span>
                        {currency === option && (
                          <Check className="absolute right-2.5 size-3.5 text-primary" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
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

