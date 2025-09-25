// src/core/meta-ai-enhanced.js
// Enhanced MetaAI with cross-model wisdom integration

const { EventEmitter } = require('events');
const EnhancedWisdomEngine = require('./enhanced-wisdom-engine');

class MetaAIEnhanced extends EventEmitter {
  constructor({ client, executor, db, verbose = false } = {}) {
    super();
    this.client = client;
    this.executor = executor;
    this.verbose = !!verbose;
    this.currentTask = null;
    
    // Initialize Enhanced Wisdom Engine
    this.wisdomEngine = new EnhancedWisdomEngine(db, {
      verbose: this.verbose,
      similarityThreshold: 0.75,
      crossModelLearning: true
    });
    
    // Track model provider for cross-model learning
    this.modelProvider = this.detectModelProvider();
    
    // Enhanced performance tracking
    this.sessionStats = {
      tasksCompleted: 0,
      successRate: 0,
      avgImprovement: 0,
      wisdomPatternsUsed: 0,
      crossModelInsights: 0
    };
  }

  detectModelProvider() {
    const clientName = this.client?.constructor?.name || '';
    if (clientName.includes('DeepSeek')) return 'deepseek';
    if (clientName.includes('OpenAI')) return 'openai';
    return process.env.MODEL_PROVIDER || 'unknown';
  }

  // =============== ENHANCED PROMPT EVOLUTION ===============

  async evolvePrompt(basePrompt, task) {
    const start = Date.now();
    
    // Get wisdom-enhanced prompt
    const wisdomPrompt = await this.wisdomEngine.enhancePrompt(basePrompt, task, this.modelProvider);
    
    // Get model recommendation if multiple providers available
    const modelSuggestion = await this.wisdomEngine.suggestBestModel(task);
    if (modelSuggestion.recommended !== this.modelProvider && this.verbose) {
      console.log(`💡 Wisdom suggests ${modelSuggestion.recommended} for this task type (${modelSuggestion.reason})`);
    }
    
    const header =
      'Language: JavaScript (Node.js). ' +
      'Return only plain code (no markdown), exporting exactly: ' +
      'module.exports = function(input){ /* implementation */ }. ' +
      'No comments, no explanations.';
      
    const focus = task?.focus ||
      'Consider algorithmic complexity, avoid O(2^n) recursion; prefer iterative or memoized approaches. ' +
      'Handle edge cases, use clear naming, and return only the function body as required.';
    
    const evolvedPrompt = `${wisdomPrompt?.trim() || basePrompt?.trim() || ''} ${header} ${focus}`.trim();
    
    if (this.verbose) {
      const evolutionTime = Date.now() - start;
      console.log(`🧠 Prompt evolved with wisdom patterns (${evolutionTime}ms)`);
    }
    
    return evolvedPrompt;
  }

  // =============== ENHANCED TASK EXECUTION ===============

  async runTask(task) {
    if (!this.client) throw new Error('MetaAI: client not provided');
    if (!this.executor) throw new Error('MetaAI: executor not provided');

    this.currentTask = task;
    const taskStart = Date.now();
    
    // Pre-execution wisdom retrieval
    const wisdomPatterns = await this.wisdomEngine.retrieveBestPatterns(task, this.modelProvider, 3);
    if (this.verbose && wisdomPatterns.length > 0) {
      console.log(`🎯 Retrieved ${wisdomPatterns.length} wisdom patterns for guidance`);
      wisdomPatterns.forEach(pattern => {
        console.log(`   • ${pattern.recommendationReason}`);
      });
    }

    // Step 1: Enhanced prompt evolution
    let evolvedPrompt;
    try {
      evolvedPrompt = await this.evolvePrompt(task?.prompt || task?.name, task);
      if (this.verbose) {
        console.log('\n🧩 ENHANCED PROMPT EVOLUTION:');
        console.log(evolvedPrompt);
      }
    } catch (e) {
      return this._fail(`Prompt evolution failed: ${e.message}`, task?.testInput, task?.name);
    }

    // Step 2: Code generation with retry logic
    let gen;
    try {
      gen = await this.client.generateCode(evolvedPrompt, task);
      if (this.verbose) {
        console.log('\n📦 CODE GENERATION:');
        console.log(`Request time: ${gen.requestTime}ms`);
        console.log(`Tokens used: ${gen.tokensUsed}`);
        console.log(`Code[0..200]:\n${String(gen.code || '').slice(0, 200)}…`);
      }
    } catch (e) {
      // Enhanced error handling with wisdom-based retry
      if (this.shouldRetryWithWisdom(e, wisdomPatterns)) {
        console.log('🔄 Retrying with wisdom-enhanced approach...');
        return await this.retryWithWisdom(task, e);
      }
      return this._fail(`Code generation failed: ${e.message}`, task?.testInput, task?.name);
    }

    // Step 3: Execution with performance analysis
    let execResult;
    try {
      execResult = await this.executor.executeCode(gen.code, task?.name, task?.testInput);
      
      // Enhanced metrics calculation
      const performanceScore = this.calculateEnhancedPerformanceScore(execResult, wisdomPatterns);
      const qualityScore = this.calculateCodeQuality(gen.code, execResult);
      
      const result = {
        success: execResult.success,
        result: execResult.result,
        requestTime: gen.requestTime,
        tokensUsed: gen.tokensUsed,
        executionTime: execResult.executionTime,
        memoryUsed: execResult.memoryUsed,
        overallScore: performanceScore,
        qualityScore: qualityScore,
        algorithm: this.detectAlgorithm(gen.code),
        quality: this.categorizeQuality(qualityScore),
        wisdomPatternsUsed: wisdomPatterns.length,
        modelProvider: this.modelProvider,
        generatedCode: gen.code,
        timestamp: new Date(),
      };

      // Step 4: Learn from results
      await this.learnFromExecution(task, result, wisdomPatterns);
      
      // Update session stats
      this.updateSessionStats(result, wisdomPatterns.length);
      
      return result;
      
    } catch (e) {
      const failure = this._fail(`Execution failed: ${e.message}`, task?.testInput, task?.name);
      // Learn from failures too
      await this.learnFromExecution(task, failure, wisdomPatterns);
      return failure;
    }
  }

