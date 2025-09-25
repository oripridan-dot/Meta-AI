#!/usr/bin/env node
// scripts/smoke-test.js
// Quick operational test following runbook patterns

require('dotenv').config();

async function runSmokeTest() {
  console.log('💨 Meta-AI Smoke Test');
  console.log('====================\n');
  
  try {
    // 1. Load core components (per runbook)
    console.log('1️⃣ Loading core components...');
    const MetaAI = require('./src/core/meta-ai.js');
    const CodeExecutor = require('./src/core/code-executor.js');
    const DeepSeekClient = require('./src/api/deepseek-client.js');
    
    // 2. Instantiate (per runbook: always instantiate, don't use module directly)
    const executor = new CodeExecutor();
    const client = new DeepSeekClient();
    const metaAI = new MetaAI({ client, executor, verbose: true });
    
    console.log('   ✅ All components loaded and instantiated\n');
    
    // 3. Test simple evolution cycle
    console.log('2️⃣ Testing evolution cycle...');
    
    const task = {
      name: 'fibonacci',
      prompt: 'Implement efficient fibonacci function',
      testInput: 10,
      cycles: 1
    };
    
    const results = await metaAI.runMultipleEvolutions(task);
    const result = results[0];
    
    if (result.success) {
      console.log(`   ✅ Evolution successful`);
      console.log(`   📊 Result: ${result.result}`);
      console.log(`   ⏱️ Execution time: ${result.executionTime}ms`);
      console.log(`   🧠 Memory used: ${result.memoryUsed}KB`);
      console.log(`   🔤 Tokens used: ${result.tokensUsed}\n`);
    } else {
      console.log(`   ❌ Evolution failed: ${result.error}\n`);
      return false;
    }
    
    // 4. Test executor directly (per runbook validation)
    console.log('3️⃣ Testing code executor integrity...');
    
    const testCode = `
      module.exports = function(n) {
        if (n <= 1) return n;
        let a = 0, b = 1, temp;
        for (let i = 2; i <= n; i++) {
          temp = a + b;
          a = b;
          b = temp;
        }
        return b;
      };
    `;
    
    const execResult = await executor.executeCode(testCode, 'fibonacciTest', 10);
    
    if (execResult.success && execResult.result === 55) {
      console.log('   ✅ Executor working correctly');
      console.log(`   📈 Direct execution: ${execResult.executionTime}ms\n`);
    } else {
      console.log(`   ❌ Executor failed: ${execResult.error}\n`);
      return false;
    }
    
    // 5. Wisdom engine readiness check
    console.log('4️⃣ Checking wisdom engine readiness...');
    
    try {
      const wisdomPath = './src/core/wisdom-engine.js';
      if (require('fs').existsSync(wisdomPath)) {
        console.log('   ✅ Wisdom engine module present\n');
      } else {
        console.log('   ⚠️ Wisdom engine not found (ready for enhancement)\n');
      }
    } catch (error) {
      console.log(`   ⚠️ Wisdom engine check: ${error.message}\n`);
    }
    
    console.log('🎉 SMOKE TEST PASSED');
    console.log('Meta-AI system operational and ready for wisdom engine enhancement!\n');
    
    return true;
    
  } catch (error) {
    console.error('💥 SMOKE TEST FAILED');
    console.error('Error:', error.message);
    console.error('\n🔧 Follow runbook troubleshooting:');
    console.error('   • Restart API to reload .env');
    console.error('   • Verify executor instantiation');  
    console.error('   • Check API key visibility\n');
    
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  runSmokeTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Smoke test crashed:', error);
    process.exit(1);
  });
}

module.exports = runSmokeTest;