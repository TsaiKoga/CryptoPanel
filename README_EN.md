# CryptoPanel

<div align="center">

**A Powerful Cryptocurrency Asset Dashboard Chrome Extension**

Unified management of your CEX and on-chain cryptocurrency assets

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green?logo=google-chrome)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)

[English](./README_EN.md) | [中文](./README.md)

</div>

---

## ✨ Features

### 🔐 Privacy & Security
- **Fully Local Storage**: All API keys and configurations are stored only in your browser locally
- **No Self-Hosted Server**: CryptoPanel does not run any backend; aside from AI analysis you explicitly trigger, data never passes through this project
- **Read-Only Permissions**: It is recommended to grant API keys read-only permissions only to ensure fund safety

### 📊 Unified Asset Management
- **CEX Asset Sync**: Supports Binance, OKX and other mainstream exchanges
- **On-Chain Asset Query**: Supports multiple EVM-compatible chains and Solana
- **DeFi Protocol Support**: Automatically identifies protocol assets such as EigenLayer, Aerodrome, Aave, Stargate
- **Real-Time Prices**: Automatically fetches asset prices (DeFiLlama, CryptoCompare, CoinGecko)

### 🎨 User Experience
- **Multi-Language Support**: Chinese, English
- **Dark Mode**: Supports light, dark, and system theme
- **Asset Visualization**: Pie chart showing asset distribution
- **Smart Caching**: Reduces API calls and improves performance

### 💰 Multi-Currency Display
- **Multiple Currency Units**: Supports USD, CNY, BTC display
- **Asset Filtering**: Can hide small assets
- **Real-Time Updates**: Supports manual refresh and automatic updates

### 🧠 Portfolio Insights & AI Analysis
- **Local Health Score**: No API key required — instant metrics for concentration, CEX/on-chain split, stablecoin ratio, and more
- **Risk Tags**: Automatically flags high single-asset concentration, high exchange custody ratio, etc.
- **BYOK AI Insights** (optional): Configure your own AI API key in settings for one-click portfolio structure analysis and suggestions
- **No Intermediary Server**: AI requests go directly from the extension background to OpenAI / DeepSeek / local Ollama — never through a CryptoPanel server
- **Privacy Mode**: By default, only allocation percentages are sent to AI — never wallet addresses, account names, or exchange API keys

## 📋 Supported Exchanges

- ✅ **Binance**
  - Spot account assets
  - Flexible Earn
  - Locked Earn
  - Staking assets

- ✅ **OKX**
  - Funding account assets
  - Trading account assets

## 🔗 Supported Blockchains

### EVM Chains

- ✅ **Ethereum** (Mainnet)
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
- ✅ **Robinhood Chain** (Chain ID: 4663)
  - Native **ETH**, **WETH**, **USDG**
  - **USDC** / **USDT** (canonical bridge deterministic addresses; active once bridged)
  - Popular ecosystem tokens: **CASHCAT**, **PONS**, **NET**, **DOGO** (CoinGecko pricing)

### Non-EVM Chains

- ✅ **Solana** — SOL and SPL tokens (including xStock, etc.)
- ✅ **Hyperliquid** — perpetual account assets

## 🛠️ Supported DeFi Protocols

- ✅ **EigenLayer** - Staking assets
- ✅ **HyperCore** - Staking assets
- ✅ **Aerodrome** - Liquidity pools
- ✅ **Aave** - Lending assets
- ✅ **Stargate** - Cross-chain assets

## 🚀 Quick Start

### Installation

#### Method 1: Install from Chrome Web Store (Recommended)

