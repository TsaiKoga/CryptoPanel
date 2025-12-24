# CryptoPanel 项目文档

## 项目概述

CryptoPanel 是一个 Chrome 扩展程序，用于统一管理加密货币资产。它支持：

- **CEX（中心化交易所）资产**：Binance、OKX
- **链上钱包资产**：支持多个 EVM 兼容链（ETH、BSC、Arbitrum、Optimism、Base、zkSync、Soneium、X Layer）
- **DeFi 协议资产**：EigenLayer、Aerodrome、Aave、Stargate
- **多语言支持**：中文、英文
- **主题切换**：浅色、深色、跟随系统
- **数据缓存**：减少 API 调用，提升性能

## 技术栈

### 前端框架
- **React 19.2.0** - UI 框架
- **TypeScript 5** - 类型安全
- **Next.js 16.0.7** - React 框架（用于开发）
- **Vite 6.0.0** - 构建工具（用于 Chrome 扩展构建）

### UI 库
- **Tailwind CSS 4** - 样式框架
- **Radix UI** - 无样式组件库
  - Dialog、Dropdown Menu、Label、Select、Switch、Tabs
- **Recharts 3.5.1** - 图表库（饼状图）
- **Lucide React** - 图标库
- **Sonner** - Toast 通知

### 区块链相关
- **viem 2.41.2** - Ethereum 工具库
- **ccxt 4.5.24** - 加密货币交易所库

### 其他
- **next-themes** - 主题管理
- **Chrome Extension API** - Chrome 扩展功能

## 项目结构

```
CryptoPanel/
├── docs/                    # 项目文档
├── public/                  # 静态资源
│   ├── popup.html          # 弹窗页面
│   ├── options.html        # 设置页面
│   └── icons/              # 图标文件
├── src/
│   ├── app/                # Next.js 应用（开发用）
│   │   ├── page.tsx        # 主页面
│   │   ├── settings/       # 设置页面
│   │   └── globals.css     # 全局样式
│   ├── background.ts       # Chrome 扩展后台脚本
│   ├── popup.tsx           # 弹窗入口
│   ├── options.tsx         # 设置页面入口
│   ├── components/         # React 组件
│   │   ├── dashboard/      # 仪表板组件
│   │   ├── settings/       # 设置组件
│   │   ├── providers/      # Context Providers
│   │   └── ui/             # UI 基础组件
│   ├── hooks/              # React Hooks
│   ├── lib/                # 工具库
│   │   ├── api.ts          # API 调用
│   │   ├── onchain.ts      # 链上资产获取
│   │   ├── protocols/      # DeFi 协议集成
│   │   ├── storage.ts      # 存储管理
│   │   └── i18n.ts         # 国际化
│   └── types/              # TypeScript 类型定义
├── manifest.json           # Chrome 扩展清单
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── package.json            # 项目依赖
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建 Chrome 扩展

```bash
npm run build:extension
```

构建产物在 `dist/` 目录，可以在 Chrome 中加载未打包的扩展。

## 核心功能

### 1. 资产管理
- 支持多个 CEX 账户
- 支持多个链上钱包地址
- 自动聚合所有资产
- 按价值排序和过滤

### 2. 价格获取
- 从多个数据源获取价格（Binance、CryptoCompare、DeFiLlama）
- 支持缓存，减少 API 调用
- 自动匹配代币符号

### 3. 数据缓存
- 资产数据缓存（24小时）
- 汇率缓存（30分钟）
- 货币偏好缓存
- 语言偏好缓存

### 4. 国际化
- 支持中文和英文
- 所有 UI 文本可切换
- 语言偏好持久化

### 5. 主题系统
- 浅色模式
- 深色模式
- 跟随系统设置

## 文档索引

- [架构说明](./ARCHITECTURE.md) - 系统架构和数据流
- [组件文档](./COMPONENTS.md) - 组件详细说明
- [API 集成](./API_INTEGRATION.md) - 外部 API 集成说明
- [数据流](./DATA_FLOW.md) - 数据获取和处理流程
- [配置说明](./CONFIGURATION.md) - 配置和存储说明
- [开发指南](./DEVELOPMENT.md) - 开发规范和最佳实践
- [国际化](./INTERNATIONALIZATION.md) - 国际化实现说明

## 许可证

Private Project

