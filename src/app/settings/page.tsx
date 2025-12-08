"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CexManager } from "@/components/settings/cex-manager";
import { WalletManager } from "@/components/settings/wallet-manager";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

import { GeneralSettings } from "@/components/settings/general-settings";

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">设置</h1>
      </div>
      
      <Tabs defaultValue="cex" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cex">交易所 (CEX)</TabsTrigger>
          <TabsTrigger value="wallet">链上钱包 (On-Chain)</TabsTrigger>
          <TabsTrigger value="general">通用设置</TabsTrigger>
        </TabsList>
        <TabsContent value="cex">
          <CexManager />
        </TabsContent>
        <TabsContent value="wallet">
          <WalletManager />
        </TabsContent>
        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

