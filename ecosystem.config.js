module.exports = {
  apps: [{
    name: "meta-ai-api",
    script: "server.js",
    env: {
      // PM2 inherits .env automatically; override here only if you must:
      // DEEPSEEK_API_KEY: "sk_live_…",
      HTTP_REQUEST_TIMEOUT_MS: 15000
    }
  }]
};
