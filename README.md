# CryptoPanel

<div align="center">

**一个强大的加密货币资产看板 Chrome 扩展**

统一管理您的 CEX 和链上加密货币资产

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green?logo=google-chrome)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)

[English](./README_EN.md) | 中文

</div>

---

## ✨ 功能特性

### 🔐 隐私安全
- **完全本地存储**：所有 API 密钥和配置仅存储在您的浏览器本地
- **无服务器**：不会上传任何数据到外部服务器
- **只读权限**：建议仅授予 API 密钥只读权限，确保资金安全

### 📊 统一资产管理
- **CEX 资产同步**：支持 Binance、OKX 等主流交易所
- **链上资产查询**：支持多个 EVM 兼容链
- **DeFi 协议支持**：自动识别 EigenLayer、Aerodrome、Aave、Stargate 等协议资产
- **实时价格**：自动获取资产价格（DeFiLlama、CryptoCompare）

### 🎨 用户体验
- **多语言支持**：中文、英文
- **深色模式**：支持浅色、深色、跟随系统主题
- **资产可视化**：饼状图展示资产分布
- **智能缓存**：减少 API 调用，提升性能

### 💰 多币种显示
- **多货币单位**：支持 USD、CNY、BTC 显示
- **资产过滤**：可隐藏小额资产
- **实时更新**：支持手动刷新和自动更新

## 📋 支持的交易所

- ✅ **Binance（币安）**
  - Spot 账户资产
  - 灵活赚币（Flexible Earn）
  - 锁仓赚币（Locked Earn）
  - 质押资产（Staking）

- ✅ **OKX（欧易）**
  - 资金账户资产
  - 交易账户资产

## 🔗 支持的区块链

- ✅ **Ethereum** (主网)
- ✅ **BSC** (Binance Smart Chain)
- ✅ **Polygon**
- ✅ **Arbitrum**
- ✅ **Optimism**
- ✅ **Base**
- ✅ **zkSync Era**
- ✅ **Soneium**
- ✅ **X Layer**
- ✅ **Avalanche**
- ✅ **Linea**
- ✅ **Berachain**
- ✅ **Ink**
- ✅ **Plume**
- ✅ **HyperEVM**

## 🛠️ 支持的 DeFi 协议

- ✅ **EigenLayer** - 质押资产
- ✅ **Aerodrome** - 流动性池
- ✅ **Aave** - 借贷资产
- ✅ **Stargate** - 跨链资产

## 🚀 快速开始

### 安装方式

#### 方式一：从 Chrome Web Store 安装（推荐）

