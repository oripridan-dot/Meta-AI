// demo.js - Live Meta-AI Demonstration
require('dotenv').config();
const MetaAI = require('./meta-ai-engine');

async function demonstrateMetaAI() {
  console.log('🤖 Meta-AI Live Demonstration');
  console.log('===============================\n');
  
  // Initialize the engine
  console.log('🔧 Initializing Meta-AI Engine...');
  const meta = new MetaAI({ verbose: true });
  
  // Check system health
  console.log('⚡ System Health Check:');
  console.log(`   Engine Status: ${meta.testSystemHealth()}`);
  console.log(`   API Key: ${process.env.DEEPSEEK_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Model: ${process.env.DEEPSEEK_MODEL || 'deepseek-coder'}`);
  console.log('');
  
  // Test 1: Simple Fibonacci
  console.log('🧪 Test 1: Generate Fibonacci Function');
  console.log('=====================================');
  try {
    const fibResult = await meta.run({
      name: 'fibonacci',
      prompt: 'Generate an efficient fibonacci function',
      testInput: 8
    });
    
    console.log(`✨ Generated and executed fibonacci(8)`);
    console.log(`   Result: ${fibResult.result} (expected: 21)`);
    console.log(`   Success: ${fibResult.success ? '✅' : '❌'}`);
    console.log(`   Execution Time: ${fibResult.executionTime}ms`);
    console.log(`   Memory Used: ${fibResult.memoryUsed}KB\n`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }
  
  // Test 2: Prime Number Check
  console.log('🧪 Test 2: Generate Prime Number Checker');
  console.log('=========================================');
  try {
    const primeResult = await meta.run({
      name: 'isPrime',
      prompt: 'Generate an efficient prime number checking function',
      testInput: 29
    });
    
    console.log(`✨ Generated and executed isPrime(29)`);
    console.log(`   Result: ${primeResult.result} (expected: true)`);
    console.log(`   Success: ${primeResult.success ? '✅' : '❌'}`);
    console.log(`   Execution Time: ${primeResult.executionTime}ms`);
    console.log(`   Memory Used: ${primeResult.memoryUsed}KB\n`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }
  
  // Test 3: Multiple Evolution Cycles
  console.log('🚀 Test 3: Multiple Evolution Cycles');
  console.log('====================================');
  try {
    const evolutionResult = await meta.runMultipleEvolutions(
      'factorial', 
      'Generate an optimized factorial function', 
      6, 
      2  // 2 evolution cycles
    );
    
    console.log(`✨ Evolution completed with ${evolutionResult.results.length} attempts`);
    console.log(`   Best Result: ${evolutionResult.summary.bestResult?.result} (expected: 720)`);
    console.log(`   Success Rate: ${evolutionResult.summary.successful}/${evolutionResult.summary.totalEvolutions}`);
    console.log(`   Avg Execution Time: ${evolutionResult.summary.avgExecutionTime.toFixed(2)}ms`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }
  
  console.log('🎉 Meta-AI Demonstration Complete!');
  console.log('\nNext Steps:');
  console.log('• Run full test suite: npm run test:meta');
  console.log('• Start API server: npm run api:start');
  console.log('• Integrate with The Director for Phase 2');
}

// Run the demonstration
demonstrateMetaAI().catch(console.error);
