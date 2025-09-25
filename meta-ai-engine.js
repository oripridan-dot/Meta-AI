// meta-ai-engine.js - Production Meta-AI Engine with Multi-Provider Support
require('dotenv').config();

const MetaAI = require('./src/core/meta-ai');
const CodeExecutor = require('./src/core/code-executor');
const MultiProviderClient = require('./src/api/multi-provider-client');

class MetaAIEngine {
  constructor(opts = {}) {
    this.client = new MultiProviderClient(opts);
    this.executor = new CodeExecutor(opts);
    this.metaAI = new MetaAI({
      client: this.client,
      executor: this.executor,
      verbose: opts.verbose ?? process.env.VERBOSE === 'true'
    });
  }

  async run(task, input = 10) {
    const taskConfig = typeof task === 'string' 
      ? { name: task, testInput: input, prompt: `Solve ${task} correctly and efficiently.` }
      : task;
    
    return await this.metaAI.runTask(taskConfig);
  }

  async runMultipleEvolutions(task, prompt, input, cycles = 5, opts = {}) {
    const taskConfig = {
      name: task,
      prompt: prompt,
      testInput: input,
      cycles: cycles,
      ...opts
    };
    
    const results = await this.metaAI.runMultipleEvolutions(taskConfig);
    
    return {
      results,
      summary: {
        totalEvolutions: results.length,
        successful: results.filter(r => r.success).length,
        bestResult: results.find(r => r.success) || results[0],
        avgExecutionTime: results.reduce((sum, r) => sum + (r.executionTime || 0), 0) / results.length
      }
    };
  }

  testSystemHealth() {
    const providerStatus = this.client.getProviderStatus();
    const activeProviders = Object.keys(providerStatus).filter(p => providerStatus[p].active);
    
    return {
      status: this.metaAI.currentTask ? 'active' : 'ready',
      providers: providerStatus,
      activeProviders,
      totalProviders: Object.keys(providerStatus).length
    };
  }

  getProviderStatus() {
    return this.client.getProviderStatus();
  }

  resetProviderHealth() {
    return this.client.resetProviderHealth();
  }
}

module.exports = MetaAIEngine;
