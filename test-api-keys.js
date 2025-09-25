// test-api-keys.js - Live API Key Testing
require('dotenv').config();
const axios = require('axios');

class APIKeyTester {
  constructor() {
    this.results = {};
    this.timeout = 10000; // 10 second timeout
  }

  async testDeepSeek() {
    console.log('🔍 Testing DeepSeek API...');
    try {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey || apiKey === 'your_deepseek_key_here') {
        return { success: false, error: 'API key not configured' };
      }

      const response = await axios.post('https://api.deepseek.com/chat/completions', {
        model: 'deepseek-coder',
        messages: [
          { role: 'system', content: 'You are a code generator.' },
          { role: 'user', content: 'Generate: module.exports = function(n) { return n * 2; };' }
        ],
        max_tokens: 100,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      const content = response.data?.choices?.[0]?.message?.content;
      return {
        success: true,
        response: content?.slice(0, 100) + '...',
        status: response.status,
        model: 'deepseek-coder'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.status === 401 ? 'Invalid API key' : error.message,
        status: error.response?.status
      };
    }
  }

  async testOpenAI() {
    console.log('🔍 Testing OpenAI API...');
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'your_openai_key_here') {
        return { success: false, error: 'API key not configured' };
      }

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are a code generator.' },
          { role: 'user', content: 'Generate: module.exports = function(n) { return n * 2; };' }
        ],
        max_tokens: 100,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      const content = response.data?.choices?.[0]?.message?.content;
      return {
        success: true,
        response: content?.slice(0, 100) + '...',
        status: response.status,
        model: 'gpt-4-turbo-preview'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.status === 401 ? 'Invalid API key' : 
               error.response?.status === 429 ? 'Rate limit exceeded' :
               error.response?.data?.error?.message || error.message,
        status: error.response?.status
      };
    }
  }

  async testClaude() {
    console.log('🔍 Testing Claude API...');
    try {
      const apiKey = process.env.CLAUDE_API_KEY;
      if (!apiKey || apiKey === 'your_claude_key_here') {
        return { success: false, error: 'API key not configured' };
      }

      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 100,
        messages: [
          { role: 'user', content: 'Generate: module.exports = function(n) { return n * 2; };' }
        ]
      }, {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: this.timeout
      });

      const content = response.data?.content?.[0]?.text;
      return {
        success: true,
        response: content?.slice(0, 100) + '...',
        status: response.status,
        model: 'claude-3-sonnet'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.status === 401 ? 'Invalid API key' : 
               error.response?.data?.error?.message || error.message,
        status: error.response?.status
      };
    }
  }

  async testGemini() {
    console.log('🔍 Testing Gemini API...');
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your_gemini_key_here') {
        return { success: false, error: 'API key not configured' };
      }

      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        contents: [{
          parts: [{
            text: 'Generate: module.exports = function(n) { return n * 2; };'
          }]
        }],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.1
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return {
        success: true,
        response: content?.slice(0, 100) + '...',
        status: response.status,
        model: 'gemini-pro'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.status === 403 ? 'Invalid API key or permissions' : 
               error.response?.data?.error?.message || error.message,
        status: error.response?.status
      };
    }
  }

  async runAllTests() {
    console.log('🚀 Live API Key Testing Suite');
    console.log('=============================\n');

    const providers = [
      { name: 'DeepSeek', emoji: '⚡', test: () => this.testDeepSeek() },
      { name: 'OpenAI', emoji: '🧠', test: () => this.testOpenAI() },
      { name: 'Claude', emoji: '🎭', test: () => this.testClaude() },
      { name: 'Gemini', emoji: '💎', test: () => this.testGemini() }
    ];

    const results = [];

    for (const provider of providers) {
      console.log(`\n${provider.emoji} Testing ${provider.name}...`);
      
      try {
        const result = await provider.test();
        results.push({
          provider: provider.name,
          emoji: provider.emoji,
          ...result
        });

        if (result.success) {
          console.log(`   ✅ ${provider.name}: WORKING`);
          console.log(`   📤 Model: ${result.model}`);
          console.log(`   🔄 Response: ${result.response}`);
        } else {
          console.log(`   ❌ ${provider.name}: FAILED`);
          console.log(`   ⚠️  Error: ${result.error}`);
          if (result.status) {
            console.log(`   📊 Status: ${result.status}`);
          }
        }
      } catch (error) {
        console.log(`   💥 ${provider.name}: EXCEPTION`);
        console.log(`   ⚠️  Error: ${error.message}`);
        results.push({
          provider: provider.name,
          emoji: provider.emoji,
          success: false,
          error: error.message
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(40));
    console.log('📊 API KEY TEST SUMMARY');
    console.log('='.repeat(40));

    const working = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n✅ Working Providers: ${working.length}/4`);
    working.forEach(r => {
      console.log(`   ${r.emoji} ${r.provider}: Ready for use`);
    });

    if (failed.length > 0) {
      console.log(`\n❌ Failed Providers: ${failed.length}/4`);
      failed.forEach(r => {
        console.log(`   ${r.emoji} ${r.provider}: ${r.error}`);
      });
    }

    // Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    if (working.length === 0) {
      console.log('   ⚠️  No working API keys found!');
      console.log('   📝 Update .env file with valid API keys');
      console.log('   💡 Start with DeepSeek (most cost-effective for code)');
    } else if (working.length === 1) {
      console.log('   ⚡ Single provider system ready');
      console.log('   💡 Add more providers for redundancy and specialization');
    } else {
      console.log('   🎉 Multi-provider system ready!');
      console.log('   🚀 Run: npm run demo:multi');
      console.log('   🧪 Run: npm run test:multi');
    }

    // Update environment status
    console.log('\n🔧 NEXT STEPS:');
    if (working.length > 0) {
      console.log('   1. npm run api:restart  # Apply new configuration');
      console.log('   2. npm run demo:multi   # Test multi-provider system');
      console.log('   3. npm run test:compare # Compare provider performance');
    } else {
      console.log('   1. Fix API keys in .env file');
      console.log('   2. npm run validate     # Re-test configuration');
    }

    return results;
  }
}

// Run tests
const tester = new APIKeyTester();
tester.runAllTests().catch(console.error);
