# 组件文档

## UI 基础组件

### Button (`src/components/ui/button.tsx`)
- **用途**：通用按钮组件
- **变体**：default, destructive, outline, secondary, ghost, link
- **尺寸**：default, sm, lg, icon
- **特性**：支持图标、加载状态、禁用状态

### Card (`src/components/ui/card.tsx`)
- **用途**：卡片容器
- **子组件**：
  - `CardHeader` - 卡片头部
  - `CardTitle` - 标题
  - `CardDescription` - 描述
  - `CardContent` - 内容区域
  - `CardFooter` - 底部

### Table (`src/components/ui/table.tsx`)
- **用途**：表格组件
- **子组件**：
  - `TableHeader` - 表头
  - `TableHead` - 表头单元格
  - `TableBody` - 表体
  - `TableRow` - 行
  - `TableCell` - 单元格

### Select (`src/components/ui/select.tsx`)
- **用途**：下拉选择组件
- **子组件**：
  - `SelectTrigger` - 触发器
  - `SelectContent` - 下拉内容
  - `SelectItem` - 选项项
  - `SelectValue` - 显示值

### Input (`src/components/ui/input.tsx`)
- **用途**：输入框组件
- **特性**：支持各种类型、占位符、禁用状态

### Switch (`src/components/ui/switch.tsx`)
- **用途**：开关组件
- **特性**：支持受控/非受控模式

### Tabs (`src/components/ui/tabs.tsx`)
- **用途**：标签页组件
- **子组件**：
  - `TabsList` - 标签列表
  - `TabsTrigger` - 标签触发器
  - `TabsContent` - 标签内容

### DropdownMenu (`src/components/ui/dropdown-menu.tsx`)
- **用途**：下拉菜单组件
- **用途**：主题切换菜单

## 仪表板组件

### SummaryCard (`src/components/dashboard/summary-card.tsx`)

**功能**：显示总资产估值

**Props**：
```typescript
{
  assets: Asset[];
  loading: boolean;
}
```

**特性**：
- 支持货币切换（USD/CNY/BTC）
- 自动获取汇率和 BTC 价格
- 缓存汇率数据（30分钟）
- 显示资产数量
- 货币偏好持久化

**状态**：
- `currency`: 当前选择的货币
- `btcPrice`: BTC 价格
- `usdToCny`: USD 到 CNY 汇率
- `loadingRates`: 汇率加载状态

### AssetTable (`src/components/dashboard/asset-table.tsx`)

**功能**：显示资产列表表格

**Props**：
```typescript
{
  assets: Asset[];
}
```

**列**：
- 币种（Symbol）
- 数量（Amount）
- 单价（Price USD）
- 总值（Value USD）
- 来源（Source）

**特性**：
- 支持空状态显示
- 响应式设计
- 悬停效果

### AssetDistribution (`src/components/dashboard/asset-distribution.tsx`)

**功能**：饼状图显示资产分布

**Props**：
```typescript
{
  assets: Asset[];
}
```

**特性**：
- 使用 Recharts 库
- 显示前 6 个资产 + Others
- 自定义 Tooltip
- 显示百分比
- 支持空状态

**数据处理**：
- 按币种聚合资产
- 按价值排序
- 计算百分比

### AssetTabs (`src/components/dashboard/asset-tabs.tsx`)

**功能**：标签页切换不同账户的资产视图

**Props**：
```typescript
{
  assets: Asset[];
  loading: boolean;
}
```

**特性**：
- "全部汇总"标签显示所有资产
- 每个交易所/钱包有独立标签
- 每个标签显示对应的 SummaryCard 和 AssetTable

## 设置组件

### CexManager (`src/components/settings/cex-manager.tsx`)

**功能**：管理 CEX API 配置

**功能**：
- 添加交易所（Binance/OKX）
- 删除交易所
- 显示已添加的交易所列表
- 表单验证

**表单字段**：
- 交易所类型（Select）
- 备注名称（Input）
- API Key（Input, password）
- Secret Key（Input, password）
- Passphrase（Input, password, 仅 OKX）

### WalletManager (`src/components/settings/wallet-manager.tsx`)

**功能**：管理链上钱包地址

**功能**：
- 添加钱包地址
- 删除钱包地址
- 显示已添加的钱包列表
- 地址格式验证（EVM 地址）

**表单字段**：
- 备注名称（Input）
- 钱包地址（Input）

**验证**：
- 地址必须以 `0x` 开头
- 地址长度必须为 42 字符

### GeneralSettings (`src/components/settings/general-settings.tsx`)

**功能**：通用应用设置

**设置项**：
- 语言选择（中文/English）
- 隐藏小额资产（Switch）
- 小额资产阈值（Input, 仅在启用隐藏时显示）

## Provider 组件

### AssetProvider (`src/components/providers/asset-provider.tsx`)

**功能**：全局状态管理

**管理的数据**：
- 交易所配置列表
- 钱包配置列表
- 应用设置

**提供的方法**：
- `addExchange` - 添加交易所
- `removeExchange` - 删除交易所
- `addWallet` - 添加钱包
- `removeWallet` - 删除钱包
- `updateSettings` - 更新设置

**持久化**：
- 自动保存到 Chrome Storage
- 自动加载到 Context

### ThemeProvider (`src/components/providers/theme-provider.tsx`)

**功能**：主题管理

**特性**：
- 使用 next-themes 库
- 支持浅色、深色、跟随系统
- 持久化主题选择

## 其他组件

### ThemeToggle (`src/components/theme-toggle.tsx`)

**功能**：主题切换按钮

**特性**：
- 下拉菜单选择主题
- 图标根据当前主题变化
- 支持国际化

### ErrorSuppressor (`src/components/error-suppressor.tsx`)

**功能**：抑制开发环境错误

**用途**：在开发环境中隐藏某些已知错误

## 组件使用示例

### 使用 AssetProvider

```typescript
import { useAssetStore } from '@/components/providers/asset-provider';

function MyComponent() {
  const { exchanges, wallets, settings, updateSettings } = useAssetStore();
  
  // 使用状态和方法
}
```

### 使用国际化

```typescript
import { useI18n } from '@/hooks/use-i18n';

function MyComponent() {
  const { t } = useI18n();
  
  return <div>{t('dashboard.title')}</div>;
}
```

### 使用主题

```typescript
import { useTheme } from 'next-themes';

function MyComponent() {
  const { theme, setTheme } = useTheme();
  
  // 使用主题
}
```