1. Visit [Chrome Web Store](https://chrome.google.com/webstore) and search for "CryptoPanel"
2. Click "Add to Chrome"
3. Complete installation

#### Method 2: Build from Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/CryptoPanel.git
   cd CryptoPanel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build:extension
   ```

4. **Load the extension**
   - Open Chrome browser
   - Visit `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `dist` folder in the project root directory

### Usage Guide

#### 1. Configure Exchange API

1. Click the extension icon
2. Click the settings button (⚙️ icon)
3. In the "Exchange (CEX)" tab:
   - Select an exchange (Binance or OKX)
   - Enter a note name (optional)
   - Enter API Key and Secret Key
   - For OKX, also enter Passphrase
   - Click "Add Exchange"

**Security Tips**:
- It is recommended to grant API keys **read-only permissions** only
- API keys are stored only in your browser locally and will not be uploaded to any server

#### 2. Add On-Chain Wallets

1. In the settings page, go to the "On-Chain Wallet" tab
2. Enter a wallet address (EVM or Solana)
3. Enter a note name (optional)
4. Click "Add Wallet"

#### 3. View Assets

1. Click the extension icon to open the main panel
2. View total asset valuation and asset list
3. Click the refresh button (🔄) to update asset data
4. Use tabs to switch between different asset sources

#### 4. Customize Settings

In the "General Settings" tab, you can:
- Switch language (Chinese/English)
- Switch theme (Light/Dark/Follow System)
- Hide small assets
- Set small asset threshold
- Configure custom EVM RPC endpoints and Solana RPC

#### 5. Portfolio Insights & AI Analysis

**Local insights (no setup required)**

1. Open the main panel — the **Portfolio Insights** card appears on the right
2. View health score, CEX/stablecoin/top-holding ratios, and risk tags
3. All metrics are computed locally with zero API cost

**AI analysis (optional — bring your own API key)**

1. Go to Settings → **AI Analysis** tab
2. Enable AI analysis and choose a provider (OpenAI, DeepSeek, or local Ollama)
3. Enter your API key (optional for local Ollama)
4. On first enable, the extension requests permission to reach the AI provider domain (`optional_host_permissions`)
5. Return to the dashboard and click **AI Analyze** for structured insights

**Supported AI providers**

| Provider | Notes |
|----------|-------|
| OpenAI | Default model: `gpt-4o-mini` |
| DeepSeek | Default model: `deepseek-chat` |
| Custom / Local | e.g. Ollama: `http://127.0.0.1:11434/v1/chat/completions` |

**Platform differences**

- **Chrome extension**: Recommended — direct access to all cloud AI providers
- **Web version** (`npm run dev`): Cloud AI may be blocked by browser CORS; use the extension or local Ollama

> ⚠️ AI output is for reference only and is not financial advice. See the disclaimer below.

## 🛠️ Tech Stack

### Frontend Framework
- **React 19.2.0** - UI framework
- **TypeScript 5** - Type safety
- **Next.js 16.0.7** - React framework (for development)
- **Vite 6.0.0** - Build tool (for Chrome extension build)

### UI Libraries
- **Tailwind CSS 4** - Styling framework
- **Radix UI** - Unstyled component library
- **Recharts 3.5.1** - Chart library
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

### Blockchain Related
- **viem 2.41.2** - EVM on-chain interaction
- **@solana/web3.js 1.98** - Solana on-chain interaction
- **ccxt 4.5.24** - Cryptocurrency exchange library

### Others
- **next-themes** - Theme management
- **Chrome Extension API** - Chrome extension functionality

## 📁 Project Structure

```
CryptoPanel/
├── docs/                    # Project documentation
│   ├── ARCHITECTURE.md     # Architecture documentation
│   ├── API_INTEGRATION.md  # API integration documentation
│   ├── COMPONENTS.md       # Component documentation
│   ├── CONFIGURATION.md    # Configuration documentation
│   ├── DEVELOPMENT.md      # Development guide
│   └── PUBLISHING.md       # Publishing guide
├── public/                  # Static resources
│   ├── popup.html          # Popup page
│   ├── options.html        # Options page
│   └── icon*.png           # Icon files
├── src/
│   ├── app/                # Next.js app (for development)
│   │   ├── page.tsx        # Main page
│   │   ├── settings/       # Settings page
│   │   └── globals.css     # Global styles
│   ├── background.ts       # Chrome extension background script
│   ├── popup.tsx           # Popup entry
│   ├── options.tsx         # Options page entry
│   ├── components/         # React components
│   │   ├── dashboard/      # Dashboard components
│   │   │   ├── portfolio-insights.tsx  # Portfolio insights & AI analysis
│   │   │   └── ...
│   │   ├── settings/       # Settings components
│   │   │   ├── ai-settings.tsx         # AI analysis configuration
│   │   │   └── ...
│   │   ├── donation/       # Donation components
│   │   └── ui/             # UI base components
│   ├── hooks/              # React Hooks
│   ├── lib/                # Utility libraries
│   │   ├── api.ts          # API calls (incl. AI analysis routing)
│   │   ├── portfolio-snapshot.ts  # Portfolio snapshot & health score
│   │   ├── ai-analyze.ts   # AI prompts & direct provider calls
│   │   ├── onchain.ts      # EVM on-chain asset fetching
│   │   ├── solana-core.ts  # Solana on-chain asset fetching
│   │   ├── chains/         # Custom EVM chain definitions (e.g. HyperEVM, Robinhood)
│   │   ├── protocols/     # DeFi protocol integration
│   │   ├── storage.ts      # Storage management
│   │   └── i18n.ts         # Internationalization
│   └── types/              # TypeScript type definitions
├── manifest.json           # Chrome extension manifest
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project dependencies
```

## 🧑‍💻 Development Guide

### Requirements

- Node.js 18+
- npm or yarn or pnpm

### Development Commands

```bash
# Install dependencies
npm install

# Development mode (Next.js)
npm run dev

# Build Chrome extension
npm run build:extension

# Code linting
npm run lint
```

### Debugging

1. **Background Script**
   - Click "Inspect views service worker" for the extension in Chrome extension management page

2. **Popup**
   - Right-click the extension icon and select "Inspect popup"

3. **Options Page**
   - Right-click in the settings page and select "Inspect"

### Adding New Features

For detailed development guide, please see [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## 📖 Documentation

- [Architecture](./docs/ARCHITECTURE.md) - System architecture and data flow
- [Components](./docs/COMPONENTS.md) - Component detailed documentation
- [API Integration](./docs/API_INTEGRATION.md) - External API integration documentation
- [Configuration](./docs/CONFIGURATION.md) - Configuration and storage documentation
- [Development Guide](./docs/DEVELOPMENT.md) - Development guide and best practices
- [Publishing Guide](./docs/PUBLISHING.md) - Chrome Web Store publishing guide

## 🔒 Privacy & Security

### Data Storage
- All data (API keys, wallet addresses, settings) is stored only in your browser locally
- Uses Chrome's `chrome.storage.local` API
- CryptoPanel hosts no server; when AI analysis is enabled, portfolio summaries are sent directly from the extension to your chosen AI provider

### API Calls
The extension sends requests to the following services:
- **Exchange APIs**: Get account balance (only when you configure API keys)
- **Price APIs**: Get token prices (public APIs, no authentication required)
- **RPC Nodes**: Query on-chain asset balances (public nodes)
- **AI Providers** (optional): Only when you enable AI analysis and click **AI Analyze** — the background script calls your configured provider (OpenAI, DeepSeek, Ollama, etc.) directly; by default only structured allocation summaries are sent, never wallet addresses or API keys

### AI Analysis Privacy
- AI API keys are stored locally in the browser, same as CEX API keys
- CryptoPanel does **not** provide or host any AI proxy server
- No data is sent to AI providers unless you enable AI and trigger an analysis
- Results are cached locally (24 hours) to avoid duplicate requests

### Security Recommendations
- ✅ Grant API keys **read-only permissions** only
- ✅ Regularly check API key permissions
- ✅ Do not share your API keys
- ✅ Uninstalling the extension will delete all local data

For detailed privacy policy, please see [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

### Ways to Contribute
- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🔧 Submit Pull Requests

## 💝 Supporting the Project

If CryptoPanel is helpful to you, welcome to support the project through the following ways:

- ⭐ Star the project
- 🐛 Report bugs or suggestions
- 💰 Cryptocurrency donations (in the "Support Project" tab in settings)

## 📝 License

This project is licensed under the [Apache 2.0 License](./LICENSE).

## ⚠️ Disclaimer

- This extension does not constitute investment advice
- **AI analysis** is generated by third-party models and may contain errors — always use your own judgment
- Cryptocurrency investment involves high risks, please invest carefully
- We are not responsible for any investment losses
- Please make important decisions based on exchange and on-chain data

For detailed terms of service, please see [TERMS_OF_SERVICE.md](./TERMS_OF_SERVICE.md)

## 📞 Contact

- **GitHub Issues**: [Submit an issue](https://github.com/tsaikoga/CryptoPanel/issues)

## 🙏 Acknowledgments

Thanks to the following open source projects and services:

- [viem](https://viem.sh/) - EVM utility library
- [@solana/web3.js](https://solana.com/docs/clients/javascript) - Solana utility library
- [ccxt](https://github.com/ccxt/ccxt) - Cryptocurrency exchange library
- [DeFiLlama](https://defillama.com/) - Price data
- [CryptoCompare](https://www.cryptocompare.com/) - Price data
- [CoinGecko](https://www.coingecko.com/) - Price data
- [Radix UI](https://www.radix-ui.com/) - UI component library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

<div align="center">

**Made with ❤️ by [Your Name]**

[⬆ Back to top](#cryptopanel)

</div>

