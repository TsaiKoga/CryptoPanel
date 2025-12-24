# 开发指南

## 开发环境设置

### 前置要求

- Node.js 18+ 
- npm 或 yarn
- Chrome 浏览器

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 `http://localhost:3000` 查看应用。

### 构建扩展

```bash
npm run build:extension
```

构建产物在 `dist/` 目录。

### 加载扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `dist/` 目录

## 代码规范

### TypeScript

- 使用严格模式
- 所有函数和变量都要有类型
- 使用接口定义数据结构
- 避免使用 `any`，使用 `unknown` 或具体类型

### React

- 使用函数组件和 Hooks
- 组件使用 PascalCase 命名
- 文件使用 kebab-case 命名
- 使用 `useCallback` 和 `useMemo` 优化性能

### 样式

- 使用 Tailwind CSS 类名
- 避免内联样式
- 使用 CSS 变量定义主题颜色
- 响应式设计优先

### 文件组织

```
src/
├── components/     # 组件
│   ├── dashboard/  # 仪表板组件
│   ├── settings/   # 设置组件
│   └── ui/         # UI 基础组件
├── hooks/          # 自定义 Hooks
├── lib/            # 工具库
└── types/          # 类型定义
```

## 添加新功能

### 1. 添加新的 CEX 支持

1. **更新类型定义** (`src/types/index.ts`)：
```typescript
export type ExchangeType = 'binance' | 'okx' | 'new-exchange';
```

2. **实现 API 调用** (`src/background.ts`)：
```typescript
async function fetchNewExchangeAssets(config: ExchangeConfig) {
  // 实现 API 调用逻辑
}
```

3. **更新 UI** (`src/components/settings/cex-manager.tsx`)：
```typescript
<SelectItem value="new-exchange">New Exchange</SelectItem>
```

4. **添加翻译** (`src/lib/i18n.ts`)：
```typescript
cexManager: {
  // ... 添加新交易所的翻译
}
```

### 2. 添加新的链支持

1. **更新链配置** (`src/lib/rpc.ts`)：
```typescript
export const CHAIN_CONFIGS = {
  // ... 添加新链配置
};
```

2. **更新链 ID 映射** (`src/lib/onchain.ts`)：
```typescript
const CHAIN_IDS = {
  // ... 添加新链 ID
};
```

3. **更新文档** (`docs/API_INTEGRATION.md`)

### 3. 添加新的 DeFi 协议

1. **创建协议文件** (`src/lib/protocols/new-protocol.ts`)：
```typescript
export async function fetchNewProtocolAssets(address: string): Promise<Asset[]> {
  // 实现协议资产获取逻辑
}
```

2. **集成到资产获取流程** (`src/hooks/use-asset-fetcher.ts`)：
```typescript
const newProtocolAssets = await fetchNewProtocolAssets(wallet.address);
```

3. **更新文档** (`docs/API_INTEGRATION.md`)

### 4. 添加新的语言支持

1. **更新类型定义** (`src/types/index.ts`)：
```typescript
export type Language = 'zh' | 'en' | 'new-lang';
```

2. **添加翻译** (`src/lib/i18n.ts`)：
```typescript
export const translations = {
  // ... 添加新语言的翻译对象
};
```

3. **更新语言选择器** (`src/components/settings/general-settings.tsx`)：
```typescript
<SelectItem value="new-lang">New Language</SelectItem>
```

## 调试技巧

### Chrome DevTools

1. **查看 Popup 页面**：
   - 右键点击扩展图标
   - 选择"检查弹出内容"

2. **查看 Background Script**：
   - 访问 `chrome://extensions/`
   - 找到扩展，点击"service worker"

3. **查看 Storage**：
   - 在 DevTools 中打开 Application 标签
   - 查看 Storage > Local Storage

### 日志输出

使用 `console.log` 进行调试：

```typescript
console.log('[ComponentName] Debug info:', data);
```

### 错误处理

使用 try-catch 捕获错误：

```typescript
try {
  // 代码
} catch (error) {
  console.error('[ComponentName] Error:', error);
  // 错误处理
}
```

## 测试

### 手动测试清单

- [ ] 添加/删除交易所
- [ ] 添加/删除钱包
- [ ] 切换语言
- [ ] 切换主题
- [ ] 刷新资产数据
- [ ] 隐藏小额资产功能
- [ ] 货币切换（USD/CNY/BTC）
- [ ] 缓存功能
- [ ] 错误处理

### 测试不同场景

1. **无配置场景**：
   - 首次使用
   - 无交易所配置
   - 无钱包配置

2. **错误场景**：
   - API 密钥错误
   - 网络错误
   - 无效地址

3. **数据场景**：
   - 大量资产
   - 无资产
   - 部分资产无价格

## 性能优化

### 1. 减少重渲染

使用 `React.memo` 包装组件：

```typescript
export const MyComponent = React.memo(({ props }) => {
  // 组件代码
});
```

### 2. 使用 useCallback

缓存函数引用：

```typescript
const handleClick = useCallback(() => {
  // 处理逻辑
}, [dependencies]);
```

### 3. 使用 useMemo

缓存计算结果：

```typescript
const filteredAssets = useMemo(() => {
  return assets.filter(/* ... */);
}, [assets, filter]);
```

### 4. 懒加载

使用动态导入：

```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## 常见问题

### 1. 构建失败

**问题**：TypeScript 错误

**解决**：
- 检查类型定义
- 运行 `npm run lint` 检查错误

### 2. 样式不生效

**问题**：Tailwind 类名不生效

**解决**：
- 检查 `globals.css` 是否正确导入
- 检查 PostCSS 配置
- 重新构建

### 3. API 请求失败

**问题**：CORS 错误

**解决**：
- 确保通过 Background Script 发起请求
- 检查 manifest.json 中的 host_permissions

### 4. 缓存不更新

**问题**：数据不刷新

**解决**：
- 检查缓存键名
- 检查缓存有效期
- 手动清除缓存测试

## 提交代码

### 提交前检查

- [ ] 代码通过 TypeScript 检查
- [ ] 代码通过 ESLint 检查
- [ ] 手动测试通过
- [ ] 更新相关文档

### 提交信息格式

```
类型: 简短描述

详细描述（可选）
```

**类型**：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试

## 最佳实践

### 1. 组件设计

- 单一职责原则
- 可复用性
- 可测试性

### 2. 状态管理

- 使用 Context 管理全局状态
- 本地状态使用 useState
- 避免过度使用全局状态

### 3. 错误处理

- 所有异步操作都要有错误处理
- 显示用户友好的错误提示
- 记录错误日志

### 4. 性能

- 避免不必要的重渲染
- 使用缓存减少 API 调用
- 优化大列表渲染

### 5. 可维护性

- 清晰的代码结构
- 有意义的命名
- 适当的注释
- 保持文档更新

