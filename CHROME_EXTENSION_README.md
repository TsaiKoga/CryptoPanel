# CryptoPanel Chrome 扩展

这是 CryptoPanel 的 Chrome 扩展版本，允许您在浏览器中直接查看和管理您的加密货币资产。

## 构建步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 构建扩展

```bash
npm run build:extension
```

构建完成后，所有文件将输出到 `dist` 目录。

### 3. 创建图标文件

在 `public` 目录下创建以下图标文件（或使用占位符）：
- `icon16.png` (16x16 像素)
- `icon48.png` (48x48 像素)
- `icon128.png` (128x128 像素)

这些图标将被自动复制到 `dist` 目录。

### 4. 加载扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 启用"开发者模式"（右上角开关）
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录下的 `dist` 文件夹

## 功能说明

### 主要功能

- **CEX 资产同步**：支持 Binance 和 OKX 交易所
- **链上资产查询**：支持多个链和协议（Aave、EigenLayer、Aerodrome、Stargate 等）
- **价格查询**：自动获取资产价格（DeFiLlama、CryptoCompare）
- **资产看板**：可视化展示资产分布和详情

### 使用方式

1. **设置交易所**：
   - 点击扩展图标
   - 点击设置按钮（齿轮图标）
   - 在"交易所 (CEX)"标签页添加您的 API 密钥

2. **设置钱包**：
   - 在设置页面的"链上钱包 (On-Chain)"标签页添加钱包地址

3. **查看资产**：
   - 点击扩展图标即可查看所有资产
   - 点击刷新按钮更新资产数据

## 注意事项

1. **API 密钥安全**：所有 API 密钥和配置都存储在本地（Chrome 扩展的 storage），不会上传到任何服务器。

2. **权限说明**：
   - `storage`：用于存储配置和缓存数据
   - `alarms`：用于定期更新资产数据
   - `host_permissions`：用于访问交易所 API 和价格 API

3. **网络要求**：扩展需要访问以下服务：
   - 交易所 API（Binance、OKX）
   - 价格 API（DeFiLlama、CryptoCompare）
   - RPC 节点（用于链上数据查询）

## 开发说明

### 项目结构

```
├── src/
│   ├── background.ts          # Background service worker
│   ├── popup.tsx              # Popup 页面入口
│   ├── options.tsx            # Options 页面入口
│   ├── app/                   # 主应用页面
│   ├── components/            # React 组件
│   ├── lib/                   # 工具函数和库
│   └── hooks/                 # React Hooks
├── public/
│   ├── popup.html             # Popup HTML
│   ├── options.html           # Options HTML
│   └── icon*.png              # 图标文件
├── manifest.json              # Chrome 扩展清单
└── vite.config.ts             # Vite 构建配置
```

### 构建配置

项目使用 Vite 进行构建，支持：
- React + TypeScript
- Tailwind CSS
- 路径别名 (`@/`)

### 调试

1. 在 Chrome 扩展管理页面点击扩展的"检查视图 service worker"来调试 background script
2. 右键点击扩展图标，选择"检查弹出式窗口"来调试 popup
3. 在设置页面右键选择"检查"来调试 options 页面

## 故障排除

### 构建失败

- 确保已安装所有依赖：`npm install`
- 检查 Node.js 版本（建议 18+）

### 扩展无法加载

- 检查 `dist` 目录是否存在且包含所有必要文件
- 检查 `manifest.json` 是否正确
- 查看 Chrome 扩展管理页面的错误信息

### API 调用失败

- 检查网络连接
- 验证 API 密钥是否正确
- 查看 background script 的控制台日志