1. 访问 [Chrome Web Store](https://chrome.google.com/webstore) 搜索 "CryptoPanel"
2. 点击"添加至 Chrome"
3. 完成安装

#### 方式二：从源码构建

1. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/CryptoPanel.git
   cd CryptoPanel
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **构建扩展**
   ```bash
   npm run build:extension
   ```

4. **加载扩展**
   - 打开 Chrome 浏览器
   - 访问 `chrome://extensions/`
   - 启用"开发者模式"（右上角开关）
   - 点击"加载已解压的扩展程序"
   - 选择项目根目录下的 `dist` 文件夹

### 使用指南

#### 1. 配置交易所 API

1. 点击扩展图标
2. 点击设置按钮（⚙️ 图标）
3. 在"交易所 (CEX)"标签页：
   - 选择交易所（Binance 或 OKX）
   - 输入备注名称（可选）
   - 输入 API Key 和 Secret Key
   - 如果是 OKX，还需要输入 Passphrase
   - 点击"添加交易所"

**安全提示**：
- 建议仅授予 API 密钥**只读权限**
- API 密钥仅存储在您的浏览器本地，不会上传到任何服务器

#### 2. 添加链上钱包

1. 在设置页面的"链上钱包 (On-Chain)"标签页
2. 输入钱包地址（EVM 兼容地址）
3. 输入备注名称（可选）
4. 点击"添加钱包"

#### 3. 查看资产

1. 点击扩展图标打开主面板
2. 查看总资产估值和资产列表
3. 点击刷新按钮（🔄）更新资产数据
4. 使用标签页切换查看不同来源的资产

#### 4. 自定义设置

在"通用设置"标签页可以：
- 切换语言（中文/英文）
- 切换主题（浅色/深色/跟随系统）
- 隐藏小额资产
- 设置小额资产阈值

## 🛠️ 技术栈

### 前端框架
- **React 19.2.0** - UI 框架
- **TypeScript 5** - 类型安全
- **Next.js 16.0.7** - React 框架（开发用）
- **Vite 6.0.0** - 构建工具（Chrome 扩展构建）

### UI 库
- **Tailwind CSS 4** - 样式框架
- **Radix UI** - 无样式组件库
- **Recharts 3.5.1** - 图表库
- **Lucide React** - 图标库
- **Sonner** - Toast 通知

### 区块链相关
- **viem 2.41.2** - Ethereum 工具库
- **ccxt 4.5.24** - 加密货币交易所库

### 其他
- **next-themes** - 主题管理
- **Chrome Extension API** - Chrome 扩展功能

## 📁 项目结构

```
CryptoPanel/
├── docs/                    # 项目文档
│   ├── ARCHITECTURE.md     # 架构说明
│   ├── API_INTEGRATION.md  # API 集成说明
│   ├── COMPONENTS.md       # 组件文档
│   ├── CONFIGURATION.md    # 配置说明
│   ├── DEVELOPMENT.md      # 开发指南
│   └── PUBLISHING.md       # 发布指南
├── public/                  # 静态资源
│   ├── popup.html          # 弹窗页面
│   ├── options.html        # 设置页面
│   └── icon*.png           # 图标文件
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
│   │   ├── donation/       # 捐赠组件
│   │   └── ui/             # UI 基础组件
│   ├── hooks/              # React Hooks
│   ├── lib/                # 工具库
│   │   ├── api.ts          # API 调用
│   │   ├── onchain.ts      # 链上资产获取
│   │   ├── protocols/     # DeFi 协议集成
│   │   ├── storage.ts      # 存储管理
│   │   └── i18n.ts         # 国际化
│   └── types/              # TypeScript 类型定义
├── manifest.json           # Chrome 扩展清单
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── package.json            # 项目依赖
```

## 🧑‍💻 开发指南

### 环境要求

- Node.js 18+ 
- npm 或 yarn 或 pnpm

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式（Next.js）
npm run dev

# 构建 Chrome 扩展
npm run build:extension

# 代码检查
npm run lint
```

### 调试

1. **Background Script**
   - 在 Chrome 扩展管理页面点击扩展的"检查视图 service worker"

2. **Popup**
   - 右键点击扩展图标，选择"检查弹出式窗口"

3. **Options 页面**
   - 在设置页面右键选择"检查"

### 添加新功能

详细的开发指南请查看 [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## 📖 文档

- [架构说明](./docs/ARCHITECTURE.md) - 系统架构和数据流
- [组件文档](./docs/COMPONENTS.md) - 组件详细说明
- [API 集成](./docs/API_INTEGRATION.md) - 外部 API 集成说明
- [配置说明](./docs/CONFIGURATION.md) - 配置和存储说明
- [开发指南](./docs/DEVELOPMENT.md) - 开发指南和最佳实践
- [发布指南](./docs/PUBLISHING.md) - Chrome Web Store 发布指南

## 🔒 隐私与安全

### 数据存储
- 所有数据（API 密钥、钱包地址、设置）仅存储在您的浏览器本地
- 使用 Chrome 的 `chrome.storage.local` API
- 不会上传任何数据到外部服务器

### API 调用
扩展会向以下服务发送请求：
- **交易所 API**：获取账户余额（仅当您配置了 API 密钥时）
- **价格 API**：获取代币价格（公开 API，无需认证）
- **RPC 节点**：查询链上资产余额（公开节点）

### 安全建议
- ✅ 仅授予 API 密钥**只读权限**
- ✅ 定期检查 API 密钥权限
- ✅ 不要分享您的 API 密钥
- ✅ 卸载扩展将删除所有本地数据

详细隐私政策请查看 [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解贡献指南。

### 贡献方式
- 🐛 报告 Bug
- 💡 提出功能建议
- 📝 改进文档
- 🔧 提交 Pull Request

## 💝 支持项目

如果 CryptoPanel 对您有帮助，欢迎通过以下方式支持项目：

- ⭐ 给项目点个 Star
- 🐛 报告 Bug 或提出建议
- 💰 加密货币捐赠（在设置页面的"支持项目"标签页）

## 📝 许可证

本项目采用 [Apache 2.0 License](./LICENSE) 许可证。

## ⚠️ 免责声明

- 本扩展不构成投资建议
- 加密货币投资存在高风险，请谨慎投资
- 我们不对任何投资损失负责
- 请以交易所和链上数据为准进行重要决策

详细使用条款请查看 [TERMS_OF_SERVICE.md](./TERMS_OF_SERVICE.md)

## 📞 联系方式

- **GitHub Issues**: [提交问题](https://github.com/tsaikoga/CryptoPanel/issues)

## 🙏 致谢

感谢以下开源项目和服务：

- [viem](https://viem.sh/) - Ethereum 工具库
- [ccxt](https://github.com/ccxt/ccxt) - 加密货币交易所库
- [DeFiLlama](https://defillama.com/) - 价格数据
- [CryptoCompare](https://www.cryptocompare.com/) - 价格数据
- [Radix UI](https://www.radix-ui.com/) - UI 组件库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架

---

<div align="center">

**Made with ❤️ by [Your Name]**

[⬆ 回到顶部](#cryptopanel)

</div>
