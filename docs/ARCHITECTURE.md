# 架构说明

## 整体架构

CryptoPanel 采用 Chrome Extension Manifest V3 架构，主要包含以下部分：

### 1. 前端（Popup/Options Pages）

- **技术栈**：React + TypeScript + Tailwind CSS
- **入口文件**：
  - `src/popup.tsx` - 弹窗页面入口
  - `src/options.tsx` - 设置页面入口
- **主要页面**：
  - `src/app/page.tsx` - 主仪表板
  - `src/app/settings/page.tsx` - 设置页面

### 2. 后台脚本（Background Script）

- **文件**：`src/background.ts`
- **作用**：
  - 处理 API 请求（避免 CORS 问题）
  - 管理定时任务
  - 处理消息传递

### 3. 数据层

#### Context Providers
- **AssetProvider** (`src/components/providers/asset-provider.tsx`)
  - 管理交易所配置、钱包配置、应用设置
  - 提供全局状态管理

#### Storage
- **Chrome Storage API** - 持久化存储
- **localStorage** - Web 环境回退
- **存储内容**：
  - 交易所 API 配置
  - 钱包地址
  - 应用设置（语言、主题、隐藏小额资产等）
  - 缓存数据（资产、汇率）

## 数据流

### 资产获取流程

```
用户打开插件
  ↓
检查缓存（assetCache）
  ↓
有缓存且有效？
  ├─ 是 → 显示缓存数据
  └─ 否 → 发起获取请求
         ↓
    并行获取：
    ├─ CEX 资产（Binance/OKX）
    ├─ 链上资产（多链）
    └─ DeFi 协议资产
         ↓
    获取价格数据
         ↓
    合并和计算
         ↓
    保存到缓存
         ↓
    更新 UI
```

### 价格获取流程

```
需要价格数据
  ↓
检查缓存（ratesCache）
  ↓
有缓存且有效？
  ├─ 是 → 使用缓存价格
  └─ 否 → 从多个数据源获取
         ├─ Binance API
         ├─ CryptoCompare
         └─ DeFiLlama
         ↓
    合并结果
         ↓
    保存到缓存
```

## 组件架构

### 页面组件

#### Dashboard (`src/app/page.tsx`)
- 主仪表板页面
- 包含：
  - 总资产卡片（SummaryCard）
  - 资产表格（AssetTable）
  - 资产分布图表（AssetDistribution）
  - 资产标签页（AssetTabs）

#### Settings (`src/app/settings/page.tsx`)
- 设置页面
- 包含三个标签：
  - CEX 管理（CexManager）
  - 钱包管理（WalletManager）
  - 通用设置（GeneralSettings）

### 仪表板组件

#### SummaryCard (`src/components/dashboard/summary-card.tsx`)
- 显示总资产估值
- 支持货币切换（USD/CNY/BTC）
- 显示资产数量

#### AssetTable (`src/components/dashboard/asset-table.tsx`)
- 显示资产列表
- 列：币种、数量、单价、总值、来源
- 支持空状态显示

#### AssetDistribution (`src/components/dashboard/asset-distribution.tsx`)
- 饼状图显示资产分布
- 使用 Recharts 库
- 显示前 6 个资产 + Others

#### AssetTabs (`src/components/dashboard/asset-tabs.tsx`)
- 标签页切换
- 支持按账户/钱包筛选
- 显示"全部汇总"和各个账户

### 设置组件

#### CexManager (`src/components/settings/cex-manager.tsx`)
- 管理 CEX API 配置
- 支持添加/删除交易所
- 表单验证

#### WalletManager (`src/components/settings/wallet-manager.tsx`)
- 管理钱包地址
- 支持添加/删除钱包
- 地址格式验证

#### GeneralSettings (`src/components/settings/general-settings.tsx`)
- 通用设置
- 语言切换
- 隐藏小额资产设置
- 阈值配置

## 状态管理

### AssetProvider Context

```typescript
interface AssetContextType {
  exchanges: ExchangeConfig[];      // 交易所配置
  wallets: WalletConfig[];          // 钱包配置
  settings: AppSettings;            // 应用设置
  isLoaded: boolean;                 // 是否已加载
  addExchange: (config) => void;     // 添加交易所
  removeExchange: (id) => void;      // 删除交易所
  addWallet: (config) => void;        // 添加钱包
  removeWallet: (id) => void;        // 删除钱包
  updateSettings: (settings) => void; // 更新设置
}
```

### 数据持久化

- 使用 Chrome Storage API（扩展环境）
- 使用 localStorage（Web 环境回退）
- 自动保存，实时同步

## 构建流程

### Vite 构建配置

1. **入口文件**：
   - `src/popup.tsx` → `dist/popup.js`
   - `src/options.tsx` → `dist/options.js`
   - `src/background.ts` → `dist/background.js`

2. **CSS 处理**：
   - Tailwind CSS 编译
   - 自动注入到 HTML

3. **资源处理**：
   - 复制 manifest.json
   - 复制 HTML 文件
   - 复制图标文件

## 安全考虑

1. **API 密钥存储**：
   - 仅存储在本地（Chrome Storage）
   - 不发送到任何服务器

2. **CORS 处理**：
   - 通过 Background Script 代理请求
   - 避免前端直接调用 API

3. **内容安全策略**：
   - 限制脚本来源
   - 允许内联样式（Tailwind 需要）

## 性能优化

1. **数据缓存**：
   - 资产数据缓存 24 小时
   - 汇率缓存 30 分钟
   - 减少不必要的 API 调用

2. **懒加载**：
   - 仅在需要时获取数据
   - 初始加载使用缓存

3. **并行请求**：
   - 多个交易所并行获取
   - 多个钱包并行获取
   - 价格数据并行获取

