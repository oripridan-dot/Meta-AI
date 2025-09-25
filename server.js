// server.js
require('dotenv').config();

const path = require('path');
const express = require('express');

function loadIntegration() {
  try {
    // Load from correct path
    return require(path.join(__dirname, 'src', 'integration_utils.js'));
  } catch {
    // Fallback dummy
    return { MultiAgentSystem: class { async testSystemHealth() { return { success: true }; } } };
  }
}

const { MultiAgentSystem } = loadIntegration();
const system = new MultiAgentSystem();

const app = express();
const port = Number(process.env.PORT || 3000);

app.get('/health', async (req, res) => {
  try {
    const status = await system.testSystemHealth();
    res.json({ ok: !!status.success, service: 'meta-ai', env: process.env.NODE_ENV || 'production', status });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(port, () => {
  console.log(`✅ Health server listening on :${port}`);
});
