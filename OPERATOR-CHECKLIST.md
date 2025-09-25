# Meta-AI Operator Checklist

## 🎯 Daily Operations (Two Commands Only)

### Restart API (after .env changes)
```bash
npm run api:restart
```

### Run Evolution Test
```bash
npm run test:meta
```

## 🔍 10-Second Sanity Check

### 1. Key Visibility
```bash
node -e "console.log('Key starts with:', process.env.DEEPSEEK_API_KEY?.slice(0,10))"
```
**Expected:** `Key starts with: sk-75cba7...`

### 2. Executor Integrity
```bash
node -e "const Ex = require('./src/core/code-executor'); console.log('Executor ready:', typeof new Ex().executeCode === 'function')"
```
**Expected:** `Executor ready: true`

### 3. Health Check
```bash
curl -s http://localhost:3000/health | jq '.ok'
```
**Expected:** `true`

## ❌ Troubleshooting Guide

| Symptom | Cause | Action |
|---------|-------|--------|
| "Non-JS or empty code" | 401 Unauthorized | `npm run api:restart` |
| "executeCode is not a function" | Module not instantiated | Check `new CodeExecutor()` |
| "should be Bearer..." | Empty key var | Restart API to reload .env |
| Package.json parse error | Invalid JSON | Restore clean package.json |

## ✅ Success Criteria
- DeepSeek client returns clean JS (no markdown fences)
- Executor runs functions without "Non-JS" errors  
- Evolution tests report timings/scores (not auth failures)
- API health endpoint returns `{"ok": true}`

---

**Last Updated:** $(date)  
**Status:** Production Ready - Phase 1 Complete
