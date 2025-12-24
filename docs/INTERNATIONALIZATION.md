# 国际化说明

## 概述

CryptoPanel 支持多语言切换，目前支持中文和英文。所有 UI 文本都通过国际化系统管理。

## 实现方式

### 翻译文件

**位置**：`src/lib/i18n.ts`

**结构**：
```typescript
export const translations = {
  zh: {
    dashboard: { ... },
    settings: { ... },
    // ...
  },
  en: {
    dashboard: { ... },
    settings: { ... },
    // ...
  },
};
```

### 翻译函数

**函数**：`getTranslation(lang, key, params?)`

**功能**：
- 根据语言获取翻译文本
- 支持参数替换（如 `{count}`）
- 如果翻译不存在，回退到中文

**示例**：
```typescript
getTranslation('en', 'dashboard.assetCount', { count: 10 });
// 返回: "Contains 10 assets"
```

### useI18n Hook

**位置**：`src/hooks/use-i18n.ts`

**功能**：
- 从 AssetProvider 获取当前语言设置
- 提供 `t` 函数用于翻译
- 返回当前语言

**使用示例**：
```typescript
import { useI18n } from '@/hooks/use-i18n';

function MyComponent() {
  const { t, language } = useI18n();
  
  return <div>{t('dashboard.title')}</div>;
}
```

## 语言设置

### 语言类型

```typescript
export type Language = 'zh' | 'en';
```

### 默认语言

- 默认：`'zh'`（中文）
- 存储在 `AppSettings.language`

### 语言切换

**位置**：`src/components/settings/general-settings.tsx`

**实现**：
- 使用 Select 组件选择语言
- 切换后立即更新 Context
- 自动保存到 Chrome Storage

## 翻译键命名规范

### 层级结构

使用点号分隔的层级结构：

```
模块.子模块.具体项
```

**示例**：
- `dashboard.title` - 仪表板标题
- `settings.language` - 设置语言
- `cexManager.title` - CEX 管理标题

### 命名约定

1. **使用小写字母**
2. **使用点号分隔层级**
3. **使用驼峰命名具体项**
4. **保持一致性**

## 添加新翻译

### 1. 在翻译文件中添加

**位置**：`src/lib/i18n.ts`

```typescript
export const translations = {
  zh: {
    newModule: {
      title: '新模块标题',
      description: '新模块描述',
    },
  },
  en: {
    newModule: {
      title: 'New Module Title',
      description: 'New Module Description',
    },
  },
};
```

### 2. 在组件中使用

```typescript
import { useI18n } from '@/hooks/use-i18n';

function NewComponent() {
  const { t } = useI18n();
  
  return (
    <div>
      <h1>{t('newModule.title')}</h1>
      <p>{t('newModule.description')}</p>
    </div>
  );
}
```

### 3. 使用参数

**翻译定义**：
```typescript
assetCount: '包含 {count} 个资产',
```

**使用**：
```typescript
t('dashboard.assetCount', { count: 10 });
// 返回: "包含 10 个资产"
```

## 翻译模块

### Dashboard 模块

- `dashboard.title` - 资产看板
- `dashboard.subtitle` - 统一管理您的加密货币资产
- `dashboard.totalAssets` - 总资产估值
- `dashboard.assetCount` - 包含 {count} 个资产
- `dashboard.assetDistribution` - 资产分布
- `dashboard.calculating` - 计算中...
- `dashboard.loading` - 加载中...
- `dashboard.noAssets` - 暂无资产数据
- `dashboard.noAssetsDesc` - 请在设置中添加 API Key 或钱包地址
- `dashboard.noData` - 暂无数据
- `dashboard.refresh` - 刷新
- `dashboard.settings` - 设置

### Settings 模块

