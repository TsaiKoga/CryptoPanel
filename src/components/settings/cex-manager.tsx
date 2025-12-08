"use client"

import { useState } from 'react';
import { useAssetStore } from '@/components/providers/asset-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';
import { ExchangeType } from '@/types';

export function CexManager() {
  const { exchanges, addExchange, removeExchange } = useAssetStore();
  const [newExchange, setNewExchange] = useState({
    type: 'binance' as ExchangeType,
    name: '',
    apiKey: '',
    secret: ''
  });

  const handleAdd = () => {
    if (newExchange.name && newExchange.apiKey && newExchange.secret) {
      addExchange(newExchange);
      setNewExchange({ type: 'binance', name: '', apiKey: '', secret: '' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>交易所 API 管理</CardTitle>
        <CardDescription>添加您的 Binance 或 OKX API Key (仅保存在本地)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>交易所</Label>
            <Select 
              value={newExchange.type} 
              onValueChange={(v: ExchangeType) => setNewExchange({...newExchange, type: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择交易所" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="binance">Binance</SelectItem>
                <SelectItem value="okx">OKX</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>备注名称</Label>
            <Input 
              placeholder="例如: 主账号" 
              value={newExchange.name}
              onChange={e => setNewExchange({...newExchange, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input 
              type="password"
              placeholder="API Key" 
              value={newExchange.apiKey}
              onChange={e => setNewExchange({...newExchange, apiKey: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Secret Key</Label>
            <Input 
              type="password"
              placeholder="Secret Key" 
              value={newExchange.secret}
              onChange={e => setNewExchange({...newExchange, secret: e.target.value})}
            />
          </div>
        </div>
        <Button onClick={handleAdd} className="w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" /> 添加交易所
        </Button>

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">已添加的交易所</h3>
          {exchanges.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无配置</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>交易所</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchanges.map((exchange) => (
                  <TableRow key={exchange.id}>
                    <TableCell>{exchange.name}</TableCell>
                    <TableCell className="capitalize">{exchange.type}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {exchange.apiKey.slice(0, 6)}...{exchange.apiKey.slice(-4)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeExchange(exchange.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