  // =============== WISDOM-BASED RETRY LOGIC ===============

  shouldRetryWithWisdom(error, patterns) {
    const errorMsg = error.message.toLowerCase();
    
    // Retry if we have wisdom patterns and it's a recoverable error
    return patterns.length > 0 && (
      errorMsg.includes('timeout') ||
      errorMsg.includes('non-js') ||
      errorMsg.includes('syntax') ||
      errorMsg.includes('unauthorized') && patterns.some(p => p.model_provider !== this.modelProvider)
    );
  }

  async retryWithWisdom(task, originalError) {
    try {
      // Use the best cross-model pattern if available
      const patterns = await this.wisdomEngine.retrieveBestPatterns(task, this.modelProvider, 5);
      const crossModelPattern = patterns.find(p => p.cross_model_validated);
      
      if (crossModelPattern) {
        // Apply cross-model insights to prompt
        const enhancedPrompt = await this.wisdomEngine.enhancePrompt(task.prompt, task, this.modelProvider);
        const wisdomGuidedPrompt = `${enhancedPrompt}\n\nAdditional guidance: Use patterns proven across multiple AI models. ${crossModelPattern.recommendationReason}`;
        
        const retryGen = await this.client.generateCode(wisdomGuidedPrompt, task);
        const retryExec = await this.executor.executeCode(retryGen.code, task?.name, task?.testInput);
        
        if (retryExec.success) {
          console.log('✅ Wisdom-based retry succeeded');
          return {
            success: true,
            result: retryExec.result,
            executionTime: retryExec.executionTime,
            memoryUsed: retryExec.memoryUsed,
            wisdomRetry: true,
            originalError: originalError.message,
            modelProvider: this.modelProvider,
            generatedCode: retryGen.code
          };
        }
      }
    } catch (retryError) {
      // If wisdom retry fails, return original error
    }
    
    return this._fail(`Generation failed despite wisdom retry: ${originalError.message}`, task?.testInput, task?.name);
  }

  // =============== ENHANCED ANALYTICS ===============

  calculateEnhancedPerformanceScore(execResult, wisdomPatterns) {
    if (!execResult.success) return 0;
    
    const baseScore = Math.max(0, execResult.memoryUsed || 0);
    const timeBonus = execResult.executionTime < 10 ? 0.2 : 0;
    const wisdomBonus = wisdomPatterns.length > 0 ? 0.1 : 0;
    
    return baseScore + timeBonus + wisdomBonus;
  }

  calculateCodeQuality(code, execResult) {
    if (!code || !execResult.success) return 0;
    
    let score = 0.5; // base score
    
    // Efficiency indicators
    if (!/O\(2\^n\)|exponential/.test(code)) score += 0.2;
    if (/O\(1\)|constant/.test(code)) score += 0.1;
    if (execResult.executionTime < 5) score += 0.1;
    
    // Code quality indicators
    if (code.includes('edge') || /if.*<=|if.*>=|if.*null/.test(code)) score += 0.1;
    if (!/recursion/.test(code) && code.includes('for')) score += 0.1; // iterative over recursive
    
    return Math.min(1, score);
  }

