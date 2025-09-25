// validate-providers.js - Quick Multi-Provider Validation
require('dotenv').config();

async function validateProviders() {
  console.log('🔍 Multi-Provider API Key Validation');
  console.log('====================================\n');
  
  // Check API key configuration
  const providers = [
    { name: 'DeepSeek', env: 'DEEPSEEK_API_KEY', emoji: '⚡' },
    { name: 'OpenAI', env: 'OPENAI_API_KEY', emoji: '🧠' },
    { name: 'Claude', env: 'CLAUDE_API_KEY', emoji: '🎭' },
    { name: 'Gemini', env: 'GEMINI_API_KEY', emoji: '💎' }
  ];
  
  let configuredCount = 0;
  
  console.log('API Key Status:');
  providers.forEach(provider => {
    const key = process.env[provider.env];
    const isConfigured = key && key !== `your_${provider.name.toLowerCase()}_key_here` && key.length > 10;
    
    if (isConfigured) {
      configuredCount++;
      console.log(`${provider.emoji} ${provider.name}: ✅ Configured (${key.slice(0, 8)}...)`);
    } else {
      console.log(`${provider.emoji} ${provider.name}: ❌ Not configured`);
    }
  });
  
  console.log(`\n📊 Summary: ${configuredCount}/4 providers configured\n`);
  
  if (configuredCount >= 2) {
    console.log('🎉 Multi-provider system ready!');
    console.log('Next steps:');
    console.log('• Run: npm run demo:multi');
    console.log('• Run: npm run test:multi');
    console.log('• Configure remaining providers for maximum resilience');
  } else if (configuredCount === 1) {
    console.log('⚡ Single provider ready (basic functionality)');
    console.log('• Add more API keys to enable multi-provider features');
    console.log('• Current provider will handle all requests');
  } else {
    console.log('❌ No providers configured');
    console.log('• Add at least one API key to .env file');
    console.log('• DeepSeek recommended for code generation');
  }
  
  // Test client loading
  console.log('\n🔧 Client Loading Test:');
  try {
    const MultiProviderClient = require('./src/api/multi-provider-client');
    const client = new MultiProviderClient({ verbose: false });
    
    const providerStatus = client.getProviderStatus();
    const activeProviders = Object.keys(providerStatus).filter(p => providerStatus[p].active);
    
    console.log(`✅ Multi-provider client loaded successfully`);
    console.log(`📊 Active providers: ${activeProviders.length} (${activeProviders.join(', ')})`);
    
    if (activeProviders.length > 0) {
      console.log('\n🚀 System ready for AI code generation!');
    }
    
  } catch (error) {
    console.log(`❌ Client loading failed: ${error.message}`);
  }
}

validateProviders().catch(console.error);
