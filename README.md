# Meta-AI Production System - Multi-Provider Enhanced

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PM2 (`npm install -g pm2`)
- API keys for desired providers

### Setup
```bash
# 1. Configure environment with multiple providers
cp .env.template .env
# Edit .env with your API keys (DeepSeek required, others optional)

# 2. Install dependencies
npm install

# 3. Test multi-provider system
npm run demo:multi

# 4. Start API server
npm run api:start
```

## 🏗️ Architecture

```
Meta-AI/
├── meta-ai-engine.js       # Multi-provider production engine
├── server.js               # Express API server
├── src/
│   ├── core/
│   │   ├── meta-ai.js      # Core evolution orchestrator  
│   │   └── code-executor.js # Sandboxed code execution
│   ├── api/
│   │   ├── multi-provider-client.js # Intelligent routing
│   │   ├── deepseek-client.js       # DeepSeek integration
│   │   ├── openai-client.js         # OpenAI integration
│   │   ├── claude-client.js         # Claude integration
│   │   └── gemini-client.js         # Gemini integration
│   └── integration_utils.js
├── test/
│   ├── meta-ai-test.js     # Core functionality tests
│   └── multi-provider-test.js # Multi-provider tests
└── ecosystem.config.js     # PM2 configuration
```

## 🤖 Supported AI Providers

### **Primary Providers**
- **⚡ DeepSeek Coder** - Specialized for code generation, fast, cost-effective
- **🧠 OpenAI GPT-4** - High quality reasoning and logic
- **🎭 Claude 3** - Excellent analysis with safety focus  
- **💎 Gemini Pro** - Google's multimodal capabilities

### **Intelligent Features**
- **Smart Routing**: Automatically selects best provider for each task
- **Automatic Fallback**: Seamless failover if primary provider fails
- **Performance Optimization**: Routes based on speed, success rate, and specialization
- **Health Monitoring**: Tracks provider performance and disables failing services

## 🔧 Operations

### Enhanced Commands
```bash
# Multi-provider demos
npm run demo:multi    # Full multi-provider demonstration
npm run demo          # Single provider demo

# Multi-provider testing
npm run test:multi    # Comprehensive multi-provider tests
npm run test:health   # Provider health check
npm run test:compare  # Performance comparison
npm run test:meta     # Core functionality tests

# System operations
npm run api:restart   # Restart API (after .env changes)
npm run quick         # Quick system validation
```

### Health Check
```bash
curl http://localhost:3000/health
```

## 🛡️ Security
- API keys in `.env` (never committed)
- Sandboxed code execution via VM2
- 5-second execution timeout
- Memory usage monitoring

## 🧪 Testing
- **Quick test:** `npm run test:meta quick`
- **Full suite:** `npm run test:meta`
- Tests fibonacci, factorial, isPrime with real AI generation

## 📊 Current Status: Phase 1+ - Multi-Provider Integration
**Mission:** Intelligent multi-provider AI orchestration with automatic fallback and performance optimization.

**Capabilities:**
- ⚡ **DeepSeek**: Active (code-specialized, fast)
- 🧠 **OpenAI**: Ready (needs API key)
- 🎭 **Claude**: Ready (needs API key)  
- 💎 **Gemini**: Ready (needs API key)
- 🔄 **Smart Routing**: Automatic provider selection
- 🛡️ **Fallback System**: Resilient error handling
- 📈 **Performance Tracking**: Real-time metrics

**Next Steps:**
- Configure additional provider API keys
- cp .env.template .env
- Phase 2: Structured building with JSON build plans
- Phase 3: Interactive feedback loops
- Advanced wisdom engine with multi-provider learning
# Meta-AI
