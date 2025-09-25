// multi-provider-demo.js - Multi-Agent AI Demonstration
require('dotenv').config();
const MetaAI = require('./meta-ai-engine');

async function multiProviderDemo() {
  console.log('🤖 Meta-AI Multi-Provider System Demonstration');
  console.log('==============================================\n');
  
  // Initialize the multi-provider engine
  console.log('🔧 Initializing Multi-Provider Meta-AI Engine...\n');
  const meta = new MetaAI({ verbose: true });
  
  // System health and provider status
  console.log('⚡ System Health & Provider Status:');
  const health = meta.testSystemHealth();
  console.log(`   Engine Status: ${health.status}`);
  console.log(`   Active Providers: ${health.activeProviders.length}/${health.totalProviders}`);
  console.log('');
  
  // Display provider details
  console.log('🌐 Available AI Providers:');
  const providerStatus = meta.getProviderStatus();
  for (const [name, status] of Object.entries(providerStatus)) {
    const emoji = name === 'deepseek' ? '⚡' : name === 'openai' ? '🧠' : name === 'claude' ? '🎭' : '💎';
    const statusIcon = status.active ? '✅' : '❌';
    console.log(`   ${emoji} ${name.toUpperCase()}: ${statusIcon} (failures: ${status.failures})`);
  }
  console.log('');
  
  // Test scenarios with different complexities
  const testCases = [
    {
      name: 'Simple Math',
      task: 'fibonacci',
      prompt: 'Generate a fast fibonacci function using iteration',
      input: 10,
      expected: 55
    },
    {
      name: 'Algorithm Challenge',
      task: 'isPrime',
      prompt: 'Create an optimized prime number checker using trial division with square root optimization',
      input: 97,
      expected: true
    },
    {
      name: 'Complex Logic',
      task: 'factorial',
      prompt: 'Generate a factorial function with BigInt support for large numbers and error handling',
      input: 8,
      expected: 40320
    }
  ];
  
  console.log('🧪 Multi-Provider Evolution Tests:');
  console.log('==================================\n');
  
  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log(`Test ${i + 1}: ${test.name}`);
    console.log(`Task: ${test.task}(${test.input})`);
    console.log(`Prompt: ${test.prompt.slice(0, 60)}...`);
    console.log('---');
    
    try {
      const result = await meta.run({
        name: test.task,
        prompt: test.prompt,
        testInput: test.input
      });
      
      const success = result.success && result.result === test.expected;
      const provider = result.provider || 'unknown';
      
      console.log(`🤖 Provider Used: ${provider.toUpperCase()}`);
      console.log(`✨ Result: ${result.result} (expected: ${test.expected})`);
      console.log(`🎯 Status: ${success ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`⏱️  Request Time: ${result.requestTime || 'N/A'}ms`);
      console.log(`🔧 Execution Time: ${result.executionTime}ms`);
      console.log(`💾 Memory Used: ${result.memoryUsed}KB\n`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
    
    // Brief pause between tests
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Provider resilience test
  console.log('🛡️  Provider Resilience Test:');
  console.log('=============================');
  
  try {
    console.log('Attempting multiple rapid requests to test fallback system...\n');
    
    const rapidTests = [
      meta.run('factorial', 4),
      meta.run('fibonacci', 7),
      meta.run('isPrime', 13)
    ];
    
    const results = await Promise.allSettled(rapidTests);
    
    console.log('Rapid test results:');
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        const provider = result.value.provider || 'unknown';
        console.log(`   ✅ Test ${idx + 1}: ${provider.toUpperCase()} - ${result.value.result}`);
      } else {
        console.log(`   ❌ Test ${idx + 1}: Failed - ${result.reason?.message?.slice(0, 50)}...`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Resilience test error: ${error.message}`);
  }
  
  console.log('\n🎉 Multi-Provider Demo Complete!');
  console.log('\n📊 Final Provider Status:');
  const finalStatus = meta.getProviderStatus();
  for (const [name, status] of Object.entries(finalStatus)) {
    const emoji = name === 'deepseek' ? '⚡' : name === 'openai' ? '🧠' : name === 'claude' ? '🎭' : '💎';
    console.log(`   ${emoji} ${name.toUpperCase()}: ${status.active ? 'Active' : 'Inactive'} (${status.failures} failures)`);
  }
  
  console.log('\n🚀 Next Steps:');
  console.log('• Configure additional provider API keys in .env');
  console.log('• Run: npm run test:multi');
  console.log('• Start API: npm run api:start');
  console.log('• Integration ready for The Director!');
}

// Run the demonstration
multiProviderDemo().catch(console.error);
