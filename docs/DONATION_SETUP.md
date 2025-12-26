# 捐赠功能配置指南

## 概述

CryptoPanel 已集成捐赠功能，用户可以在设置页面的"通用设置"标签页中看到捐赠选项。

## 配置步骤

### 1. 配置捐赠链接

编辑文件：`src/components/donation/donation-section.tsx`

找到 `DONATION_LINKS` 常量，替换为您的实际链接：

```typescript
const DONATION_LINKS = {
  // GitHub Sponsors 链接
  github: 'https://github.com/sponsors/your-username',
  
  // Buy Me a Coffee 链接
  buymeacoffee: 'https://buymeacoffee.com/your-username',
  
  // PayPal 链接
  paypal: 'https://paypal.me/your-username',
  
  // 加密货币地址
  crypto: {
    btc: 'your-btc-address',      // 替换为您的 BTC 地址
    eth: 'your-eth-address',       // 替换为您的 ETH 地址
    usdt: 'your-usdt-address',    // 替换为您的 USDT 地址（ERC20 或 TRC20）
  }
};
```

### 2. 获取捐赠链接

#### GitHub Sponsors
1. 访问 [GitHub Sponsors](https://github.com/sponsors)
2. 设置您的 Sponsors 资料
3. 获取您的 Sponsors 页面链接

#### Buy Me a Coffee
1. 访问 [Buy Me a Coffee](https://www.buymeacoffee.com/)
2. 注册并创建您的页面
3. 获取您的页面链接（格式：`https://buymeacoffee.com/your-username`）

#### PayPal
1. 访问 [PayPal.me](https://www.paypal.com/paypalme/)
2. 设置您的 PayPal.me 链接
3. 获取您的链接（格式：`https://paypal.me/your-username`）

#### 加密货币地址
- **BTC**: 使用您的比特币钱包地址
- **ETH**: 使用您的以太坊钱包地址（也用于 ERC20 代币）
- **USDT**: 可以使用 ERC20（以太坊）或 TRC20（波场）地址

### 3. 可选：隐藏不需要的捐赠方式

如果您不想显示某些捐赠方式，可以：

1. **隐藏传统支付方式**：删除或注释掉对应的按钮代码
2. **隐藏加密货币捐赠**：删除或注释掉加密货币部分
3. **只显示部分加密货币**：从 `crypto` 对象中删除不需要的币种

### 4. 自定义样式（可选）

捐赠组件使用了与项目一致的设计系统：
- 使用 `Card` 组件作为容器
- 使用 `Button` 组件的 `outline` 变体
- 支持深色/浅色主题自动切换

如需自定义样式，可以修改 `src/components/donation/donation-section.tsx` 中的类名。

## 功能特性

- ✅ 支持多种捐赠方式（GitHub Sponsors、Buy Me a Coffee、PayPal）
- ✅ 支持加密货币捐赠（BTC、ETH、USDT）
- ✅ 一键复制加密货币地址
- ✅ 国际化支持（中文/英文）
- ✅ 响应式设计
- ✅ 深色/浅色主题支持

## 用户体验

- 捐赠卡片显示在设置页面的"通用设置"标签页底部
- 用户可以点击按钮打开捐赠链接（新标签页）
- 加密货币地址可以一键复制，复制后显示确认图标
- 所有链接都在新标签页中打开，使用 `noopener,noreferrer` 确保安全

## 注意事项

1. **隐私安全**：所有捐赠链接都是客户端配置，不会收集任何用户数据
2. **链接验证**：配置后请测试所有链接是否正常工作
3. **地址格式**：确保加密货币地址格式正确，用户可以直接复制使用
4. **国际化**：所有文本都已支持中英文，如需其他语言，请在 `src/lib/i18n.ts` 中添加

## 后续优化建议

1. **捐赠者感谢**：可以添加本地存储记录用户是否已捐赠（可选显示徽章）
2. **首次使用提示**：可以在用户使用扩展 3 次后显示一次捐赠提示
3. **GitHub 集成**：如果使用 GitHub Sponsors，可以在 README 中添加 Sponsors 徽章

## 相关文件

- 组件文件：`src/components/donation/donation-section.tsx`
- 国际化文件：`src/lib/i18n.ts`
- 设置页面：`src/app/settings/page.tsx`