  detectAlgorithm(code) {
    if (!code) return 'Unknown';
    
    if (code.includes('for') && code.includes('for')) return 'Nested Loops';
    if (code.includes('sort')) return 'Sorting';
    if (code.includes('binary') || code.includes('Math.floor')) return 'Binary Search';
    if (code.includes('memo') || code.includes('cache')) return 'Memoization';
    if (code.includes('return') && code.match(/function.*\(.*\).*{.*return.*}/s)) return 'Recursion';
    if (code.includes('for') || code.includes('while')) return 'Iteration';
    
    return 'Linear';
  }

  categorizeQuality(qualityScore) {
    if (qualityScore >= 0.9) return 'Excellent';
    if (qualityScore >= 0.7) return 'Good';
    if (qualityScore >= 0.5) return 'Acceptable';
    return 'Poor';
  }

  // =============== LEARNING INTEGRATION ===============

  async learnFromExecution(task, result, wisdomPatterns) {
    try {
      // Enhanced learning with execution context
      await this.wisdomEngine.learnFromSuccess(task, result, this.modelProvider);
      
      if (this.verbose && result.success) {
        console.log(`🎓 Learning recorded: ${result.qualityScore ? (result.qualityScore * 100).toFixed(1) + '% quality' : 'execution data'}`);
      }
      
      // Emit learning event for external monitoring
      this.emit('wisdom_learned', {
        task: task,
        result: result,
        patternsUsed: wisdomPatterns.length,
        modelProvider: this.modelProvider
      });
      
    } catch (error) {
      console.error('❌ Failed to learn from execution:', error.message);
    }
  }

  updateSessionStats(result, patternsUsed) {
    this.sessionStats.tasksCompleted++;
    this.sessionStats.wisdomPatternsUsed += patternsUsed;
    
    if (result.success) {
      const currentSuccesses = this.sessionStats.successRate * (this.sessionStats.tasksCompleted - 1);
      this.sessionStats.successRate = (currentSuccesses + 1) / this.sessionStats.tasksCompleted;
    } else {
      this.sessionStats.successRate = (this.sessionStats.successRate * (this.sessionStats.tasksCompleted - 1)) / this.sessionStats.tasksCompleted;
    }
  }

  // =============== ENHANCED MULTIPLE EVOLUTIONS ===============

  async runMultipleEvolutions(taskOrName, opts = {}) {
    const task = typeof taskOrName === 'string'
      ? { name: taskOrName, ...opts }
      : { ...(taskOrName || {}), ...opts };

    const cycles = Number(task.cycles ?? opts.cycles ?? 5);
    const results = [];
    
    if (this.verbose) {
      const wisdomStats = await this.wisdomEngine.getWisdomStats();
      if (wisdomStats) {
        console.log(`🧠 Wisdom Engine: ${wisdomStats.total_patterns} patterns, ${(wisdomStats.avg_success_rate * 100).toFixed(1)}% success rate, ${(wisdomStats.wisdom_maturity * 100).toFixed(1)}% maturity`);
      }
    }
    
    for (let i = 1; i <= cycles; i++) {
      if (this.verbose) console.log(`\n🚀 Starting Enhanced Evolution Cycle ${i}/${cycles}`);
      
      const res = await this.runTask(task);
      results.push(res);
      
      // Enhanced stopping criteria
      if (res?.success && res?.qualityScore > 0.8) {
        if (this.verbose) console.log('🎯 High-quality solution achieved, stopping early');
        break;
      }
      
      // Wisdom-based continuation decision
      if (i < cycles && res?.success && this.shouldContinueEvolution(results)) {
        if (this.verbose) console.log('🔄 Wisdom suggests continuing evolution for better optimization');
      }
    }
    
    return results;
  }

  shouldContinueEvolution(results) {
    const latest = results[results.length - 1];
    if (!latest.success || results.length < 2) return true;
    
    const previous = results[results.length - 2];
    const improvement = (latest.qualityScore || 0) - (previous.qualityScore || 0);
    
    // Continue if we're still improving significantly
    return improvement > 0.05;
  }

  // =============== SESSION MANAGEMENT ===============

  async getEnhancedStats() {
    const wisdomStats = await this.wisdomEngine.getWisdomStats();
    const modelComparison = await this.wisdomEngine.getModelComparison();
    
    return {
      session: this.sessionStats,
      wisdom: wisdomStats,
      models: modelComparison,
      currentProvider: this.modelProvider
    };
  }

  reset() {
    this.currentTask = null;
    this.sessionStats = {
      tasksCompleted: 0,
      successRate: 0,
      avgImprovement: 0,
      wisdomPatternsUsed: 0,
      crossModelInsights: 0
    };
  }

  // =============== INTERNALS ===============

  _fail(message, testInput, functionName) {
    console.error('❌', message);
    return {
      success: false,
      error: message,
      executionTime: Infinity,
      memoryUsed: Infinity,
      testInput,
      functionName,
      modelProvider: this.modelProvider,
      qualityScore: 0,
    };
  }
}

module.exports = MetaAIEnhanced;