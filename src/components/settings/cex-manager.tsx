"use client"

import { useState } from 'react';
import { useAssetStore } from '@/components/providers/asset-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Key, Building2 } from 'lucide-react';
import { ExchangeType } from '@/types';
import { useI18n } from '@/hooks/use-i18n';

export function CexManager() {
  const { exchanges, addExchange, removeExchange } = useAssetStore();
  const { t } = useI18n();
  const [newExchange, setNewExchange] = useState({
    type: 'binance' as ExchangeType,
    name: '',
    apiKey: '',
    secret: '',
    password: ''
  });

  const handleAdd = () => {
    if (newExchange.name && newExchange.apiKey && newExchange.secret) {
      if (newExchange.type === 'okx' && !newExchange.password) {
          return; 
      }
      addExchange(newExchange);
      setNewExchange({ type: 'binance', name: '', apiKey: '', secret: '', password: '' });
    }
  };

  return (
    <Card className="border-2 border-border/50 shadow-xl">
      <CardHeader className="space-y-3 pb-6" style={{ padding: '2rem 2rem 1.5rem 2rem' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{t('cexManager.title')}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              {t('cexManager.subtitle')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8" style={{ padding: '0 2rem 2rem 2rem' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('cexManager.exchange')}</Label>
            <Select 
              value={newExchange.type} 
              onValueChange={(v: ExchangeType) => setNewExchange({...newExchange, type: v})}
            >
              <SelectTrigger className="h-12 rounded-xl border-2">
                <SelectValue placeholder={t('cexManager.exchangePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="binance">Binance</SelectItem>
                <SelectItem value="okx">OKX</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('cexManager.name')}</Label>
            <Input 
              placeholder={t('cexManager.namePlaceholder')} 
              value={newExchange.name}
              onChange={e => setNewExchange({...newExchange, name: e.target.value})}
              className="h-12 rounded-xl border-2"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Key className="h-4 w-4" />
              {t('cexManager.apiKey')}
            </Label>
            <Input 
              type="password"
              placeholder={t('cexManager.apiKey')} 
              value={newExchange.apiKey}
              onChange={e => setNewExchange({...newExchange, apiKey: e.target.value})}
              className="h-12 rounded-xl border-2"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('cexManager.secretKey')}</Label>
            <Input 
              type="password"
              placeholder={t('cexManager.secretKey')} 
              value={newExchange.secret}
              onChange={e => setNewExchange({...newExchange, secret: e.target.value})}
              className="h-12 rounded-xl border-2"
            />
          </div>
          {newExchange.type === 'okx' && (
            <div className="space-y-3 md:col-span-2">
              <Label className="text-sm font-semibold">{t('cexManager.passphrase')}</Label>
              <Input 
                type="password"
                placeholder={t('cexManager.passphrasePlaceholder')} 
                value={newExchange.password}
                onChange={e => setNewExchange({...newExchange, password: e.target.value})}
                className="h-12 rounded-xl border-2"
              />
            </div>
          )}
        </div>
        <Button 
          onClick={handleAdd} 
          className="w-full md:w-auto h-12 px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5 mr-2" /> {t('cexManager.addExchange')}
        </Button>

        <div className="mt-8 pt-8 border-t border-border/50">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t('cexManager.addedExchanges')}
          </h3>
          {exchanges.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-muted/30 border-2 border-dashed border-border/50">
              <p className="text-sm text-muted-foreground font-medium">{t('cexManager.noConfig')}</p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-muted/50 to-transparent border-b-2">
                    <TableHead style={{ padding: '1.5rem 2rem' }}>{t('cexManager.name')}</TableHead>
                    <TableHead style={{ padding: '1.5rem 2rem' }}>{t('cexManager.exchange')}</TableHead>
                    <TableHead style={{ padding: '1.5rem 2rem' }}>{t('cexManager.apiKey')}</TableHead>
                    <TableHead className="text-right" style={{ padding: '1.5rem 2rem' }}>{t('cexManager.operation')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exchanges.map((exchange) => (
                    <TableRow key={exchange.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold" style={{ padding: '1.5rem 2rem' }}>
                        {exchange.name}
                      </TableCell>
                      <TableCell style={{ padding: '1.5rem 2rem' }}>
                        <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium text-sm capitalize">
                          {exchange.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs" style={{ padding: '1.5rem 2rem' }}>
                        <span className="text-muted-foreground">
                          {exchange.apiKey.slice(0, 6)}...{exchange.apiKey.slice(-4)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" style={{ padding: '1.5rem 2rem' }}>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeExchange(exchange.id)}
                          className="h-9 w-9 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

