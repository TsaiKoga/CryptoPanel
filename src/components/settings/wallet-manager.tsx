"use client"

import { useState } from 'react';
import { useAssetStore } from '@/components/providers/asset-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Wallet } from 'lucide-react';

export function WalletManager() {
  const { wallets, addWallet, removeWallet } = useAssetStore();
  const [newWallet, setNewWallet] = useState({
    name: '',
    address: ''
  });

  const handleAdd = () => {
    if (newWallet.name && newWallet.address) {
      if (!newWallet.address.startsWith('0x') || newWallet.address.length !== 42) {
          alert("请输入有效的 EVM 钱包地址");
          return;
      }
      addWallet(newWallet);
      setNewWallet({ name: '', address: '' });
    }
  };

  return (
    <Card className="border-2 border-border/50 shadow-xl">
      <CardHeader className="space-y-3 pb-6" style={{ padding: '2rem 2rem 1.5rem 2rem' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">链上钱包管理</CardTitle>
            <CardDescription className="mt-1 text-sm">
              添加您的 EVM 钱包地址 (支持 ETH/BSC/Arb/Op/Base/zkSync/Soneium/X Layer)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8" style={{ padding: '0 2rem 2rem 2rem' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">备注名称</Label>
            <Input 
              placeholder="例如: MetaMask 1" 
              value={newWallet.name}
              onChange={e => setNewWallet({...newWallet, name: e.target.value})}
              className="h-12 rounded-xl border-2"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-semibold">钱包地址</Label>
            <Input 
              placeholder="0x..." 
              value={newWallet.address}
              onChange={e => setNewWallet({...newWallet, address: e.target.value})}
              className="h-12 rounded-xl border-2"
            />
          </div>
        </div>
        <Button 
          onClick={handleAdd} 
          className="w-full md:w-auto h-12 px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5 mr-2" /> 添加钱包
        </Button>

        <div className="mt-8 pt-8 border-t border-border/50">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            已添加的钱包
          </h3>
          {wallets.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-muted/30 border-2 border-dashed border-border/50">
              <p className="text-sm text-muted-foreground font-medium">暂无配置</p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-muted/50 to-transparent border-b-2">
                    <TableHead style={{ padding: '1.5rem 2rem' }}>名称</TableHead>
                    <TableHead style={{ padding: '1.5rem 2rem' }}>地址</TableHead>
                    <TableHead className="text-right" style={{ padding: '1.5rem 2rem' }}>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map((wallet) => (
                    <TableRow key={wallet.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold" style={{ padding: '1.5rem 2rem' }}>
                        {wallet.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs" style={{ padding: '1.5rem 2rem' }}>
                        <span className="text-muted-foreground break-all">
                          {wallet.address}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" style={{ padding: '1.5rem 2rem' }}>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeWallet(wallet.id)}
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
