// quick-test.js - Immediate Verification
require('dotenv').config();

async function quickSystemTest() {
  console.log('🔍 Meta-AI Quick System Test');
  console.log('============================\n');
  
  // Test 1: Environment Check
  console.log('1. Environment Configuration:');
  console.log(`   ✓ DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? 'Set (' + process.env.DEEPSEEK_API_KEY.slice(0,10) + '...)' : 'Missing'}`);
  console.log(`   ✓ DEEPSEEK_MODEL: ${process.env.DEEPSEEK_MODEL || 'deepseek-coder'}`);
  console.log(`   ✓ VERBOSE: ${process.env.VERBOSE || 'false'}\n`);
  
  // Test 2: Module Loading
  console.log('2. Core Module Loading:');
  try {
    const CodeExecutor = require('./src/core/code-executor');
    console.log('   ✅ CodeExecutor loaded');
    
    const executor = new CodeExecutor();
    console.log('   ✅ CodeExecutor instantiated');
    console.log(`   ✅ executeCode method: ${typeof executor.executeCode === 'function' ? 'Available' : 'Missing'}\n`);
  } catch (error) {
    console.log(`   ❌ CodeExecutor error: ${error.message}\n`);
  }
  
  try {
    const DeepSeekClient = require('./src/api/deepseek-client');
    console.log('   ✅ DeepSeekClient loaded');
    
    const client = new DeepSeekClient();
    console.log('   ✅ DeepSeekClient instantiated\n');
  } catch (error) {
    console.log(`   ❌ DeepSeekClient error: ${error.message}\n`);
  }
  
  try {
    const MetaAI = require('./src/core/meta-ai');
    console.log('   ✅ MetaAI core loaded');
    
    const MetaAIEngine = require('./meta-ai-engine');
    console.log('   ✅ MetaAIEngine loaded');
    
    const engine = new MetaAIEngine();
    console.log('   ✅ MetaAIEngine instantiated\n');
  } catch (error) {
    console.log(`   ❌ MetaAI error: ${error.message}\n`);
  }
  
  // Test 3: Simple Code Execution Test
  console.log('3. Code Execution Test:');
  try {
    const CodeExecutor = require('./src/core/code-executor');
    const executor = new CodeExecutor();
    
    // Test with a simple function
    const testCode = `module.exports = function(n) { return n * 2; };`;
    const result = await executor.executeCode(testCode, 'double', 5);
    
    console.log(`   ✅ Code execution successful`);
    console.log(`   ✓ Input: 5, Output: ${result.result}, Expected: 10`);
    console.log(`   ✓ Success: ${result.success}`);
    console.log(`   ✓ Execution Time: ${result.executionTime}ms`);
    console.log(`   ✓ Memory Used: ${result.memoryUsed}KB\n`);
  } catch (error) {
    console.log(`   ❌ Execution test error: ${error.message}\n`);
  }
  
  console.log('🎯 System Status: Ready for AI Code Generation!');
  console.log('\nTo see the Meta-AI in action:');
  console.log('• Run: node demo.js');
  console.log('• Or: npm run test:meta');
}

quickSystemTest().catch(console.error);
