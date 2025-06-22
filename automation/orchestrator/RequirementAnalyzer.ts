/**
 * Requirement Analyzer
 * AI-powered requirement analysis and development phase planning
 * 
 * This component analyzes requirements and automatically creates structured
 * development phases following Clean Architecture principles.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { execSync } from 'child_process';

export interface Requirement {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly category: 'feature' | 'enhancement' | 'bugfix' | 'refactor' | 'infrastructure';
  readonly complexity: 'simple' | 'moderate' | 'complex';
  readonly dependencies: string[];
  readonly acceptanceCriteria: string[];
  readonly estimatedEffort: number; // in hours
}

export interface DevelopmentPhase {
  readonly name: string;
  readonly description: string;
  readonly requirements: string[];
  readonly completionCriteria: string[];
  readonly architecturalLayer: 'domain' | 'application' | 'infrastructure' | 'presentation' | 'cross-cutting';
  readonly order: number;
  readonly dependencies: string[];
  readonly testStrategy: string;
}

export interface ArchitecturalComponent {
  readonly name: string;
  readonly layer: string;
  readonly responsibilities: string[];
  readonly interfaces: string[];
  readonly dependencies: string[];
}

export class RequirementAnalyzer {
  private static readonly REQUIREMENT_SOURCES = [
    'README.md',
    'REQUIREMENTS.md',
    'docs/**/*.md',
    'issues.json',
    'user-stories.md',
    'CLAUDE.md'
  ];

  private static readonly ARCHITECTURAL_PATTERNS = {
    domain: {
      entities: ['Entity', 'AggregateRoot', 'ValueObject'],
      services: ['DomainService', 'DomainEvent'],
      repositories: ['Repository', 'IRepository']
    },
    application: {
      usecases: ['UseCase', 'Command', 'Query'],
      handlers: ['Handler', 'EventHandler'],
      services: ['ApplicationService']
    },
    infrastructure: {
      repositories: ['Repository Implementation'],
      adapters: ['Adapter', 'Client', 'Provider'],
      external: ['API', 'Database', 'FileSystem']
    },
    presentation: {
      controllers: ['Controller', 'Endpoint'],
      ui: ['Component', 'View', 'Interface']
    }
  };

  private readonly projectRoot: string;
  private readonly requirements: Map<string, Requirement> = new Map();
  private readonly phases: DevelopmentPhase[] = [];

  constructor(config: { projectRoot: string }) {
    this.projectRoot = config.projectRoot;
  }

  /**
   * Discover requirements from existing project documentation and code
   */
  public async discoverRequirements(): Promise<string[]> {
    const requirements: string[] = [];

    // Analyze existing documentation
    const docRequirements = await this.analyzeDocumentation();
    requirements.push(...docRequirements);

    // Analyze existing code structure
    const codeRequirements = await this.analyzeCodeStructure();
    requirements.push(...codeRequirements);

    // Analyze git history for patterns
    const historyRequirements = await this.analyzeGitHistory();
    requirements.push(...historyRequirements);

    // Analyze TODO and FIXME comments
    const todoRequirements = await this.analyzeTodoComments();
    requirements.push(...todoRequirements);

    return this.deduplicateRequirements(requirements);
  }

  /**
   * Create structured development phases from requirements
   */
  public async createDevelopmentPhases(requirements: string[]): Promise<DevelopmentPhase[]> {
    // Parse and structure requirements
    const structuredRequirements = await this.parseRequirements(requirements);
    
    // Group requirements by architectural concerns
    const groupedRequirements = this.groupByArchitecture(structuredRequirements);
    
    // Create phases following Clean Architecture dependency rules
    const phases = this.createArchitecturalPhases(groupedRequirements);
    
    // Optimize phase ordering and dependencies
    const optimizedPhases = this.optimizePhaseOrder(phases);
    
    return optimizedPhases;
  }

  /**
   * Analyze project documentation for requirements
   */
  private async analyzeDocumentation(): Promise<string[]> {
    const requirements: string[] = [];
    
    for (const source of RequirementAnalyzer.REQUIREMENT_SOURCES) {
      const files = this.findFiles(source);
      
      for (const file of files) {
        const content = this.readFileContent(file);
        const extracted = this.extractRequirementsFromText(content, file);
        requirements.push(...extracted);
      }
    }
    
    return requirements;
  }

  /**
   * Analyze existing code structure for implied requirements
   */
  private async analyzeCodeStructure(): Promise<string[]> {
    const requirements: string[] = [];
    const srcPath = join(this.projectRoot, 'src');
    
    if (!existsSync(srcPath)) {
      return requirements;
    }

    // Analyze domain layer
    const domainRequirements = this.analyzeDomainLayer();
    requirements.push(...domainRequirements);

    // Analyze application layer
    const applicationRequirements = this.analyzeApplicationLayer();
    requirements.push(...applicationRequirements);

    // Analyze infrastructure needs
    const infrastructureRequirements = this.analyzeInfrastructureLayer();
    requirements.push(...infrastructureRequirements);

    // Analyze presentation requirements
    const presentationRequirements = this.analyzePresentationLayer();
    requirements.push(...presentationRequirements);

    return requirements;
  }

  /**
   * Analyze git history for development patterns
   */
  private async analyzeGitHistory(): Promise<string[]> {
    const requirements: string[] = [];
    
    try {
      const gitLog = execSync('git log --oneline --since="3 months ago"', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });
      
      const commits = gitLog.split('\n').filter(line => line.trim());
      
      for (const commit of commits) {
        const extracted = this.extractRequirementsFromCommit(commit);
        requirements.push(...extracted);
      }
    } catch (error) {
      // Git history not available
    }
    
    return requirements;
  }

  /**
   * Find TODO and FIXME comments in code
   */
  private async analyzeTodoComments(): Promise<string[]> {
    const requirements: string[] = [];
    
    try {
      const grepOutput = execSync('grep -r "TODO\\|FIXME\\|HACK" src/ || true', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });
      
      const todos = grepOutput.split('\n').filter(line => line.trim());
      
      for (const todo of todos) {
        const requirement = this.extractRequirementFromTodo(todo);
        if (requirement) {
          requirements.push(requirement);
        }
      }
    } catch (error) {
      // Grep not available or no matches
    }
    
    return requirements;
  }

  /**
   * Parse raw requirements into structured format
   */
  private async parseRequirements(rawRequirements: string[]): Promise<Requirement[]> {
    const structured: Requirement[] = [];
    
    for (let i = 0; i < rawRequirements.length; i++) {
      const raw = rawRequirements[i]!;
      const requirement = this.parseRequirement(raw, i);
      structured.push(requirement);
    }
    
    return structured;
  }

  /**
   * Parse a single requirement from text
   */
  private parseRequirement(text: string, index: number): Requirement {
    const id = `REQ-${String(index + 1).padStart(3, '0')}`;
    
    // Extract title (first line or sentence)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const title = lines[0] || 'Untitled Requirement';
    
    // Determine category based on keywords
    const category = this.categorizeRequirement(text);
    
    // Determine priority based on keywords
    const priority = this.determinePriority(text);
    
    // Determine complexity
    const complexity = this.determineComplexity(text);
    
    // Extract acceptance criteria
    const acceptanceCriteria = this.extractAcceptanceCriteria(text);
    
    // Estimate effort
    const estimatedEffort = this.estimateEffort(text, complexity);
    
    return {
      id,
      title,
      description: text,
      priority,
      category,
      complexity,
      dependencies: [],
      acceptanceCriteria,
      estimatedEffort
    };
  }

  /**
   * Group requirements by architectural layers
   */
  private groupByArchitecture(requirements: Requirement[]): Map<string, Requirement[]> {
    const groups = new Map<string, Requirement[]>();
    
    // Initialize groups
    ['domain', 'application', 'infrastructure', 'presentation', 'cross-cutting'].forEach(layer => {
      groups.set(layer, []);
    });
    
    for (const req of requirements) {
      const layer = this.determineArchitecturalLayer(req);
      const layerRequirements = groups.get(layer) || [];
      layerRequirements.push(req);
      groups.set(layer, layerRequirements);
    }
    
    return groups;
  }

  /**
   * Create development phases following Clean Architecture
   */
  private createArchitecturalPhases(groupedRequirements: Map<string, Requirement[]>): DevelopmentPhase[] {
    const phases: DevelopmentPhase[] = [];
    
    // Phase 1: Domain Layer (no dependencies)
    const domainRequirements = groupedRequirements.get('domain') || [];
    if (domainRequirements.length > 0) {
      phases.push({
        name: 'Domain Foundation',
        description: 'Implement core business logic, entities, and value objects',
        requirements: domainRequirements.map(r => r.id),
        completionCriteria: [
          'All domain entities implemented',
          'Value objects created and tested',
          'Domain services implemented',
          '100% test coverage for domain layer'
        ],
        architecturalLayer: 'domain',
        order: 1,
        dependencies: [],
        testStrategy: 'Pure unit tests with no mocks'
      });
    }

    // Phase 2: Application Layer (depends on Domain)
    const applicationRequirements = groupedRequirements.get('application') || [];
    if (applicationRequirements.length > 0) {
      phases.push({
        name: 'Application Services',
        description: 'Implement use cases and application orchestration',
        requirements: applicationRequirements.map(r => r.id),
        completionCriteria: [
          'All use cases implemented',
          'Command and query handlers created',
          'Application services tested',
          '95% test coverage for application layer'
        ],
        architecturalLayer: 'application',
        order: 2,
        dependencies: ['Domain Foundation'],
        testStrategy: 'Unit tests with mocked dependencies'
      });
    }

    // Phase 3: Infrastructure Layer (depends on Application)
    const infrastructureRequirements = groupedRequirements.get('infrastructure') || [];
    if (infrastructureRequirements.length > 0) {
      phases.push({
        name: 'Infrastructure Implementation',
        description: 'Implement external system integrations and data persistence',
        requirements: infrastructureRequirements.map(r => r.id),
        completionCriteria: [
          'Repository implementations completed',
          'External API clients implemented',
          'Storage adapters created',
          'Integration tests passing'
        ],
        architecturalLayer: 'infrastructure',
        order: 3,
        dependencies: ['Application Services'],
        testStrategy: 'Integration tests with real/fake external systems'
      });
    }

    // Phase 4: Presentation Layer (depends on Application)
    const presentationRequirements = groupedRequirements.get('presentation') || [];
    if (presentationRequirements.length > 0) {
      phases.push({
        name: 'User Interface',
        description: 'Implement user interfaces and API endpoints',
        requirements: presentationRequirements.map(r => r.id),
        completionCriteria: [
          'UI components implemented',
          'API endpoints created',
          'User workflows tested',
          'E2E tests passing'
        ],
        architecturalLayer: 'presentation',
        order: 4,
        dependencies: ['Application Services'],
        testStrategy: 'Component tests and E2E tests'
      });
    }

    // Phase 5: Cross-cutting Concerns
    const crossCuttingRequirements = groupedRequirements.get('cross-cutting') || [];
    if (crossCuttingRequirements.length > 0) {
      phases.push({
        name: 'Cross-cutting Concerns',
        description: 'Implement logging, monitoring, security, and performance optimizations',
        requirements: crossCuttingRequirements.map(r => r.id),
        completionCriteria: [
          'Logging implemented',
          'Error handling standardized',
          'Security measures in place',
          'Performance monitoring active'
        ],
        architecturalLayer: 'cross-cutting',
        order: 5,
        dependencies: ['Infrastructure Implementation', 'User Interface'],
        testStrategy: 'System tests and performance tests'
      });
    }

    return phases;
  }

  /**
   * Optimize phase ordering based on dependencies
   */
  private optimizePhaseOrder(phases: DevelopmentPhase[]): DevelopmentPhase[] {
    // Topological sort to ensure proper dependency ordering
    const sorted = [...phases].sort((a, b) => a.order - b.order);
    
    // Validate dependency chains
    for (const phase of sorted) {
      for (const dep of phase.dependencies) {
        const depPhase = sorted.find(p => p.name === dep);
        if (depPhase && depPhase.order >= phase.order) {
          throw new Error(`Invalid dependency: ${phase.name} depends on ${dep} but has earlier or same order`);
        }
      }
    }
    
    return sorted;
  }

  /**
   * Helper methods for requirement analysis
   */
  private findFiles(pattern: string): string[] {
    // Simple file finding implementation
    const files: string[] = [];
    
    if (pattern.includes('**')) {
      // Recursive search
      const baseDir = pattern.split('**')[0] || '.';
      const extension = pattern.split('**')[1] || '';
      files.push(...this.findFilesRecursive(join(this.projectRoot, baseDir), extension));
    } else {
      const fullPath = join(this.projectRoot, pattern);
      if (existsSync(fullPath)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private findFilesRecursive(dir: string, extension: string): string[] {
    const files: string[] = [];
    
    if (!existsSync(dir)) return files;
    
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.findFilesRecursive(fullPath, extension));
      } else if (stat.isFile() && fullPath.endsWith(extension)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private readFileContent(filePath: string): string {
    try {
      return readFileSync(filePath, 'utf8');
    } catch {
      return '';
    }
  }

  private extractRequirementsFromText(content: string, source: string): string[] {
    const requirements: string[] = [];
    
    // Look for various requirement patterns
    const patterns = [
      /(?:^|\n)#{1,3}\s+(.+)/g,           // Markdown headers
      /(?:^|\n)-\s+(.+)/g,               // Bullet points
      /(?:^|\n)\d+\.\s+(.+)/g,           // Numbered lists
      /(?:^|\n)(?:Feature|Requirement|Story):\s*(.+)/gi, // Explicit requirements
      /(?:^|\n)(?:Should|Must|Will)\s+(.+)/gi           // Modal verbs
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const requirement = match[1]?.trim();
        if (requirement && requirement.length > 10) {
          requirements.push(`[${source}] ${requirement}`);
        }
      }
    }
    
    return requirements;
  }

  private extractRequirementsFromCommit(commit: string): string[] {
    const requirements: string[] = [];
    
    // Extract meaningful commit messages
    const message = commit.replace(/^[a-f0-9]+\s+/, '');
    
    if (message.length > 10 && !message.startsWith('Merge') && !message.startsWith('Update')) {
      requirements.push(`[Git History] ${message}`);
    }
    
    return requirements;
  }

  private extractRequirementFromTodo(todo: string): string | null {
    const match = todo.match(/(?:TODO|FIXME|HACK):\s*(.+)/i);
    return match ? `[Code Comment] ${match[1]?.trim()}` : null;
  }

  private categorizeRequirement(text: string): Requirement['category'] {
    const lower = text.toLowerCase();
    
    if (lower.includes('fix') || lower.includes('bug') || lower.includes('error')) {
      return 'bugfix';
    }
    if (lower.includes('refactor') || lower.includes('clean') || lower.includes('improve')) {
      return 'refactor';
    }
    if (lower.includes('infrastructure') || lower.includes('build') || lower.includes('deploy')) {
      return 'infrastructure';
    }
    if (lower.includes('enhance') || lower.includes('update') || lower.includes('modify')) {
      return 'enhancement';
    }
    
    return 'feature';
  }

  private determinePriority(text: string): Requirement['priority'] {
    const lower = text.toLowerCase();
    
    if (lower.includes('critical') || lower.includes('urgent') || lower.includes('high')) {
      return 'high';
    }
    if (lower.includes('low') || lower.includes('nice') || lower.includes('optional')) {
      return 'low';
    }
    
    return 'medium';
  }

  private determineComplexity(text: string): Requirement['complexity'] {
    const lower = text.toLowerCase();
    const length = text.length;
    
    if (lower.includes('complex') || lower.includes('difficult') || length > 500) {
      return 'complex';
    }
    if (lower.includes('simple') || lower.includes('easy') || length < 100) {
      return 'simple';
    }
    
    return 'moderate';
  }

  private extractAcceptanceCriteria(text: string): string[] {
    const criteria: string[] = [];
    
    // Look for acceptance criteria patterns
    const patterns = [
      /(?:Given|When|Then)\s+(.+)/gi,
      /(?:Should|Must|Will)\s+(.+)/gi,
      /(?:Accepts?|Criteria?):\s*(.+)/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const criterion = match[1]?.trim();
        if (criterion) {
          criteria.push(criterion);
        }
      }
    }
    
    return criteria.length > 0 ? criteria : ['Implementation completed', 'Tests passing'];
  }

  private estimateEffort(text: string, complexity: Requirement['complexity']): number {
    const baseEfforts = {
      simple: 2,
      moderate: 8,
      complex: 24
    };
    
    let effort = baseEfforts[complexity];
    
    // Adjust based on content
    const lower = text.toLowerCase();
    if (lower.includes('integration') || lower.includes('api')) effort *= 1.5;
    if (lower.includes('ui') || lower.includes('interface')) effort *= 1.3;
    if (lower.includes('test') || lower.includes('testing')) effort *= 0.5;
    
    return Math.round(effort);
  }

  private determineArchitecturalLayer(requirement: Requirement): string {
    const description = requirement.description.toLowerCase();
    
    // Domain layer indicators
    if (description.includes('business') || description.includes('entity') || 
        description.includes('rule') || description.includes('value object')) {
      return 'domain';
    }
    
    // Application layer indicators
    if (description.includes('use case') || description.includes('workflow') || 
        description.includes('orchestrate') || description.includes('command')) {
      return 'application';
    }
    
    // Infrastructure layer indicators
    if (description.includes('database') || description.includes('api') || 
        description.includes('storage') || description.includes('client')) {
      return 'infrastructure';
    }
    
    // Presentation layer indicators
    if (description.includes('ui') || description.includes('interface') || 
        description.includes('display') || description.includes('render')) {
      return 'presentation';
    }
    
    // Cross-cutting concerns
    if (description.includes('logging') || description.includes('security') || 
        description.includes('monitoring') || description.includes('performance')) {
      return 'cross-cutting';
    }
    
    return 'application'; // Default to application layer
  }

  private analyzeDomainLayer(): string[] {
    const requirements: string[] = [];
    const domainPath = join(this.projectRoot, 'src/domain');
    
    if (existsSync(domainPath)) {
      // Analyze entities
      requirements.push(...this.analyzeEntities());
      
      // Analyze value objects
      requirements.push(...this.analyzeValueObjects());
      
      // Analyze domain services
      requirements.push(...this.analyzeDomainServices());
    }
    
    return requirements;
  }

  private analyzeApplicationLayer(): string[] {
    const requirements: string[] = [];
    const appPath = join(this.projectRoot, 'src/application');
    
    if (existsSync(appPath)) {
      // Analyze use cases
      requirements.push(...this.analyzeUseCases());
      
      // Analyze handlers
      requirements.push(...this.analyzeHandlers());
    }
    
    return requirements;
  }

  private analyzeInfrastructureLayer(): string[] {
    const requirements: string[] = [];
    const infraPath = join(this.projectRoot, 'src/infrastructure');
    
    if (existsSync(infraPath)) {
      // Analyze repositories
      requirements.push(...this.analyzeRepositories());
      
      // Analyze API clients
      requirements.push(...this.analyzeApiClients());
    }
    
    return requirements;
  }

  private analyzePresentationLayer(): string[] {
    const requirements: string[] = [];
    const presPath = join(this.projectRoot, 'src/presentation');
    
    if (existsSync(presPath)) {
      // Analyze UI components
      requirements.push(...this.analyzeUIComponents());
      
      // Analyze controllers
      requirements.push(...this.analyzeControllers());
    }
    
    return requirements;
  }

  // Placeholder implementations for specific analysis methods
  private analyzeEntities(): string[] { return []; }
  private analyzeValueObjects(): string[] { return []; }
  private analyzeDomainServices(): string[] { return []; }
  private analyzeUseCases(): string[] { return []; }
  private analyzeHandlers(): string[] { return []; }
  private analyzeRepositories(): string[] { return []; }
  private analyzeApiClients(): string[] { return []; }
  private analyzeUIComponents(): string[] { return []; }
  private analyzeControllers(): string[] { return []; }

  private deduplicateRequirements(requirements: string[]): string[] {
    return Array.from(new Set(requirements));
  }
}