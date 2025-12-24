# API 集成说明

## CEX API 集成

### Binance API

**端点**：
- Spot Balance: `https://api.binance.com/api/v3/account`
- Earn Assets: `https://api.binance.com/sapi/v1/lending/union/account`
- Prices: `https://api.binance.com/api/v3/ticker/price`

**认证**：
- API Key + Secret Key
- HMAC-SHA256 签名

**实现位置**：`src/background.ts` - `fetchBinanceAssets`

**获取的资产类型**：
- Spot 账户资产
- 灵活赚币（Flexible Earn）
- 锁仓赚币（Locked Earn）
- 质押资产（Staking）

### OKX API

**端点**：
- Funding Balance: `https://www.okx.com/api/v5/asset/balances`
- Trading Balance: `https://www.okx.com/api/v5/account/balance`
- Prices: `https://www.okx.com/api/v5/market/ticker`

**认证**：
- API Key + Secret Key + Passphrase
- HMAC-SHA256 签名
- 时间戳验证

**实现位置**：`src/background.ts` - `fetchOKXAssets`

**获取的资产类型**：
- 资金账户资产
- 交易账户资产

**错误处理**：
- 50105 错误：Passphrase 不正确，显示用户友好的提示

## 链上资产获取

### 多链支持

**支持的链**：
- Ethereum (1)
- BSC (56)
- Arbitrum (42161)
- Optimism (10)
- Base (8453)
- zkSync (324)
- Soneium (1946)
- X Layer (196)

**实现位置**：`src/lib/onchain.ts`

**RPC 提供者**：
- ThirdWeb RPC
- Infura
- Alchemy
- 公共 RPC

### 资产获取流程

1. **获取原生代币余额**（ETH、BNB 等）
2. **获取 ERC-20 代币余额**
   - 使用 Multicall 批量查询
   - 支持大量代币快速查询
3. **获取代币元数据**（名称、符号、小数位）

## DeFi 协议集成

### EigenLayer

**功能**：获取 EigenLayer 质押资产

**实现位置**：`src/lib/protocols/eigenlayer.ts`

**方法**：
- 查询用户质押的资产
- 获取质押收益

### Aerodrome

**功能**：获取 Aerodrome 流动性池资产

**实现位置**：`src/lib/protocols/aerodrome.ts`

**方法**：
- 查询 LP 代币余额
- 计算池子份额价值

### Aave

**功能**：获取 Aave 借贷资产

**实现位置**：`src/lib/protocols/aave.ts`

**方法**：
- 查询存款资产
- 查询借贷资产

### Stargate

**功能**：获取 Stargate 流动性资产

**实现位置**：`src/lib/protocols/stargate.ts`

**方法**：
- 查询 Stargate LP 代币
- 计算流动性价值

## 价格数据源

### Binance Price API

**端点**：`https://api.binance.com/api/v3/ticker/price`

**特性**：
- 支持批量查询
- 如果批量失败，回退到单个查询

**实现位置**：`src/background.ts` - `fetchBinancePrices`

### CryptoCompare

**端点**：`https://min-api.cryptocompare.com/data/price`

**用途**：
- 获取 BTC 价格
- 备用价格数据源

**实现位置**：`src/components/dashboard/summary-card.tsx`

### DeFiLlama

**端点**：`https://coins.llama.fi/prices`

**用途**：
- 获取链上代币价格
- 支持多链代币

**实现位置**：`src/lib/api.ts` - `fetchPrices`

### ExchangeRate-API

**端点**：`https://api.exchangerate-api.com/v4/latest/USD`

**用途**：获取 USD 到 CNY 汇率

**备用**：Fixer.io API

**实现位置**：`src/components/dashboard/summary-card.tsx`

## 数据缓存策略

### 资产数据缓存

**键**：`crypto-panel-assets-cache-v1`

**有效期**：24 小时

**内容**：
```typescript
{
  assets: Asset[];
  timestamp: number;
}
```

**实现位置**：`src/lib/storage.ts` - `assetCache`

### 汇率缓存

**键**：`crypto-panel-rates-cache-v1`

**有效期**：30 分钟

**内容**：
```typescript
{
  btcPrice: number;
  usdToCny: number;
  timestamp: number;
}
```

**实现位置**：`src/lib/storage.ts` - `ratesCache`

### 货币偏好缓存

**键**：`crypto-panel-currency-v1`

**内容**：`'USD' | 'CNY' | 'BTC'`

**实现位置**：`src/lib/storage.ts` - `currencyPreference`

## 错误处理

### API 错误处理

1. **网络错误**：显示错误提示，使用缓存数据
2. **认证错误**：显示用户友好的提示（如 OKX Passphrase 错误）
3. **限流错误**：延迟重试
4. **数据格式错误**：记录日志，跳过该数据源

### 错误提示

- 使用 Sonner Toast 显示错误
- 区分不同类型的错误
- 提供解决建议

## 请求优化

### 并行请求

- 多个交易所并行获取
- 多个钱包并行获取
- 价格数据并行获取

### 批量查询

- 使用 Multicall 批量查询代币余额
- 批量获取价格数据

### 缓存优先

- 优先使用缓存数据
- 后台更新缓存
- 减少不必要的 API 调用

## 安全考虑

### API 密钥安全

- 仅存储在本地（Chrome Storage）
- 不发送到任何服务器
- 不在日志中输出完整密钥

### 请求签名

- 使用 HMAC-SHA256 签名
- 包含时间戳防止重放攻击
- 验证服务器响应

### CORS 处理

- 通过 Background Script 代理请求
- 避免前端直接调用 API
- 符合 Chrome Extension 安全策略

