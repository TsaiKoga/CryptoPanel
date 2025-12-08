"use client"

import { useState } from 'react';
import { useAssetStore } from '@/components/providers/asset-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';

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
    <Card>
      <CardHeader>
        <CardTitle>链上钱包管理</CardTitle>
        <CardDescription>添加您的 EVM 钱包地址 (支持 ETH/BSC/Arb/Op/Base/zkSync/Soneium/X Layer)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>备注名称</Label>
            <Input 
              placeholder="例如: MetaMask 1" 
              value={newWallet.name}
              onChange={e => setNewWallet({...newWallet, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>钱包地址</Label>
            <Input 
              placeholder="0x..." 
              value={newWallet.address}
              onChange={e => setNewWallet({...newWallet, address: e.target.value})}
            />
          </div>
        </div>
        <Button onClick={handleAdd} className="w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" /> 添加钱包
        </Button>

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">已添加的钱包</h3>
          {wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无配置</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>地址</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell>{wallet.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {wallet.address}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeWallet(wallet.id)}
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

