/**
 * Claude Code Orchestrator
 * AI-First Self-Driving TDD Orchestration System
 * 
 * This is the central nervous system of the autonomous development process.
 * It coordinates the Red-Green-Refactor cycle with minimal human intervention.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { RequirementAnalyzer } from './RequirementAnalyzer';
import { TestGenerator } from './TestGenerator';
import { TDDCycleManager } from './TDDCycleManager';

export interface OrchestratorConfig {
  readonly projectRoot: string;
  readonly targetCoverage: number;
  readonly maxIterations: number;
  readonly autoCommit: boolean;
  readonly autoRefactor: boolean;
  readonly strictMode: boolean;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface DevelopmentPhase {
  readonly name: string;
  readonly description: string;
  readonly requirements: string[];
  readonly completionCriteria: string[];
}

export interface TDDIteration {
  readonly iteration: number;
  readonly phase: 'red' | 'green' | 'refactor';
  readonly testFiles: string[];
  readonly implementationFiles: string[];
  readonly coverageReport: CoverageReport;
  readonly success: boolean;
  readonly errors: string[];
  readonly duration: number;
  readonly timestamp: Date;
}

export interface CoverageReport {
  readonly statements: number;
  readonly branches: number;
  readonly functions: number;
  readonly lines: number;
  readonly uncoveredLines: string[];
}

export class ClaudeCodeOrchestrator {
  private static readonly DEFAULT_CONFIG: OrchestratorConfig = {
    projectRoot: process.cwd(),
    targetCoverage: 95,
    maxIterations: 100,
    autoCommit: true,
    autoRefactor: true,
    strictMode: true,
    logLevel: 'info'
  };

  private readonly config: OrchestratorConfig;
  private readonly requirementAnalyzer: RequirementAnalyzer;
  private readonly testGenerator: TestGenerator;
  private readonly tddCycleManager: TDDCycleManager;
  private readonly iterations: TDDIteration[] = [];
  private currentPhase: DevelopmentPhase | null = null;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...ClaudeCodeOrchestrator.DEFAULT_CONFIG, ...config };
    this.requirementAnalyzer = new RequirementAnalyzer(this.config);
    this.testGenerator = new TestGenerator(this.config);
    this.tddCycleManager = new TDDCycleManager(this.config);

    this.ensureProjectStructure();
    this.log('info', 'Claude Code Orchestrator initialized', { config: this.config });
  }

  /**
   * Main entry point for autonomous TDD development
   */
  public async runAutonomousTDD(requirements?: string[]): Promise<boolean> {
    this.log('info', '🤖 Starting Autonomous TDD Development');

    try {
      // Phase 1: Analyze requirements
      const analysisResults = await this.analyzeRequirements(requirements);
      
      // Phase 2: Generate comprehensive test suite
      await this.generateInitialTests(analysisResults);
      
      // Phase 3: Execute TDD cycles until completion
      const success = await this.executeTDDCycles();
      
      // Phase 4: Final validation and documentation
      await this.finalizeImplementation();
      
      this.log('info', `🎉 Autonomous TDD completed successfully: ${success}`);
      return success;

    } catch (error) {
      this.log('error', '❌ Autonomous TDD failed', { error });
      return false;
    }
  }

  /**
   * Bootstrap a new project with Clean Architecture structure
   */
  public async bootstrap(): Promise<void> {
    this.log('info', '🚀 Bootstrapping Clean Architecture project');

    try {
      await this.createProjectStructure();
      await this.generateBaseConfiguration();
      await this.createInitialTests();
      await this.setupCIPipeline();
      
      this.log('info', '✅ Project bootstrap completed');
    } catch (error) {
      this.log('error', '❌ Bootstrap failed', { error });
      throw error;
    }
  }

  /**
   * Analyze requirements and create development phases
   */
  private async analyzeRequirements(requirements?: string[]): Promise<DevelopmentPhase[]> {
    this.log('info', '📋 Analyzing requirements');

    if (!requirements || requirements.length === 0) {
      // Auto-discover requirements from existing code and documentation
      requirements = await this.requirementAnalyzer.discoverRequirements();
    }

    const phases = await this.requirementAnalyzer.createDevelopmentPhases(requirements);
    
    this.log('info', `📊 Created ${phases.length} development phases`, { phases });
    return phases;
  }

  /**
   * Generate comprehensive test suite for all phases
   */
  private async generateInitialTests(phases: DevelopmentPhase[]): Promise<void> {
    this.log('info', '🧪 Generating comprehensive test suite');

    for (const phase of phases) {
      this.currentPhase = phase;
      
      const testFiles = await this.testGenerator.generateTestsForPhase(phase);
      
      this.log('info', `Generated ${testFiles.length} test files for phase: ${phase.name}`, {
        phase: phase.name,
        testFiles
      });
    }
  }

  /**
   * Execute TDD cycles until all tests pass and coverage targets are met
   */
  private async executeTDDCycles(): Promise<boolean> {
    this.log('info', '🔄 Starting TDD execution cycles');

    let iteration = 1;
    let allTestsPassing = false;
    let targetCoverageAchieved = false;

    while (iteration <= this.config.maxIterations && (!allTestsPassing || !targetCoverageAchieved)) {
      this.log('info', `🔄 TDD Iteration ${iteration}/${this.config.maxIterations}`);

      try {
        // RED: Ensure we have failing tests
        const redResult = await this.executeRedPhase(iteration);
        
        // GREEN: Implement minimal code to pass tests
        const greenResult = await this.executeGreenPhase(iteration);
        
        // REFACTOR: Improve code quality while maintaining tests
        const refactorResult = await this.executeRefactorPhase(iteration);
        
        // Validate results
        const coverageReport = await this.generateCoverageReport();
        allTestsPassing = greenResult.success;
        targetCoverageAchieved = coverageReport.statements >= this.config.targetCoverage;

        this.recordIteration(iteration, redResult, greenResult, refactorResult, coverageReport);

        if (this.config.autoCommit && allTestsPassing) {
          await this.commitProgress(iteration);
        }

        iteration++;

      } catch (error) {
        this.log('error', `❌ TDD iteration ${iteration} failed`, { error });
        iteration++;
      }
    }

    const success = allTestsPassing && targetCoverageAchieved;
    this.log('info', `🏁 TDD cycles completed. Success: ${success}`, {
      totalIterations: iteration - 1,
      allTestsPassing,
      targetCoverageAchieved
    });

    return success;
  }

  /**
   * RED phase: Ensure failing tests exist
   */
  private async executeRedPhase(iteration: number): Promise<TDDIteration> {
    this.log('info', '🔴 Executing RED phase - Failing tests');

    const startTime = Date.now();
    const testResult = await this.runTests();
    
    if (testResult.success) {
      // No failing tests - need to generate more
      await this.testGenerator.generateMissingTests();
    }

    const duration = Date.now() - startTime;
    
    return {
      iteration,
      phase: 'red',
      testFiles: await this.getTestFiles(),
      implementationFiles: await this.getImplementationFiles(),
      coverageReport: await this.generateCoverageReport(),
      success: !testResult.success, // Success in RED means we have failing tests
      errors: testResult.errors,
      duration,
      timestamp: new Date()
    };
  }

  /**
   * GREEN phase: Implement minimal code to pass tests
   */
  private async executeGreenPhase(iteration: number): Promise<TDDIteration> {
    this.log('info', '🟢 Executing GREEN phase - Minimal implementation');

    const startTime = Date.now();
    
    // Generate minimal implementation
    await this.tddCycleManager.generateMinimalImplementation();
    
    // Run tests to verify they pass
    const testResult = await this.runTests();
    const duration = Date.now() - startTime;

    return {
      iteration,
      phase: 'green',
      testFiles: await this.getTestFiles(),
      implementationFiles: await this.getImplementationFiles(),
      coverageReport: await this.generateCoverageReport(),
      success: testResult.success,
      errors: testResult.errors,
      duration,
      timestamp: new Date()
    };
  }

  /**
   * REFACTOR phase: Improve code quality
   */
  private async executeRefactorPhase(iteration: number): Promise<TDDIteration> {
    this.log('info', '🔵 Executing REFACTOR phase - Code improvement');

    const startTime = Date.now();
    let success = true;
    const errors: string[] = [];

    if (this.config.autoRefactor) {
      try {
        await this.tddCycleManager.refactorImplementation();
        
        // Ensure tests still pass after refactoring
        const testResult = await this.runTests();
        success = testResult.success;
        errors.push(...testResult.errors);
        
      } catch (error) {
        success = false;
        errors.push(String(error));
      }
    }

    const duration = Date.now() - startTime;

    return {
      iteration,
      phase: 'refactor',
      testFiles: await this.getTestFiles(),
      implementationFiles: await this.getImplementationFiles(),
      coverageReport: await this.generateCoverageReport(),
      success,
      errors,
      duration,
      timestamp: new Date()
    };
  }

  /**
   * Run all tests and return results
   */
  private async runTests(): Promise<{ success: boolean; errors: string[] }> {
    try {
      const output = execSync('npm test', { 
        cwd: this.config.projectRoot,
        encoding: 'utf8'
      });
      
      return { success: true, errors: [] };
    } catch (error: any) {
      const errors = error.stdout ? [error.stdout] : [String(error)];
      return { success: false, errors };
    }
  }

  /**
   * Generate coverage report
   */
  private async generateCoverageReport(): Promise<CoverageReport> {
    try {
      const output = execSync('npm run test:coverage', {
        cwd: this.config.projectRoot,
        encoding: 'utf8'
      });

      // Parse coverage from output (simplified)
      const lines = output.split('\n');
      const coverageLine = lines.find(line => line.includes('All files'));
      
      if (coverageLine) {
        const parts = coverageLine.split('|').map(p => p.trim());
        return {
          statements: parseFloat(parts[1] || '0'),
          branches: parseFloat(parts[2] || '0'),
          functions: parseFloat(parts[3] || '0'),
          lines: parseFloat(parts[4] || '0'),
          uncoveredLines: []
        };
      }
    } catch (error) {
      this.log('warn', 'Failed to generate coverage report', { error });
    }

    return {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
      uncoveredLines: []
    };
  }

  /**
   * Get all test files
   */
  private async getTestFiles(): Promise<string[]> {
    try {
      const output = execSync('find tests -name "*.test.ts" -type f', {
        cwd: this.config.projectRoot,
        encoding: 'utf8'
      });
      return output.trim().split('\n').filter(f => f.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Get all implementation files
   */
  private async getImplementationFiles(): Promise<string[]> {
    try {
      const output = execSync('find src -name "*.ts" -type f', {
        cwd: this.config.projectRoot,
        encoding: 'utf8'
      });
      return output.trim().split('\n').filter(f => f.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Record iteration results
   */
  private recordIteration(
    iteration: number,
    red: TDDIteration,
    green: TDDIteration,
    refactor: TDDIteration,
    coverage: CoverageReport
  ): void {
    this.iterations.push(red, green, refactor);
    
    // Save progress to file
    const progressFile = join(this.config.projectRoot, '.tdd-progress.json');
    writeFileSync(progressFile, JSON.stringify({
      iterations: this.iterations,
      currentPhase: this.currentPhase,
      coverage,
      timestamp: new Date()
    }, null, 2));
  }

  /**
   * Commit progress to git
   */
  private async commitProgress(iteration: number): Promise<void> {
    try {
      execSync('git add .', { cwd: this.config.projectRoot });
      execSync(`git commit -m "🤖 TDD Iteration ${iteration}: Auto-implementation"`, {
        cwd: this.config.projectRoot
      });
      this.log('info', `📝 Committed iteration ${iteration}`);
    } catch (error) {
      this.log('warn', 'Failed to commit progress', { error });
    }
  }

  /**
   * Ensure project structure exists
   */
  private ensureProjectStructure(): void {
    const dirs = [
      'src/domain',
      'src/application',
      'src/infrastructure',
      'src/presentation',
      'tests',
      'automation',
      'build',
      'docs'
    ];

    dirs.forEach(dir => {
      const fullPath = join(this.config.projectRoot, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  /**
   * Create initial project structure
   */
  private async createProjectStructure(): Promise<void> {
    // Create all necessary directories as defined in CLAUDE.md
    this.ensureProjectStructure();
  }

  /**
   * Generate base configuration files
   */
  private async generateBaseConfiguration(): Promise<void> {
    // This would generate tsconfig.json, jest.config.ts, etc.
    // Already implemented in previous files
  }

  /**
   * Create initial test templates
   */
  private async createInitialTests(): Promise<void> {
    // Generate basic test structure
    await this.testGenerator.generateBasicTestStructure();
  }

  /**
   * Setup CI/CD pipeline
   */
  private async setupCIPipeline(): Promise<void> {
    // Generate GitHub Actions workflows
    // Will be implemented in deployment automation
  }

  /**
   * Finalize implementation with documentation and validation
   */
  private async finalizeImplementation(): Promise<void> {
    this.log('info', '📚 Finalizing implementation');
    
    // Generate documentation
    // Validate architecture compliance
    // Create deployment artifacts
  }

  /**
   * Logging utility
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      
      console.log(logMessage);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  /**
   * Get orchestration statistics
   */
  public getStatistics(): any {
    return {
      totalIterations: this.iterations.length,
      redPhases: this.iterations.filter(i => i.phase === 'red').length,
      greenPhases: this.iterations.filter(i => i.phase === 'green').length,
      refactorPhases: this.iterations.filter(i => i.phase === 'refactor').length,
      successRate: this.iterations.filter(i => i.success).length / this.iterations.length,
      averageDuration: this.iterations.reduce((sum, i) => sum + i.duration, 0) / this.iterations.length,
      currentPhase: this.currentPhase
    };
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const orchestrator = new ClaudeCodeOrchestrator();

  if (args.includes('--bootstrap')) {
    orchestrator.bootstrap().catch(console.error);
  } else {
    orchestrator.runAutonomousTDD().catch(console.error);
  }
}