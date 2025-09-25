#!/usr/bin/env node
// scripts/health-check.js
// Comprehensive system validation following the runbook

require('dotenv').config();
const path = require('path');

class SystemHealthChecker {
  constructor() {
    this.results = {
      environment: {},
      modules: {},
      apis: {},
      database: {},
      execution: {},
      overall: 'PENDING'
    };
  }

  async runFullDiagnostics() {
    console.log('🔍 Meta-AI System Health Check');
    console.log('================================\n');

    try {
      await this.checkEnvironment();
      await this.checkModuleIntegrity();
      await this.checkAPIConnectivity();
      await this.checkDatabase();
      await this.checkExecution();
      
      this.generateOverallStatus();
      this.printResults();
      
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      this.results.overall = 'CRITICAL_FAILURE';
    }
    
    return this.results;
  }

  async checkEnvironment() {
    console.log('🌍 Environment Configuration...');
    
    // 1. .env file existence
    const envExists = require('fs').existsSync('.env');
    this.results.environment.envFile = envExists ? '✅ Present' : '❌ Missing';
    
    // 2. Critical environment variables
    const requiredVars = [
      'DEEPSEEK_API_KEY',
      'MODEL_PROVIDER',
      'EXECUTION_TIMEOUT_MS',
      'NODE_ENV'
    ];
    
    this.results.environment.variables = {};
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      const status = value ? 
        (varName.includes('KEY') ? '✅ Set (hidden)' : `✅ ${value}`) : 
        '❌ Missing';
      this.results.environment.variables[varName] = status;
    });
    
    // 3. Key visibility test (per runbook)
    if (process.env.DEEPSEEK_API_KEY) {
      const keyPreview = process.env.DEEPSEEK_API_KEY.slice(0, 8) + '...';
      this.results.environment.keyPreview = `✅ ${keyPreview}`;
    }
    
    console.log('   Environment check completed\n');
  }

  async checkModuleIntegrity() {
    console.log('📦 Module Integrity...');
    
    const criticalModules = [
      { path: './src/core/meta-ai.js', class: 'MetaAI' },
      { path: './src/core/code-executor.js', class: 'CodeExecutor' },
      { path: './src/api/deepseek-client.js', class: 'DeepSeekClient' },
      { path: './integration_utils.js', class: 'MultiAgentSystem' }
    ];
    
    this.results.modules = {};
    
    for (const module of criticalModules) {
      try {
        const ModuleClass = require(path.resolve(module.path));
        const instance = module.class === 'MetaAI' ? 
          new ModuleClass.MetaAI || new ModuleClass() :
          module.class === 'MultiAgentSystem' ?
          new ModuleClass.MultiAgentSystem() :
          new ModuleClass();
        
        this.results.modules[module.class] = '✅ Loaded & Instantiated';
        
        // Special executor test (per runbook)
        if (module.class === 'CodeExecutor' && typeof instance.executeCode === 'function') {
          this.results.modules[`${module.class}_callable`] = '✅ executeCode method verified';
        }
        
      } catch (error) {
        this.results.modules[module.class] = `❌ Failed: ${error.message.slice(0, 50)}...`;
      }
    }
    
    console.log('   Module integrity check completed\n');
  }

  async checkAPIConnectivity() {
    console.log('🌐 API Connectivity...');
    
    this.results.apis = {};
    
    // DeepSeek connectivity test
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const DeepSeekClient = require('./src/api/deepseek-client.js');
        const client = new DeepSeekClient();
        
        // Simple generation test
        const result = await client.generateCode('Return a function that adds two numbers');
        const isValidJS = result.code && result.code.includes('module.exports');
        
        this.results.apis.deepseek = isValidJS ? 
          '✅ Connected & Generating JS' : 
          '⚠️ Connected but invalid response format';
          
      } catch (error) {
        if (error.message.includes('401')) {
          this.results.apis.deepseek = '❌ Unauthorized (check API key)';
        } else {
          this.results.apis.deepseek = `❌ ${error.message.slice(0, 60)}...`;
        }
      }
    } else {
      this.results.apis.deepseek = '⚠️ No API key configured';
    }
    
    // OpenAI connectivity test (if configured)
    if (process.env.OPENAI_API_KEY) {
      try {
        // Test if OpenAI client would work (don't actually call to save tokens)
        this.results.apis.openai = '✅ Key configured (not tested to preserve tokens)';
      } catch (error) {
        this.results.apis.openai = `❌ Configuration error: ${error.message}`;
      }
    } else {
      this.results.apis.openai = '⚠️ Not configured';
    }
    
    console.log('   API connectivity check completed\n');
  }

  async checkDatabase() {
    console.log('🗄️ Database Systems...');
    
    this.results.database = {};
    
    try {
      // Check if database module loads
      const dbPath = './src/db/db.js';
      if (require('fs').existsSync(dbPath)) {
        const db = require(path.resolve(dbPath));
        this.results.database.module = '✅ Database module loaded';
      } else {
        this.results.database.module = '⚠️ Database module not found';
      }
      
      // Check SQLite availability
      try {
        require('sqlite3');
        this.results.database.sqlite3 = '✅ SQLite3 available';
      } catch {
        this.results.database.sqlite3 = '❌ SQLite3 not installed';
      }
      
    } catch (error) {
      this.results.database.error = `❌ ${error.message}`;
    }
    
    console.log('   Database check completed\n');
  }

  async checkExecution() {
    console.log('⚡ Code Execution...');
    
    this.results.execution = {};
    
    try {
      const CodeExecutor = require('./src/core/code-executor.js');
      const executor = new CodeExecutor();
      
      // Test with simple function
      const testCode = 'module.exports = function(n) { return n * 2; };';
      const result = await executor.executeCode(testCode, 'doubleTest', 5);
      
      if (result.success && result.result === 10) {
        this.results.execution.basic = '✅ Basic execution working';
        this.results.execution.performance = `✅ ${result.executionTime}ms execution time`;
        this.results.execution.memory = `✅ ${result.memoryUsed}KB memory usage`;
      } else {
        this.results.execution.basic = `❌ Execution failed: ${result.error || 'Wrong result'}`;
      }
      
    } catch (error) {
      this.results.execution.error = `❌ Executor instantiation failed: ${error.message}`;
    }
    
    console.log('   Execution check completed\n');
  }

  generateOverallStatus() {
    const issues = [];
    
    // Critical failures
    if (this.results.environment.envFile.includes('❌')) issues.push('Missing .env file');
    if (!process.env.DEEPSEEK_API_KEY) issues.push('Missing DeepSeek API key');
    if (Object.values(this.results.modules).some(status => status.includes('❌'))) {
      issues.push('Module loading failures');
    }
    if (this.results.apis.deepseek?.includes('❌')) issues.push('API connectivity failure');
    if (this.results.execution.basic?.includes('❌')) issues.push('Code execution failure');
    
    if (issues.length === 0) {
      this.results.overall = '✅ ALL_SYSTEMS_OPERATIONAL';
    } else if (issues.length <= 2) {
      this.results.overall = '⚠️ MINOR_ISSUES_DETECTED';
    } else {
      this.results.overall = '❌ CRITICAL_ISSUES_DETECTED';
    }
    
    this.results.issues = issues;
  }

  printResults() {
    console.log('📋 HEALTH CHECK SUMMARY');
    console.log('======================');
    console.log(`Overall Status: ${this.results.overall}\n`);
    
    if (this.results.issues && this.results.issues.length > 0) {
      console.log('🚨 Issues Detected:');
      this.results.issues.forEach(issue => console.log(`   • ${issue}`));
      console.log('');
    }
    
    console.log('📊 Detailed Results:');
    console.log(JSON.stringify(this.results, null, 2));
    
    if (this.results.overall === '✅ ALL_SYSTEMS_OPERATIONAL') {
      console.log('\n🚀 Meta-AI system ready for enhanced wisdom engine development!');
    } else {
      console.log('\n🔧 Address issues above before proceeding with enhancements.');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new SystemHealthChecker();
  checker.runFullDiagnostics().catch(error => {
    console.error('Health check crashed:', error);
    process.exit(1);
  });
}

module.exports = SystemHealthChecker;