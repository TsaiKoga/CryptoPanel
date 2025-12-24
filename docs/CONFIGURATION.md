# 配置说明

## Chrome Extension 配置

### manifest.json

**Manifest Version**: 3

**权限**：
- `storage` - 存储数据
- `alarms` - 定时任务

**主机权限**：
- Binance API
- OKX API
- DeFiLlama API
- CryptoCompare API
- RPC 提供者（ThirdWeb、Infura、Alchemy）
- 汇率 API

**入口点**：
- `popup.html` - 弹窗页面
- `options.html` - 设置页面
- `background.js` - 后台脚本

## 应用设置

### AppSettings 类型

```typescript
interface AppSettings {
  hideSmallAssets: boolean;        // 是否隐藏小额资产
  smallAssetsThreshold: number;   // 小额资产阈值（USD）
  currency: 'USD';                // 货币单位（保留字段）
  language: Language;              // 语言设置（'zh' | 'en'）
}
```

### 默认设置

```typescript
const DEFAULT_SETTINGS: AppSettings = {
  hideSmallAssets: true,
  smallAssetsThreshold: 1,
  currency: 'USD',
  language: 'zh',  // 默认中文
};
```

## 存储配置

### 存储键名

- `crypto-panel-data-v1` - 主数据（交易所、钱包、设置）
- `crypto-panel-assets-cache-v1` - 资产缓存
- `crypto-panel-rates-cache-v1` - 汇率缓存
- `crypto-panel-currency-v1` - 货币偏好

### 缓存有效期

- **资产缓存**：24 小时
- **汇率缓存**：30 分钟

### 存储实现

**Chrome Extension 环境**：
- 使用 `chrome.storage.local`
- 异步 API

**Web 环境（回退）**：
- 使用 `localStorage`
- 同步 API

## 交易所配置

### ExchangeConfig 类型

```typescript
interface ExchangeConfig {
  id: string;                      // 唯一标识
  type: ExchangeType;               // 'binance' | 'okx'
  name: string;                     // 备注名称
  apiKey: string;                   // API Key
  secret: string;                    // Secret Key
  password?: string;                // Passphrase（仅 OKX）
}
```

### Binance 配置

**必需字段**：
- `apiKey`
- `secret`

**可选字段**：
- `password`（不需要）

### OKX 配置

**必需字段**：
- `apiKey`
- `secret`
- `password`（Passphrase）

**注意**：
- Passphrase 必须与创建 API Key 时设置的一致
- 区分大小写
- 如果错误会显示友好提示

## 钱包配置

### WalletConfig 类型

```typescript
interface WalletConfig {
  id: string;                      // 唯一标识
  address: string;                  // 钱包地址
  name: string;                     // 备注名称
}
```

### 地址验证

- 必须以 `0x` 开头
- 长度必须为 42 字符
- EVM 兼容地址

## 国际化配置

### 支持的语言

- `zh` - 中文
- `en` - English

### 语言文件

**位置**：`src/lib/i18n.ts`

**结构**：
```typescript
export const translations = {
  zh: { ... },
  en: { ... },
};
```

### 翻译键命名

使用点号分隔的层级结构：
- `dashboard.title` - 仪表板标题
- `settings.language` - 设置语言
- `cexManager.title` - CEX 管理标题

## 主题配置

### 支持的主题

- `light` - 浅色模式
- `dark` - 深色模式
- `system` - 跟随系统

### 主题实现

- 使用 `next-themes` 库
- 通过 CSS 变量实现
- 支持实时切换

## RPC 配置

### 支持的 RPC 提供者

1. **ThirdWeb RPC**
   - 格式：`https://{chainId}.rpc.thirdweb.com`
   - 免费，无需 API Key

2. **Infura**
   - 需要 API Key
   - 格式：`https://{network}.infura.io/v3/{apiKey}`

3. **Alchemy**
   - 需要 API Key
   - 格式：`https://{network}.alchemy.com/v2/{apiKey}`

4. **公共 RPC**
   - 备用选项
   - 可能有限流

### 链 ID 映射

```typescript
const CHAIN_IDS = {
  ethereum: 1,
  bsc: 56,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  zksync: 324,
  soneium: 1946,
  xlayer: 196,
};
```

## 构建配置

### Vite 配置

**文件**：`vite.config.ts`

**主要配置**：
- React 插件
- CSS 处理（PostCSS + Tailwind）
- Manifest 复制
- CSS 注入插件

### TypeScript 配置

**文件**：`tsconfig.json`

**主要配置**：
- 严格模式
- 路径别名（`@/`）
- React JSX 支持

### Tailwind 配置

**文件**：`postcss.config.mjs`

**主要配置**：
- Tailwind CSS 4
- PostCSS 处理

## 环境变量（可选）

目前项目不使用环境变量，所有配置都存储在 Chrome Storage 中。

如果需要添加环境变量支持，可以：

1. 创建 `.env` 文件
2. 在 `vite.config.ts` 中配置环境变量
3. 使用 `import.meta.env` 访问

## 安全配置

### 内容安全策略

**manifest.json**：
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'"
  }
}
```

### API 密钥安全

- 仅存储在本地
- 不发送到任何服务器
- 不在日志中输出完整密钥
- 使用 HMAC-SHA256 签名

## 性能配置

### 缓存策略

- **资产数据**：24 小时缓存
- **汇率数据**：30 分钟缓存
- **用户偏好**：永久缓存

### 请求优化

- 并行请求多个数据源
- 批量查询价格
- 使用 Multicall 批量查询代币余额

### 懒加载

- 初始加载使用缓存
- 后台静默更新
- 仅在需要时获取数据

