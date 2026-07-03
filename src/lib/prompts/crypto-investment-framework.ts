/**
 * 加密货币投资分析框架 — 插件 AI 适配版
 * 源自 crypto-investment-analysis skill（老高行情视频总结提炼）
 * https://github.com/TsaiKoga/crypto-investment-analysis
 * 不构成投资建议。
 */

export const CRYPTO_INVESTMENT_FRAMEWORK = `
## 分析哲学（总纲）

| 原则 | 要点 |
|------|------|
| 数据优先 | 链上/ETF/情绪数据 > 纯 K 线猜测 |
| BTC 门控 | 山寨/投机逻辑必先过 BTC 不崩 |
| 情绪底 ≠ 宏观底 | 恐慌极值 ≠ 降息/牛市开始 |
| 不确定性框架 | 市场怕「未知」甚于「已知利空」 |
| 底部是区间 | 四数据共振，非单点 |
| 资金隔离 | 山寨/投机 = 可归零资金，与核心仓隔离 |
| 操作分层 | 定投 ✅ / 杠杆抄底 ❌ / 卖期权需有计划 |

## 九层分析模型（按序执行）

L0 BTC 门控 — 若 BTC 快速下跌或威胁 ~$50k，暂停山寨/投机建议，仅讨论 BTC/稳定币/风控
L1 跨市场资金 — 股票（韩股/美股 AI）波动是否吸走赌性资金
L2 宏观/不确定性 — FOMC/CPI/PCE 日历、油价→CPI、Fed 预期（可基于常识推断）
L3 情绪 — 恐慌贪婪指数、ETF 流向趋势（插件未提供则标注假设）
L4 链上结构 — LTH、交易所余额、矿机关机（插件未提供则标注待查）
L5 BTC 结构 — 市占率 60% 阈值、支撑区（用提供的 btcPriceUsd 粗判）
L6 山寨/赛道 — 山寨敞口、集中度、是否主线内
L7 结构风险 — CEX 托管、数据质量 flags、过度集中
L8 执行分层 — 定投/观望/减风险/不参与

## 核心决策门

### 门控 1：BTC
BTC 稳（横盘/温和波动）→ 可评估山寨配置与结构优化
BTC 大跌（~$50k 威胁）→ 仅 BTC/稳定币/风控，actionStance 倾向 defensive 或 avoid

### 门控 2：双底模型
| 类型 | 信号 | 含义 |
| 情绪底 | 恐慌≤25（极值≤15） | 短抄胜率可能↑，熊市或未结束 |
| 宏观底 | 通胀回落 + 降息周期 | 熊市结束必要条件 |
规则：情绪底 ≠ 熊市结束

### 门控 3：四数据底部共振（大底参考）
矿机关机 + LTH 吸筹 + 交易所余额↓ + ETF 流出衰竭 → 大底概率高
插件仅有恐慌指数/BTC 价时：明确标注「链上/ETF 数据未接入，大底判断不完整」

## 组合分析要点（映射用户持仓）

1. **BTC/ETH 核心占比** — 熊市定投底仓 vs 山寨投机隔离
2. **稳定币缓冲** — 现金弹药，宏观不确定时提高比例
3. **山寨敞口** — altcoinPct 高 + BTC 门控未过 → 高风险
4. **集中度** — top1/top3 过高 = 单点风险
5. **CEX vs 链上** — 托管/对手方风险
6. **数据质量 flags** — 缺价/加载失败降低建议置信度

## 操作分层（给用户建议时选用）

| 策略 | 条件 | 风险 |
| 小额定投 BTC | 熊市全程 / 情绪底 | 低 |
| 卖 Put 接货 | 有接货计划 + 保证金 + IV 高 | 中 |
| 山寨配置 | BTC 门控通过 + 可归零资金 | 高 |
| 事件投机 | BTC 稳 + 小仓 + 龙头 | 极高 |
| 杠杆抄底 | **不推荐** | 极高 |

## 分析任务（本次）

结合提供的 market context（恐慌贪婪、BTC 价格）与用户 portfolio snapshot：
1. 执行 L0–L3 + 可推断的 L5–L7
2. 判断情绪底/宏观底阶段（宏观可定性推断）
3. 评估组合结构是否适配当前行情
4. 给出分层操作参考（不说具体买卖价、不推荐杠杆）
5. 列出待跟踪指标（ETF 衰竭、CPI、LTH 等）
`;

export const CRYPTO_INVESTMENT_OUTPUT_SCHEMA = `{
  "healthScore": number (0-100, portfolio structure fitness + regime fit),
  "actionStance": "active" | "watch" | "defensive" | "avoid",
  "marketRegime": string (short label, e.g. "情绪底接近·宏观未确认" or "BTC门控通过·Risk-on"),
  "summary": string (1-3 sentences: one-line conclusion),
  "analysisLogic": string (2-5 sentences: causal chain, use arrows if helpful),
  "marketTiming": string (2-4 sentences: BTC gate, sentiment layer, macro inference),
  "portfolioAlignment": string (2-4 sentences: how holdings fit regime; alt/BTC/stablecoin/CEX),
  "risks": string[] (structure + regime + gate failures),
  "suggestions": string[] (tiered operation ideas: DCA/defensive/rebalance — no prices, no leverage),
  "disciplineReminders": string[] (1-3 framework principles for current context),
  "questionsToConsider": string[] (watchlist metrics to track, e.g. ETF exhaustion, CPI)
}`;
