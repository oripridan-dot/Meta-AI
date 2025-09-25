// src/test-suite/test-integration.js
const ExtendedTestFramework = require('./extended-test-framework');
const MetaAI = require('../meta-ai-engine');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class MetaAITestIntegration {
  constructor(config = {}) {
    this.framework = new ExtendedTestFramework();
    this.metaAI = new MetaAI(config);
    this.dbPath = config.dbPath || './meta-ai-tests.sqlite';
    this.db = null;
    
    this.testingConfig = {
      maxGenerationsPerTest: config.maxGenerations || 3,
      parallelTests: config.parallelTests || 1,
      improvementThreshold: config.improvementThreshold || 10, // minimum % improvement to consider significant
      testTimeout: config.testTimeout || 60000, // 60 seconds per test
      categoryPriority: config.categoryPriority || ['webApis', 'frontendComponents', 'algorithms']
    };
    
    this.sessionMetrics = {
      startTime: null,
      totalTests: 0,
      improvements: [],
      failures: [],
      patterns: [],
      avgImprovementRate: 0
    };
  }

  async initialize() {
    await this.initializeDatabase();
    await this.metaAI.initialize();
    this.sessionMetrics.startTime = Date.now();
    
    console.log('🔧 Meta-AI Extended Test Suite Initialized');
    console.log(`📊 Database: ${this.dbPath}`);
    console.log(`⚙️  Max generations per test: ${this.testingConfig.maxGenerationsPerTest}`);
    console.log(`🎯 Improvement threshold: ${this.testingConfig.improvementThreshold}%`);
  }

  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else {
          this.db.run(`
            CREATE TABLE IF NOT EXISTS extended_test_results (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              test_id TEXT NOT NULL,
              category TEXT NOT NULL,
              difficulty TEXT NOT NULL,
              task TEXT NOT NULL,
              generation INTEGER NOT NULL,
              code TEXT NOT NULL,
              execution_time REAL,
              memory_usage REAL,
              correctness_score REAL,
              performance_score REAL,
              quality_score REAL,
              overall_score REAL,
              improvement_percentage REAL,
              learning_pattern TEXT,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, resolve);
        }
      });
    });
  }

  // Main execution method - runs the extended test suite
  async runExtendedTestSuite(options = {}) {
    const testSpecs = this.framework.generateTestSpecs();
    const prioritizedSpecs = this.prioritizeTests(testSpecs, options);
    
    console.log(`\n🚀 Starting Extended Test Suite`);
    console.log(`📋 Total tests: ${prioritizedSpecs.length}`);
    console.log(`🔄 Categories: ${[...new Set(prioritizedSpecs.map(s => s.category))].join(', ')}`);
    
    const results = {
      startTime: Date.now(),
      specs: prioritizedSpecs,
      completed: [],
      failed: [],
      improvements: [],
      patterns: [],
      categoryStats: {}
    };
    
    // Progressive testing with learning application
    for (let i = 0; i < prioritizedSpecs.length; i++) {
      const spec = prioritizedSpecs[i];
      const progress = `${i + 1}/${prioritizedSpecs.length}`;
      
      console.log(`\n[${progress}] 🧪 Testing: ${spec.id}`);
      console.log(`📝 Task: ${spec.task} (${spec.difficulty})`);
      
      try {
        const testResult = await this.runEvolutionaryTest(spec);
        
        // Store results
        await this.storeTestResult(testResult);
        results.completed.push(testResult);
        
        // Track improvements
        if (testResult.significantImprovement) {
          results.improvements.push({
            testId: spec.id,
            improvement: testResult.bestImprovement,
            pattern: testResult.learningPattern
          });
          
          console.log(`✨ Significant improvement: +${testResult.bestImprovement.toFixed(1)}%`);
        }
        
        // Apply learnings to next tests
        if (results.improvements.length > 0 && (i + 1) % 5 === 0) {
          await this.applyLearningsToMetaAI(results.improvements.slice(-5));
        }
        
        // Update category stats
        this.updateCategoryStats(results.categoryStats, spec.category, testResult);
        
        console.log(`✅ Completed: Score ${testResult.bestScore}/100 in ${testResult.totalTime}ms`);
        
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        results.failed.push({
          testId: spec.id,
          error: error.message,
          category: spec.category
        });
      }
      
      // Progress checkpoint
      if ((i + 1) % 10 === 0) {
        await this.generateProgressReport(results, i + 1);
      }
    }
    
    return this.generateFinalReport(results);
  }

  prioritizeTests(specs, options) {
    // Priority 1: Real-world applicability
    // Priority 2: Category importance 
    // Priority 3: Difficulty progression
    
    const categoryPriority = options.categoryPriority || this.testingConfig.categoryPriority;
    const priorityMap = {};
    categoryPriority.forEach((cat, idx) => {
      priorityMap[cat] = categoryPriority.length - idx;
    });
    
    return specs.sort((a, b) => {
      // Primary: Real-world weight
      const realWorldDiff = b.realWorldWeight - a.realWorldWeight;
      if (Math.abs(realWorldDiff) > 0.2) return realWorldDiff;
      
      // Secondary: Category priority
      const categoryDiff = (priorityMap[b.category] || 0) - (priorityMap[a.category] || 0);
      if (categoryDiff !== 0) return categoryDiff;
      
      // Tertiary: Start with intermediate difficulty (good learning baseline)
      const difficultyOrder = { intermediate: 2, basic: 1, advanced: 0 };
      return (difficultyOrder[b.difficulty] || 0) - (difficultyOrder[a.difficulty] || 0);
    });
  }

  async runEvolutionaryTest(spec) {
    const results = {
      testId: spec.id,
      category: spec.category,
      difficulty: spec.difficulty,
      task: spec.task,
      generations: [],
      bestScore: 0,
      bestGeneration: 0,
      bestImprovement: 0,
      significantImprovement: false,
      learningPattern: null,
      totalTime: 0
    };
    
    const startTime = Date.now();
    
    // Run evolutionary generations
    for (let gen = 1; gen <= this.testingConfig.maxGenerationsPerTest; gen++) {
      console.log(`  🔄 Generation ${gen}/${this.testingConfig.maxGenerationsPerTest}`);
      
      try {
        const genResult = await this.metaAI.generateAndEvaluate(
          spec.task,
          spec.prompt,
          spec.evaluation,
          { generation: gen, learnings: this.getRelevantLearnings(spec) }
        );
        
        results.generations.push(genResult);
        
        // Track best result
        if (genResult.overallScore > results.bestScore) {
          const improvement = results.bestScore > 0 ? 
            ((genResult.overallScore - results.bestScore) / results.bestScore) * 100 : 0;
          
          results.bestScore = genResult.overallScore;
          results.bestGeneration = gen;
          results.bestImprovement = improvement;
          
          if (improvement >= this.testingConfig.improvementThreshold) {
            results.significantImprovement = true;
            results.learningPattern = this.extractLearningPattern(genResult);
          }
          
          console.log(`    ⬆️  New best: ${genResult.overallScore}/100 ${improvement > 0 ? `(+${improvement.toFixed(1)}%)` : ''}`);
        }
        
        // Early exit if excellent score achieved
        if (genResult.overallScore >= 95) {
          console.log(`    🎯 Excellent score achieved - early exit`);
          break;
        }
        
      } catch (error) {
        console.log(`    ⚠️  Generation ${gen} failed: ${error.message}`);
      }
    }
    
    results.totalTime = Date.now() - startTime;
    return results;
  }

  async storeTestResult(result) {
    const bestGen = result.generations[result.bestGeneration - 1];
    if (!bestGen) return;
    
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO extended_test_results (
          test_id, category, difficulty, task, generation,
          code, execution_time, memory_usage, correctness_score,
          performance_score, quality_score, overall_score,
          improvement_percentage, learning_pattern
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        result.testId,
        result.category,
        result.difficulty,
        result.task,
        result.bestGeneration,
        bestGen.code,
        bestGen.executionTime || 0,
        bestGen.memoryUsage || 0,
        bestGen.correctnessScore || 0,
        bestGen.performanceScore || 0,
        bestGen.qualityScore || 0,
        bestGen.overallScore || 0,
        result.bestImprovement,
        result.learningPattern
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getRelevantLearnings(spec) {
    // Return relevant patterns and learnings for this type of test
    return this.metaAI.getLearningPatterns().filter(pattern => 
      pattern.category === spec.category || 
      pattern.task === spec.task ||
      pattern.difficulty === spec.difficulty
    );
  }

  extractLearningPattern(result) {
    // Analyze the successful result to extract reusable patterns
    const patterns = [];
    
    if (result.code) {
      // Code structure patterns
      if (result.code.includes('async/await')) patterns.push('async-pattern');
      if (result.code.includes('try-catch')) patterns.push('error-handling');
      if (result.code.includes('Map') || result.code.includes('Set')) patterns.push('modern-data-structures');
      
      // Performance patterns
      if (result.performanceScore > 80) patterns.push('performance-optimized');
      if (result.code.includes('O(n)') || result.code.includes('O(log n)')) patterns.push('complexity-aware');
    }
    
    return patterns.join(',');
  }

  async applyLearningsToMetaAI(improvements) {
    const patterns = improvements.map(imp => imp.pattern).filter(Boolean);
    if (patterns.length > 0) {
      await this.metaAI.updateLearningPatterns(patterns);
      console.log(`🧠 Applied ${patterns.length} learning patterns to Meta-AI`);
    }
  }

  updateCategoryStats(stats, category, result) {
    if (!stats[category]) {
      stats[category] = {
        total: 0,
        completed: 0,
        avgScore: 0,
        improvements: 0,
        totalScore: 0
      };
    }
    
    stats[category].total++;
    stats[category].completed++;
    stats[category].totalScore += result.bestScore;
    stats[category].avgScore = stats[category].totalScore / stats[category].completed;
    
    if (result.significantImprovement) {
      stats[category].improvements++;
    }
  }

  async generateProgressReport(results, currentIndex) {
    const completionRate = (currentIndex / results.specs.length * 100).toFixed(1);
    const improvementRate = (results.improvements.length / results.completed.length * 100);
    
    const report = {
      executionSummary: {
        totalTime: totalTime,
        totalTests: results.specs.length,
        completed: results.completed.length,
        failed: results.failed.length,
        completionRate: completionRate.toFixed(1) + '%',
        improvementRate: improvementRate.toFixed(1) + '%',
        avgTestTime: results.completed.length > 0 ? 
          (results.completed.reduce((sum, r) => sum + r.totalTime, 0) / results.completed.length).toFixed(0) + 'ms' : '0ms'
      },
      
      categoryAnalysis: this.analyzeCategoryPerformance(results.categoryStats),
      
      significantImprovements: results.improvements
        .sort((a, b) => b.improvement - a.improvement)
        .slice(0, 10),
      
      emergentPatterns: this.analyzeEmergentPatterns(results.completed),
      
      failureAnalysis: this.analyzeFailures(results.failed),
      
      recommendations: this.generateActionableRecommendations(results),
      
      nextSteps: this.generateNextSteps(results)
    };
    
    // Store session summary
    await this.storeSessionSummary(report);
    
    // Print comprehensive report
    this.printFinalReport(report);
    
    return report;
  }

  analyzeCategoryPerformance(categoryStats) {
    const analysis = {};
    
    for (const [category, stats] of Object.entries(categoryStats)) {
      analysis[category] = {
        averageScore: stats.avgScore.toFixed(1),
        improvementRate: ((stats.improvements / stats.completed) * 100).toFixed(1) + '%',
        totalTests: stats.completed,
        readinessLevel: this.calculateReadinessLevel(stats.avgScore, stats.improvements / stats.completed),
        strongPoints: this.identifyStrongPoints(category, stats),
        improvementAreas: this.identifyImprovementAreas(category, stats)
      };
    }
    
    return analysis;
  }

  calculateReadinessLevel(avgScore, improvementRate) {
    if (avgScore >= 85 && improvementRate >= 0.6) return 'Production Ready';
    if (avgScore >= 70 && improvementRate >= 0.4) return 'MVP Ready';
    if (avgScore >= 50 && improvementRate >= 0.3) return 'Development Ready';
    return 'Research Phase';
  }

  identifyStrongPoints(category, stats) {
    const points = [];
    
    if (stats.avgScore >= 80) points.push('High code quality');
    if ((stats.improvements / stats.completed) >= 0.5) points.push('Strong learning capability');
    if (stats.completed >= 10) points.push('Comprehensive testing coverage');
    
    // Category-specific strengths
    const categoryStrengths = {
      algorithms: stats.avgScore >= 75 ? ['Algorithmic thinking'] : [],
      webApis: stats.avgScore >= 70 ? ['RESTful design'] : [],
      frontendComponents: stats.avgScore >= 70 ? ['UI/UX awareness'] : [],
      databaseOps: stats.avgScore >= 75 ? ['Data modeling'] : []
    };
    
    return points.concat(categoryStrengths[category] || []);
  }

  identifyImprovementAreas(category, stats) {
    const areas = [];
    
    if (stats.avgScore < 60) areas.push('Basic functionality');
    if ((stats.improvements / stats.completed) < 0.3) areas.push('Learning efficiency');
    if (stats.completed < 5) areas.push('Test coverage');
    
    // Category-specific weaknesses
    const categoryWeaknesses = {
      algorithms: stats.avgScore < 65 ? ['Time complexity optimization'] : [],
      webApis: stats.avgScore < 60 ? ['Error handling', 'Security practices'] : [],
      frontendComponents: stats.avgScore < 60 ? ['Accessibility', 'Responsive design'] : [],
      databaseOps: stats.avgScore < 65 ? ['Transaction management', 'Query optimization'] : []
    };
    
    return areas.concat(categoryWeaknesses[category] || []);
  }

  analyzeEmergentPatterns(completedTests) {
    const patterns = {};
    const techniques = {};
    
    completedTests.forEach(test => {
      if (test.learningPattern) {
        const testPatterns = test.learningPattern.split(',');
        testPatterns.forEach(pattern => {
          patterns[pattern] = (patterns[pattern] || 0) + 1;
        });
      }
      
      // Extract successful techniques
      if (test.significantImprovement && test.generations.length > 1) {
        const technique = this.identifySuccessfulTechnique(test);
        if (technique) {
          techniques[technique] = (techniques[technique] || 0) + 1;
        }
      }
    });
    
    return {
      mostCommonPatterns: Object.entries(patterns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([pattern, count]) => ({ pattern, frequency: count, confidence: count / completedTests.length })),
      
      successfulTechniques: Object.entries(techniques)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([technique, count]) => ({ technique, applications: count }))
    };
  }

  identifySuccessfulTechnique(test) {
    const bestGen = test.generations[test.bestGeneration - 1];
    const firstGen = test.generations[0];
    
    if (!bestGen || !firstGen) return null;
    
    // Compare patterns between first and best generation
    if (bestGen.code.includes('memoization') && !firstGen.code.includes('memoization')) {
      return 'memoization-optimization';
    }
    if (bestGen.code.includes('binary search') && !firstGen.code.includes('binary search')) {
      return 'search-optimization';
    }
    if (bestGen.executionTime < firstGen.executionTime * 0.5) {
      return 'performance-breakthrough';
    }
    
    return 'iterative-refinement';
  }

  analyzeFailures(failedTests) {
    const failuresByCategory = {};
    const commonErrors = {};
    
    failedTests.forEach(failure => {
      // Category failures
      failuresByCategory[failure.category] = (failuresByCategory[failure.category] || 0) + 1;
      
      // Error pattern analysis
      const errorType = this.categorizeError(failure.error);
      commonErrors[errorType] = (commonErrors[errorType] || 0) + 1;
    });
    
    return {
      failuresByCategory,
      commonErrorTypes: Object.entries(commonErrors)
        .sort(([,a], [,b]) => b - a)
        .map(([error, count]) => ({ error, occurrences: count })),
      riskCategories: Object.entries(failuresByCategory)
        .filter(([,count]) => count >= 2)
        .map(([category]) => category)
    };
  }

  categorizeError(errorMessage) {
    if (errorMessage.includes('timeout')) return 'execution-timeout';
    if (errorMessage.includes('syntax')) return 'syntax-error';
    if (errorMessage.includes('API')) return 'api-error';
    if (errorMessage.includes('memory')) return 'memory-error';
    return 'unknown-error';
  }

  generateActionableRecommendations(results) {
    const recommendations = [];
    
    // Performance-based recommendations
    const improvementRate = results.improvements.length / results.completed.length;
    if (improvementRate >= 0.7) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Scale to Production Testing',
        rationale: `${(improvementRate * 100).toFixed(1)}% improvement rate indicates strong learning capability`,
        nextSteps: ['Apply Meta-AI to real project components', 'Implement continuous learning pipeline']
      });
    } else if (improvementRate >= 0.4) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Enhance Learning Algorithms',
        rationale: 'Moderate improvement rate suggests optimization potential',
        nextSteps: ['Refine prompt evolution strategies', 'Expand learning pattern database']
      });
    }
    
    // Category-specific recommendations
    for (const [category, stats] of Object.entries(results.categoryStats)) {
      if (stats.avgScore >= 80) {
        recommendations.push({
          priority: 'LOW',
          action: `Leverage ${category} Success`,
          rationale: `Strong performance in ${category} (${stats.avgScore.toFixed(1)}/100)`,
          nextSteps: [`Apply ${category} patterns to weaker categories`, 'Document successful approaches']
        });
      } else if (stats.avgScore < 50) {
        recommendations.push({
          priority: 'HIGH',
          action: `Strengthen ${category} Capabilities`,
          rationale: `Low performance in ${category} (${stats.avgScore.toFixed(1)}/100)`,
          nextSteps: ['Analyze failure patterns', 'Enhance category-specific prompts']
        });
      }
    }
    
    // Failure-based recommendations
    if (results.failed.length / results.specs.length > 0.2) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Improve Error Handling',
        rationale: `${((results.failed.length / results.specs.length) * 100).toFixed(1)}% failure rate needs attention`,
        nextSteps: ['Implement better error recovery', 'Add timeout handling', 'Enhance input validation']
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  generateNextSteps(results) {
    const steps = [];
    const completionRate = results.completed.length / results.specs.length;
    const improvementRate = results.improvements.length / results.completed.length;
    
    // Immediate next steps (1-2 weeks)
    if (improvementRate >= 0.6) {
      steps.push({
        timeframe: 'Immediate (1-2 weeks)',
        step: 'Real-World Application Testing',
        description: 'Apply Meta-AI to generate components for Nativ English learning app',
        success_criteria: 'Successfully generate 3+ production-ready components'
      });
    } else {
      steps.push({
        timeframe: 'Immediate (1-2 weeks)',
        step: 'Learning Algorithm Enhancement',
        description: 'Optimize prompt evolution and pattern recognition',
        success_criteria: 'Achieve >60% improvement rate in follow-up testing'
      });
    }
    
    // Short-term steps (3-4 weeks)
    steps.push({
      timeframe: 'Short-term (3-4 weeks)',
      step: 'Multi-Model Integration',
      description: 'Add Claude Sonnet 4 and GPT-4 for comparative analysis',
      success_criteria: 'Identify best model per task category'
    });
    
    // Medium-term steps (1-2 months)
    steps.push({
      timeframe: 'Medium-term (1-2 months)',
      step: 'Autonomous Project Generation',
      description: 'Build complete application modules autonomously',
      success_criteria: 'Generate end-to-end features without human coding'
    });
    
    return steps;
  }

  async storeSessionSummary(report) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS test_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          total_tests INTEGER,
          completed_tests INTEGER,
          improvement_rate REAL,
          avg_score REAL,
          session_summary TEXT
        )
      `, () => {
        this.db.run(`
          INSERT INTO test_sessions (
            total_tests, completed_tests, improvement_rate, avg_score, session_summary
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          report.executionSummary.totalTests,
          report.executionSummary.completed,
          parseFloat(report.executionSummary.improvementRate),
          this.calculateOverallAvgScore(report.categoryAnalysis),
          JSON.stringify(report)
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  calculateOverallAvgScore(categoryAnalysis) {
    const scores = Object.values(categoryAnalysis).map(cat => parseFloat(cat.averageScore));
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  printFinalReport(report) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 EXTENDED TEST SUITE - FINAL REPORT');
    console.log('='.repeat(80));
    
    // Executive Summary
    console.log('\n🎯 EXECUTIVE SUMMARY');
    console.log(`   Duration: ${(report.executionSummary.totalTime / 1000 / 60).toFixed(1)} minutes`);
    console.log(`   Completion Rate: ${report.executionSummary.completionRate}`);
    console.log(`   Improvement Rate: ${report.executionSummary.improvementRate}`);
    console.log(`   Average Test Time: ${report.executionSummary.avgTestTime}`);
    
    // Category Performance
    console.log('\n📋 CATEGORY PERFORMANCE');
    for (const [category, analysis] of Object.entries(report.categoryAnalysis)) {
      console.log(`   ${category}:`);
      console.log(`     Score: ${analysis.averageScore}/100`);
      console.log(`     Readiness: ${analysis.readinessLevel}`);
      console.log(`     Improvements: ${analysis.improvementRate}`);
      if (analysis.strongPoints.length > 0) {
        console.log(`     Strengths: ${analysis.strongPoints.join(', ')}`);
      }
    }
    
    // Top Improvements
    if (report.significantImprovements.length > 0) {
      console.log('\n🚀 TOP IMPROVEMENTS');
      report.significantImprovements.slice(0, 5).forEach((imp, idx) => {
        console.log(`   ${idx + 1}. ${imp.testId}: +${imp.improvement.toFixed(1)}%`);
      });
    }
    
    // Emergent Patterns
    if (report.emergentPatterns.mostCommonPatterns.length > 0) {
      console.log('\n🧠 EMERGENT PATTERNS');
      report.emergentPatterns.mostCommonPatterns.forEach(pattern => {
        console.log(`   ${pattern.pattern}: ${(pattern.confidence * 100).toFixed(1)}% confidence`);
      });
    }
    
    // Key Recommendations
    console.log('\n💡 KEY RECOMMENDATIONS');
    report.recommendations.slice(0, 3).forEach((rec, idx) => {
      console.log(`   ${idx + 1}. [${rec.priority}] ${rec.action}`);
      console.log(`      ${rec.rationale}`);
    });
    
    // Next Steps
    console.log('\n📋 NEXT STEPS');
    report.nextSteps.forEach((step, idx) => {
      console.log(`   ${idx + 1}. ${step.step} (${step.timeframe})`);
      console.log(`      ${step.description}`);
    });
    
    console.log('\n' + '='.repeat(80));
  }

  // Utility method to run specific test categories
  async runCategoryTests(categories, options = {}) {
    const allSpecs = this.framework.generateTestSpecs();
    const filteredSpecs = allSpecs.filter(spec => categories.includes(spec.category));
    
    console.log(`🎯 Running tests for categories: ${categories.join(', ')}`);
    console.log(`📊 Test count: ${filteredSpecs.length}`);
    
    const results = Object.assign(options, { specs: filteredSpecs });
    return this.runExtendedTestSuite(results);
  }

  // Utility method for quick validation runs
  async runQuickValidation(maxTests = 10) {
    const specs = this.framework.generateTestSpecs().slice(0, maxTests);
    
    console.log(`⚡ Quick Validation: ${specs.length} tests`);
    
    const results = { specs };
    return this.runExtendedTestSuite(results);
  }

  async cleanup() {
    if (this.db) {
      this.db.close();
    }
    await this.metaAI.cleanup();
  }
}

module.exports = MetaAITestIntegration;improvements.length / results.completed.length * 100).toFixed(1);
    
    console.log(`\n📊 Progress Report (${completionRate}% complete)`);
    console.log(`✅ Completed: ${results.completed.length}/${results.specs.length}`);
    console.log(`📈 Improvements: ${results.improvements.length} (${improvementRate}%)`);
    console.log(`❌ Failed: ${results.failed.length}`);
    
    // Category breakdown
    console.log(`📋 Category Performance:`);
    for (const [category, stats] of Object.entries(results.categoryStats)) {
      console.log(`  ${category}: ${stats.avgScore.toFixed(1)}/100 avg (${stats.improvements}/${stats.completed} improved)`);
    }
  }

  async generateFinalReport(results) {
    const endTime = Date.now();
    const totalTime = endTime - results.startTime;
    const completionRate = (results.completed.length / results.specs.length * 100);
    const improvementRate = (results.