- `settings.pageTitle` - 设置
- `settings.cexTab` - 交易所 (CEX)
- `settings.walletTab` - 链上钱包 (On-Chain)
- `settings.generalTab` - 通用设置
- `settings.title` - 通用设置
- `settings.subtitle` - 配置显示偏好
- `settings.language` - 语言
- `settings.languageDesc` - 选择界面显示语言
- `settings.hideSmallAssets` - 隐藏小额资产
- `settings.hideSmallAssetsDesc` - 隐藏价值低于阈值的资产
- `settings.hideSmallAssetsWarning` - 注意提示
- `settings.smallAssetsThreshold` - 小额资产阈值 (USD)
- `settings.smallAssetsThresholdPlaceholder` - 例如: 1

### CEX Manager 模块

- `cexManager.title` - 交易所 API 管理
- `cexManager.subtitle` - 添加您的 Binance 或 OKX API Key
- `cexManager.exchange` - 交易所
- `cexManager.exchangePlaceholder` - 选择交易所
- `cexManager.name` - 备注名称
- `cexManager.namePlaceholder` - 例如: 主账号
- `cexManager.apiKey` - API Key
- `cexManager.secretKey` - Secret Key
- `cexManager.passphrase` - Passphrase (OKX)
- `cexManager.passphrasePlaceholder` - API Passphrase
- `cexManager.addExchange` - 添加交易所
- `cexManager.addedExchanges` - 已添加的交易所
- `cexManager.noConfig` - 暂无配置
- `cexManager.operation` - 操作

### Wallet Manager 模块

- `walletManager.title` - 钱包地址管理
- `walletManager.subtitle` - 添加您的链上钱包地址
- `walletManager.address` - 钱包地址
- `walletManager.addressPlaceholder` - 例如: 0x1234...
- `walletManager.name` - 备注名称
- `walletManager.namePlaceholder` - 例如: 主钱包
- `walletManager.addWallet` - 添加钱包
- `walletManager.addedWallets` - 已添加的钱包
- `walletManager.noConfig` - 暂无配置
- `walletManager.operation` - 操作
- `walletManager.invalidAddress` - 请输入有效的 EVM 钱包地址

### Asset Table 模块

- `assetTable.symbol` - 币种
- `assetTable.amount` - 数量
- `assetTable.price` - 单价 (USD)
- `assetTable.value` - 总值 (USD)
- `assetTable.source` - 来源

### Tabs 模块

- `tabs.all` - 全部汇总
- `tabs.cex` - 交易所
- `tabs.wallet` - 钱包

### Errors 模块

- `errors.okxPassphraseError` - OKX Passphrase 错误
- `errors.okxPassphraseErrorDesc` - 错误描述

### Theme 模块

- `theme.light` - 浅色
- `theme.dark` - 深色
- `theme.system` - 跟随系统

## 语言切换流程

```
用户选择语言
  ↓
updateSettings({ language: 'en' })
  ↓
AssetProvider Context 更新
  ↓
保存到 Chrome Storage
  ↓
所有使用 useI18n 的组件重新渲染
  ↓
t() 函数返回新语言的翻译
  ↓
UI 更新显示新语言
```

## 最佳实践

### 1. 始终使用翻译函数

❌ **错误**：
```typescript
<h1>资产看板</h1>
```

✅ **正确**：
```typescript
<h1>{t('dashboard.title')}</h1>
```

### 2. 使用有意义的键名

❌ **错误**：
```typescript
t('text1')
```

✅ **正确**：
```typescript
t('dashboard.title')
```

### 3. 保持翻译完整

确保所有语言都有对应的翻译，避免显示键名。

### 4. 使用参数而非字符串拼接

❌ **错误**：
```typescript
t('dashboard.assetCount') + ' ' + count
```

✅ **正确**：
```typescript
t('dashboard.assetCount', { count })
```

### 5. 测试所有语言

在开发过程中，切换语言测试所有功能，确保翻译正确且完整。

## 添加新语言

### 1. 更新类型定义

```typescript
export type Language = 'zh' | 'en' | 'ja'; // 添加日语
```

### 2. 添加翻译对象

```typescript
export const translations = {
  zh: { ... },
  en: { ... },
  ja: { ... }, // 添加日语翻译
};
```

### 3. 更新语言选择器

```typescript
<SelectItem value="ja">日本語</SelectItem>
```

### 4. 确保所有键都有翻译

检查所有翻译键在新语言中都有对应的值。

