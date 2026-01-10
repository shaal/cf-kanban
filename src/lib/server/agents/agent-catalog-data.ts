/**
 * Static Agent Catalog Data
 * GAP-3.3.1: Visual Agent Catalog
 *
 * Contains definitions for all 60+ Claude Flow agent types
 * organized by category with capabilities and pairing suggestions.
 */

import type { AgentTypeDefinition } from '$lib/types/agents';

/**
 * Complete catalog of all available agent types
 */
export const AGENT_CATALOG: AgentTypeDefinition[] = [
	// ═══════════════════════════════════════════════════════════════════════════
	// CORE DEVELOPMENT AGENTS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: 'coder',
		name: 'Coder',
		category: 'core-development',
		description: 'General-purpose coding agent for implementing features, fixing bugs, and writing clean code',
		capabilities: ['Code generation', 'Bug fixing', 'Refactoring', 'Documentation', 'API integration'],
		bestPairedWith: ['tester', 'reviewer', 'architect'],
		useCases: ['Feature implementation', 'Code migration', 'API integration', 'Bug fixes'],
		complexity: 'basic',
		icon: 'Code',
		keywords: ['code', 'implement', 'develop', 'program', 'write']
	},
	{
		id: 'tester',
		name: 'Tester',
		category: 'core-development',
		description: 'Testing agent for writing and running tests, ensuring code quality and coverage',
		capabilities: ['Unit testing', 'Integration testing', 'Test coverage analysis', 'QA validation', 'Regression testing'],
		bestPairedWith: ['coder', 'reviewer'],
		useCases: ['Writing unit tests', 'Test coverage improvement', 'Regression testing', 'E2E testing'],
		complexity: 'basic',
		icon: 'TestTube2',
		keywords: ['test', 'qa', 'quality', 'coverage', 'validation']
	},
	{
		id: 'reviewer',
		name: 'Reviewer',
		category: 'core-development',
		description: 'Code review agent for ensuring quality, security, and best practices compliance',
		capabilities: ['Code review', 'Security analysis', 'Best practices enforcement', 'Performance review', 'Style guide compliance'],
		bestPairedWith: ['coder', 'security-auditor'],
		useCases: ['PR reviews', 'Security audits', 'Code quality gates', 'Architecture review'],
		complexity: 'basic',
		icon: 'Eye',
		keywords: ['review', 'audit', 'quality', 'check', 'inspect']
	},
	{
		id: 'researcher',
		name: 'Researcher',
		category: 'core-development',
		description: 'Research agent for analyzing requirements, investigating solutions, and documenting findings',
		capabilities: ['Requirements analysis', 'Solution research', 'Documentation', 'Competitive analysis', 'Technical investigation'],
		bestPairedWith: ['planner', 'architect'],
		useCases: ['Technology evaluation', 'Bug investigation', 'Documentation', 'Feasibility studies'],
		complexity: 'basic',
		icon: 'Search',
		keywords: ['research', 'investigate', 'analyze', 'document', 'explore']
	},
	{
		id: 'planner',
		name: 'Planner',
		category: 'core-development',
		description: 'Planning agent for breaking down tasks, estimation, and project organization',
		capabilities: ['Task breakdown', 'Estimation', 'Dependency mapping', 'Sprint planning', 'Roadmap creation'],
		bestPairedWith: ['researcher', 'coordinator'],
		useCases: ['Sprint planning', 'Feature breakdown', 'Estimation', 'Project roadmaps'],
		complexity: 'basic',
		icon: 'ListTodo',
		keywords: ['plan', 'organize', 'estimate', 'schedule', 'breakdown']
	},
	{
		id: 'architect',
		name: 'Architect',
		category: 'core-development',
		description: 'Architecture agent for system design, patterns, and structural decisions',
		capabilities: ['System design', 'Pattern selection', 'API design', 'Database schema', 'Scalability planning'],
		bestPairedWith: ['coder', 'reviewer', 'security-architect'],
		useCases: ['System architecture', 'API design', 'Database modeling', 'Refactoring strategy'],
		complexity: 'intermediate',
		icon: 'Building2',
		keywords: ['architecture', 'design', 'structure', 'pattern', 'schema']
	},
	{
		id: 'coordinator',
		name: 'Coordinator',
		category: 'core-development',
		description: 'Coordination agent for managing complex multi-agent tasks and orchestration',
		capabilities: ['Multi-agent coordination', 'Task delegation', 'Progress tracking', 'Conflict resolution', 'Resource allocation'],
		bestPairedWith: ['planner', 'coder', 'tester'],
		useCases: ['Complex features', 'Multi-team coordination', 'Release management', 'Sprint coordination'],
		complexity: 'intermediate',
		icon: 'Users',
		keywords: ['coordinate', 'orchestrate', 'manage', 'delegate', 'organize']
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// V3 SPECIALIZED AGENTS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: 'security-architect',
		name: 'Security Architect',
		category: 'v3-specialized',
		description: 'Security design agent for threat modeling, security architecture, and compliance',
		capabilities: ['Threat modeling', 'Security architecture', 'Compliance review', 'Access control design', 'Encryption strategy'],
		bestPairedWith: ['security-auditor', 'architect'],
		useCases: ['Security design', 'Threat assessment', 'Compliance planning', 'Auth system design'],
		complexity: 'advanced',
		icon: 'ShieldCheck',
		keywords: ['security', 'threat', 'compliance', 'encryption', 'auth']
	},
	{
		id: 'security-auditor',
		name: 'Security Auditor',
		category: 'v3-specialized',
		description: 'Security audit agent for vulnerability scanning, penetration testing insights, and security review',
		capabilities: ['Vulnerability scanning', 'Security code review', 'OWASP compliance', 'Dependency audit', 'Secret detection'],
		bestPairedWith: ['security-architect', 'reviewer'],
		useCases: ['Security audits', 'Vulnerability assessment', 'Compliance checking', 'Penetration test planning'],
		complexity: 'advanced',
		icon: 'Shield',
		keywords: ['audit', 'vulnerability', 'scan', 'penetration', 'owasp']
	},
	{
		id: 'memory-specialist',
		name: 'Memory Specialist',
		category: 'v3-specialized',
		description: 'Memory optimization agent for managing agent memory, caching strategies, and state management',
		capabilities: ['Memory optimization', 'Cache management', 'State design', 'Memory leak detection', 'GC tuning'],
		bestPairedWith: ['performance-engineer', 'architect'],
		useCases: ['Memory optimization', 'Cache strategy', 'State management', 'Memory leak fixing'],
		complexity: 'advanced',
		icon: 'Brain',
		keywords: ['memory', 'cache', 'state', 'optimization', 'gc']
	},
	{
		id: 'performance-engineer',
		name: 'Performance Engineer',
		category: 'v3-specialized',
		description: 'Performance optimization agent for profiling, benchmarking, and performance tuning',
		capabilities: ['Performance profiling', 'Benchmarking', 'Bottleneck analysis', 'Query optimization', 'Load testing'],
		bestPairedWith: ['memory-specialist', 'coder'],
		useCases: ['Performance tuning', 'Load testing', 'Query optimization', 'Scalability analysis'],
		complexity: 'advanced',
		icon: 'Gauge',
		keywords: ['performance', 'benchmark', 'profile', 'optimize', 'speed']
	},
	{
		id: 'api-docs',
		name: 'API Documentation',
		category: 'v3-specialized',
		description: 'Documentation agent for generating API docs, OpenAPI specs, and developer guides',
		capabilities: ['API documentation', 'OpenAPI generation', 'SDK documentation', 'Example creation', 'Changelog writing'],
		bestPairedWith: ['researcher', 'coder'],
		useCases: ['API docs', 'OpenAPI specs', 'Developer guides', 'SDK documentation'],
		complexity: 'intermediate',
		icon: 'FileText',
		keywords: ['documentation', 'api', 'openapi', 'swagger', 'docs']
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// SWARM COORDINATION AGENTS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: 'hierarchical-coordinator',
		name: 'Hierarchical Coordinator',
		category: 'swarm-coordination',
		description: 'Coordinator for hierarchical swarm topologies with top-down task delegation',
		capabilities: ['Hierarchical delegation', 'Task decomposition', 'Progress aggregation', 'Priority management', 'Escalation handling'],
		bestPairedWith: ['mesh-coordinator', 'planner'],
		useCases: ['Large team coordination', 'Complex projects', 'Multi-level delegation', 'Enterprise workflows'],
		complexity: 'advanced',
		icon: 'GitBranch',
		keywords: ['hierarchy', 'delegate', 'top-down', 'coordination', 'swarm']
	},
	{
		id: 'mesh-coordinator',
		name: 'Mesh Coordinator',
		category: 'swarm-coordination',
		description: 'Coordinator for mesh swarm topologies with peer-to-peer collaboration',
		capabilities: ['Peer coordination', 'Load balancing', 'Consensus building', 'Distributed decision making', 'Fault tolerance'],
		bestPairedWith: ['hierarchical-coordinator', 'consensus-builder'],
		useCases: ['Peer collaboration', 'Distributed teams', 'Resilient workflows', 'Democratic decisions'],
		complexity: 'advanced',
		icon: 'Network',
		keywords: ['mesh', 'peer', 'distributed', 'p2p', 'coordination']
	},
	{
		id: 'adaptive-coordinator',
		name: 'Adaptive Coordinator',
		category: 'swarm-coordination',
		description: 'Dynamic coordinator that adapts topology based on workload and agent availability',
		capabilities: ['Dynamic topology', 'Auto-scaling', 'Load adaptation', 'Failover management', 'Resource optimization'],
		bestPairedWith: ['hierarchical-coordinator', 'mesh-coordinator'],
		useCases: ['Variable workloads', 'Auto-scaling', 'Dynamic teams', 'Resilient systems'],
		complexity: 'advanced',
		icon: 'Shuffle',
		keywords: ['adaptive', 'dynamic', 'auto-scale', 'flexible', 'smart']
	},
	{
		id: 'collective-intelligence-coordinator',
		name: 'Collective Intelligence',
		category: 'swarm-coordination',
		description: 'Coordinator for collective decision-making using swarm intelligence patterns',
		capabilities: ['Swarm intelligence', 'Collective voting', 'Emergent behavior', 'Pattern synthesis', 'Group optimization'],
		bestPairedWith: ['consensus-builder', 'researcher'],
		useCases: ['Complex decisions', 'Pattern discovery', 'Optimization problems', 'Creative solutions'],
		complexity: 'advanced',
		icon: 'Sparkles',
		keywords: ['collective', 'swarm', 'intelligence', 'emergent', 'wisdom']
	},
	{
		id: 'swarm-memory-manager',
		name: 'Swarm Memory Manager',
		category: 'swarm-coordination',
		description: 'Manages shared memory and state across swarm agents',
		capabilities: ['Shared state management', 'Memory synchronization', 'Conflict resolution', 'Cache coordination', 'State persistence'],
		bestPairedWith: ['memory-specialist', 'mesh-coordinator'],
		useCases: ['Shared context', 'State synchronization', 'Distributed cache', 'Knowledge sharing'],
		complexity: 'advanced',
		icon: 'Database',
		keywords: ['memory', 'shared', 'state', 'sync', 'distributed']
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// CONSENSUS & DISTRIBUTED AGENTS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: 'byzantine-coordinator',
		name: 'Byzantine Coordinator',
		category: 'consensus-distributed',
		description: 'BFT consensus coordinator tolerating up to f < n/3 faulty agents',
		capabilities: ['Byzantine fault tolerance', 'Consensus voting', 'Fault detection', 'State agreement', 'Secure coordination'],
		bestPairedWith: ['raft-manager', 'security-architect'],
		useCases: ['High-security consensus', 'Fault-tolerant systems', 'Trustless coordination', 'Critical decisions'],
		complexity: 'advanced',
		icon: 'Castle',
		keywords: ['byzantine', 'bft', 'fault-tolerant', 'consensus', 'secure']
	},
	{
		id: 'raft-manager',
		name: 'Raft Manager',
		category: 'consensus-distributed',
		description: 'Raft consensus manager for leader-based coordination with log replication',
		capabilities: ['Leader election', 'Log replication', 'Term management', 'Heartbeat monitoring', 'Failover'],
		bestPairedWith: ['byzantine-coordinator', 'hierarchical-coordinator'],
		useCases: ['Leader-based consensus', 'Log replication', 'Ordered operations', 'High availability'],
		complexity: 'advanced',
		icon: 'Crown',
		keywords: ['raft', 'leader', 'election', 'replication', 'consensus']
	},
	{
		id: 'gossip-coordinator',
		name: 'Gossip Coordinator',
		category: 'consensus-distributed',
		description: 'Epidemic protocol coordinator for eventual consistency and rumor spreading',
		capabilities: ['Gossip protocol', 'Rumor spreading', 'Membership management', 'Failure detection', 'Anti-entropy'],
		bestPairedWith: ['mesh-coordinator', 'crdt-synchronizer'],
		useCases: ['Eventually consistent systems', 'Large-scale coordination', 'Membership tracking', 'Failure detection'],
		complexity: 'advanced',
		icon: 'MessageCircle',
		keywords: ['gossip', 'epidemic', 'eventual', 'rumor', 'spread']
	},
	{
		id: 'consensus-builder',
		name: 'Consensus Builder',
		category: 'consensus-distributed',
		description: 'General-purpose consensus builder for group decision making',
		capabilities: ['Proposal creation', 'Vote collection', 'Quorum checking', 'Decision finalization', 'Conflict resolution'],
		bestPairedWith: ['collective-intelligence-coordinator', 'planner'],
		useCases: ['Group decisions', 'Voting systems', 'Approval workflows', 'Conflict resolution'],
		complexity: 'intermediate',
		icon: 'Vote',
		keywords: ['consensus', 'vote', 'decision', 'agreement', 'quorum']
	},
	{
		id: 'crdt-synchronizer',
		name: 'CRDT Synchronizer',
		category: 'consensus-distributed',
		description: 'Conflict-free replicated data type coordinator for automatic merge resolution',
		capabilities: ['CRDT operations', 'Automatic merging', 'Causal ordering', 'Vector clocks', 'Eventual consistency'],
		bestPairedWith: ['gossip-coordinator', 'swarm-memory-manager'],
		useCases: ['Collaborative editing', 'Distributed data', 'Conflict-free sync', 'Real-time collaboration'],
		complexity: 'advanced',
		icon: 'Merge',
		keywords: ['crdt', 'conflict-free', 'merge', 'sync', 'replicated']
	},
	{
		id: 'quorum-manager',
		name: 'Quorum Manager',
		category: 'consensus-distributed',
		description: 'Configurable quorum-based consensus manager',
		capabilities: ['Quorum configuration', 'Read/write quorums', 'Consistency levels', 'Partition handling', 'Availability tuning'],
		bestPairedWith: ['raft-manager', 'consensus-builder'],
		useCases: ['Tunable consistency', 'Distributed databases', 'Partition tolerance', 'Availability optimization'],
		complexity: 'advanced',
		icon: 'Scale',
		keywords: ['quorum', 'consistency', 'availability', 'partition', 'cap']
	},
	{
		id: 'security-manager',
		name: 'Security Manager',
		category: 'consensus-distributed',
		description: 'Security policy enforcement agent for distributed systems',
		capabilities: ['Policy enforcement', 'Access control', 'Audit logging', 'Threat response', 'Compliance monitoring'],
		bestPairedWith: ['security-architect', 'byzantine-coordinator'],
		useCases: ['Security policies', 'Access management', 'Audit trails', 'Compliance'],
		complexity: 'advanced',
		icon: 'Lock',
		keywords: ['security', 'policy', 'access', 'audit', 'compliance']
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// GITHUB & REPOSITORY AGENTS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: 'pr-manager',
		name: 'PR Manager',
		category: 'github-repository',
		description: 'Pull request management agent for creating, reviewing, and merging PRs',
		capabilities: ['PR creation', 'Review coordination', 'Merge strategies', 'Conflict resolution', 'CI/CD integration'],
		bestPairedWith: ['reviewer', 'code-review-swarm'],
		useCases: ['PR automation', 'Review workflows', 'Merge management', 'Release PRs'],
		complexity: 'intermediate',
		icon: 'GitPullRequest',
		keywords: ['pr', 'pull-request', 'merge', 'review', 'github']
	},
	{
		id: 'code-review-swarm',
		name: 'Code Review Swarm',
		category: 'github-repository',
		description: 'Collaborative code review swarm with multiple specialized reviewers',
		capabilities: ['Multi-perspective review', 'Security review', 'Performance review', 'Style review', 'Architecture review'],
		bestPairedWith: ['pr-manager', 'reviewer', 'security-auditor'],
		useCases: ['Comprehensive reviews', 'Critical PRs', 'Security-sensitive changes', 'Architecture changes'],
		complexity: 'advanced',
		icon: 'Users2',
		keywords: ['review', 'swarm', 'collaborative', 'multi-reviewer', 'code']
	},
	{
		id: 'issue-tracker',
		name: 'Issue Tracker',
		category: 'github-repository',
		description: 'GitHub issue management agent for triaging, labeling, and tracking issues',
		capabilities: ['Issue triaging', 'Label management', 'Priority assignment', 'Duplicate detection', 'Issue linking'],
		bestPairedWith: ['planner', 'researcher'],
		useCases: ['Issue triage', 'Bug tracking', 'Feature requests', 'Issue organization'],
		complexity: 'basic',
		icon: 'CircleDot',
		keywords: ['issue', 'bug', 'track', 'triage', 'label']
	},
	{
		id: 'release-manager',
		name: 'Release Manager',
		category: 'github-repository',
		description: 'Release orchestration agent for versioning, changelogs, and deployment',
		capabilities: ['Semantic versioning', 'Changelog generation', 'Release notes', 'Tag management', 'Deployment coordination'],
		bestPairedWith: ['pr-manager', 'cicd-engineer'],
		useCases: ['Release automation', 'Version management', 'Changelog creation', 'Deployment orchestration'],
		complexity: 'intermediate',
		icon: 'Rocket',
		keywords: ['release', 'version', 'changelog', 'deploy', 'tag']
	},
	{
		id: 'workflow-automation',
		name: 'Workflow Automation',
		category: 'github-repository',
		description: 'GitHub Actions and workflow automation agent',
		capabilities: ['Workflow creation', 'Action development', 'CI/CD pipelines', 'Automation triggers', 'Matrix builds'],
		bestPairedWith: ['cicd-engineer', 'release-manager'],
		useCases: ['CI/CD setup', 'Workflow automation', 'Custom actions', 'Build matrices'],
		complexity: 'intermediate',
		icon: 'Workflow',
		keywords: ['workflow', 'actions', 'automation', 'ci', 'cd']
	},
	{
		id: 'project-board-sync',
		name: 'Project Board Sync',
		category: 'github-repository',
		description: 'Synchronization agent for GitHub Projects and external tools',
		capabilities: ['Board sync', 'Card management', 'Status updates', 'Field mapping', 'Automation rules'],
		bestPairedWith: ['issue-tracker', 'planner'],
		useCases: ['Project sync', 'Board automation', 'Status tracking', 'Tool integration'],
		complexity: 'intermediate',
		icon: 'Kanban',
		keywords: ['project', 'board', 'sync', 'kanban', 'cards']
	},
	{
		id: 'repo-architect',
		name: 'Repository Architect',
		category: 'github-repository',
		description: 'Repository structure and organization agent',
		capabilities: ['Monorepo design', 'Branch strategies', 'CODEOWNERS setup', 'Template creation', 'Repository policies'],
		bestPairedWith: ['architect', 'security-architect'],
		useCases: ['Repo setup', 'Monorepo organization', 'Branch policies', 'Template repos'],
		complexity: 'intermediate',
		icon: 'FolderTree',
		keywords: ['repository', 'monorepo', 'structure', 'organization', 'branch']
	},
	{
		id: 'multi-repo-swarm',
		name: 'Multi-Repo Swarm',
		category: 'github-repository',
		description: 'Coordinator for changes spanning multiple repositories',
		capabilities: ['Cross-repo changes', 'Dependency updates', 'Synchronized releases', 'Breaking change coordination', 'Migration planning'],
		bestPairedWith: ['repo-architect', 'release-manager'],
		useCases: ['Multi-repo updates', 'Breaking changes', 'Dependency bumps', 'Coordinated releases'],
		complexity: 'advanced',
		icon: 'GitFork',
		keywords: ['multi-repo', 'cross-repo', 'dependency', 'coordinate', 'sync']
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// SPARC METHODOLOGY AGENTS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: 'sparc-coord',
		name: 'SPARC Coordinator',
		category: 'sparc-methodology',
		description: 'Main coordinator for SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology',
		capabilities: ['SPARC orchestration', 'Phase management', 'Quality gates', 'Iteration control', 'Deliverable tracking'],
		bestPairedWith: ['specification', 'pseudocode', 'architecture'],
		useCases: ['SPARC projects', 'Structured development', 'Quality-focused delivery', 'Iterative refinement'],
		complexity: 'advanced',
		icon: 'Compass',
		keywords: ['sparc', 'methodology', 'coordinate', 'phase', 'structured']
	},
	{
		id: 'specification',
		name: 'Specification Agent',
		category: 'sparc-methodology',
		description: 'Requirements specification agent for the S phase of SPARC',
		capabilities: ['Requirements gathering', 'Acceptance criteria', 'User stories', 'Constraint definition', 'Scope management'],
		bestPairedWith: ['sparc-coord', 'researcher'],
		useCases: ['Requirements docs', 'User stories', 'Acceptance criteria', 'Scope definition'],
		complexity: 'intermediate',
		icon: 'ClipboardList',
		keywords: ['specification', 'requirements', 'scope', 'acceptance', 'criteria']
	},
	{
		id: 'pseudocode',
		name: 'Pseudocode Agent',
		category: 'sparc-methodology',
		description: 'Pseudocode generation agent for the P phase of SPARC',
		capabilities: ['Pseudocode writing', 'Algorithm design', 'Logic flow', 'Edge case identification', 'Complexity analysis'],
		bestPairedWith: ['sparc-coord', 'architecture'],
		useCases: ['Algorithm design', 'Logic planning', 'Code blueprint', 'Complexity analysis'],
		complexity: 'intermediate',
		icon: 'FileCode',
		keywords: ['pseudocode', 'algorithm', 'logic', 'design', 'blueprint']
	},
	{
		id: 'sparc-architecture',
		name: 'SPARC Architecture',
		category: 'sparc-methodology',
		description: 'Architecture design agent for the A phase of SPARC',
		capabilities: ['System design', 'Component architecture', 'Interface definition', 'Pattern selection', 'Scalability planning'],
		bestPairedWith: ['sparc-coord', 'pseudocode', 'architect'],
		useCases: ['Architecture phase', 'System design', 'Component planning', 'Interface contracts'],
		complexity: 'advanced',
		icon: 'Blocks',
		keywords: ['architecture', 'sparc', 'design', 'component', 'system']
	},
	{
		id: 'refinement',
		name: 'Refinement Agent',
		category: 'sparc-methodology',
		description: 'Iterative refinement agent for the R phase of SPARC',
		capabilities: ['Code refinement', 'Optimization', 'Quality improvement', 'Technical debt reduction', 'Performance tuning'],
		bestPairedWith: ['sparc-coord', 'reviewer'],
		useCases: ['Code refinement', 'Optimization', 'Quality improvement', 'Debt reduction'],
		complexity: 'intermediate',
		icon: 'RefreshCw',
		keywords: ['refinement', 'optimize', 'improve', 'iterate', 'polish']
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// TESTING & VALIDATION AGENTS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: 'tdd-london-swarm',
		name: 'TDD London Swarm',
		category: 'testing-validation',
		description: 'Test-Driven Development swarm following London/Mockist style',
		capabilities: ['Outside-in TDD', 'Mock-based testing', 'Behavior verification', 'Contract testing', 'Isolation testing'],
		bestPairedWith: ['tester', 'coder'],
		useCases: ['TDD projects', 'Behavior-driven design', 'Mock-heavy testing', 'Contract verification'],
		complexity: 'advanced',
		icon: 'FlaskConical',
		keywords: ['tdd', 'london', 'mock', 'behavior', 'outside-in']
	},
	{
		id: 'production-validator',
		name: 'Production Validator',
		category: 'testing-validation',
		description: 'Production readiness validation agent',
		capabilities: ['Production checks', 'Health verification', 'Rollback testing', 'Smoke tests', 'Canary validation'],
		bestPairedWith: ['tester', 'release-manager'],
		useCases: ['Pre-production validation', 'Deployment verification', 'Rollback testing', 'Health checks'],
		complexity: 'advanced',
		icon: 'CheckCircle2',
		keywords: ['production', 'validate', 'deployment', 'health', 'smoke']
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// SPECIALIZED DEVELOPMENT AGENTS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: 'backend-dev',
		name: 'Backend Developer',
		category: 'specialized-dev',
		description: 'Backend-focused development agent for servers, APIs, and databases',
		capabilities: ['API development', 'Database design', 'Server logic', 'Authentication', 'Background jobs'],
		bestPairedWith: ['coder', 'architect'],
		useCases: ['API development', 'Server-side logic', 'Database work', 'Backend services'],
		complexity: 'intermediate',
		icon: 'Server',
		keywords: ['backend', 'api', 'server', 'database', 'rest']
	},
	{
		id: 'mobile-dev',
		name: 'Mobile Developer',
		category: 'specialized-dev',
		description: 'Mobile app development agent for iOS, Android, and cross-platform',
		capabilities: ['iOS development', 'Android development', 'React Native', 'Flutter', 'Mobile UI'],
		bestPairedWith: ['coder', 'tester'],
		useCases: ['Mobile apps', 'Cross-platform', 'Native development', 'Mobile UI/UX'],
		complexity: 'intermediate',
		icon: 'Smartphone',
		keywords: ['mobile', 'ios', 'android', 'react-native', 'flutter']
	},
	{
		id: 'ml-developer',
		name: 'ML Developer',
		category: 'specialized-dev',
		description: 'Machine learning development agent for models, training, and inference',
		capabilities: ['Model development', 'Training pipelines', 'Feature engineering', 'Model deployment', 'MLOps'],
		bestPairedWith: ['researcher', 'performance-engineer'],
		useCases: ['ML models', 'Training pipelines', 'Model deployment', 'Feature engineering'],
		complexity: 'advanced',
		icon: 'BrainCircuit',
		keywords: ['ml', 'machine-learning', 'ai', 'model', 'training']
	},
	{
		id: 'cicd-engineer',
		name: 'CI/CD Engineer',
		category: 'specialized-dev',
		description: 'CI/CD pipeline and DevOps automation agent',
		capabilities: ['Pipeline creation', 'Build optimization', 'Deployment automation', 'Infrastructure as code', 'Monitoring setup'],
		bestPairedWith: ['workflow-automation', 'release-manager'],
		useCases: ['CI/CD pipelines', 'DevOps automation', 'Build optimization', 'Infrastructure'],
		complexity: 'intermediate',
		icon: 'Container',
		keywords: ['cicd', 'devops', 'pipeline', 'deploy', 'infrastructure']
	},
	{
		id: 'system-architect',
		name: 'System Architect',
		category: 'specialized-dev',
		description: 'Large-scale system architecture agent for distributed systems',
		capabilities: ['Distributed systems', 'Microservices', 'Event-driven architecture', 'System integration', 'Scalability design'],
		bestPairedWith: ['architect', 'performance-engineer'],
		useCases: ['Distributed systems', 'Microservices', 'System design', 'Integration architecture'],
		complexity: 'advanced',
		icon: 'Layers',
		keywords: ['system', 'distributed', 'microservices', 'scale', 'architecture']
	},
	{
		id: 'code-analyzer',
		name: 'Code Analyzer',
		category: 'specialized-dev',
		description: 'Static code analysis agent for quality metrics and code health',
		capabilities: ['Static analysis', 'Code metrics', 'Dependency analysis', 'Complexity measurement', 'Code smells detection'],
		bestPairedWith: ['reviewer', 'refinement'],
		useCases: ['Code quality', 'Static analysis', 'Metrics reporting', 'Technical debt assessment'],
		complexity: 'intermediate',
		icon: 'BarChart3',
		keywords: ['analyze', 'static', 'metrics', 'quality', 'complexity']
	},
	{
		id: 'base-template-generator',
		name: 'Template Generator',
		category: 'specialized-dev',
		description: 'Code template and boilerplate generation agent',
		capabilities: ['Template creation', 'Scaffold generation', 'Boilerplate code', 'Project initialization', 'Pattern templates'],
		bestPairedWith: ['architect', 'coder'],
		useCases: ['Project scaffolding', 'Template creation', 'Boilerplate generation', 'Pattern templates'],
		complexity: 'basic',
		icon: 'FileCode2',
		keywords: ['template', 'scaffold', 'boilerplate', 'generate', 'init']
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// PERFORMANCE & OPTIMIZATION AGENTS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: 'perf-analyzer',
		name: 'Performance Analyzer',
		category: 'performance-optimization',
		description: 'Performance analysis agent for profiling and bottleneck identification',
		capabilities: ['Performance profiling', 'Bottleneck detection', 'Flame graphs', 'Heap analysis', 'CPU profiling'],
		bestPairedWith: ['performance-engineer', 'memory-specialist'],
		useCases: ['Performance debugging', 'Profiling', 'Bottleneck analysis', 'Resource usage'],
		complexity: 'advanced',
		icon: 'Activity',
		keywords: ['performance', 'profile', 'bottleneck', 'flame', 'analyze']
	},
	{
		id: 'performance-benchmarker',
		name: 'Performance Benchmarker',
		category: 'performance-optimization',
		description: 'Benchmarking agent for performance regression testing',
		capabilities: ['Benchmark creation', 'Regression detection', 'Comparison analysis', 'Statistical analysis', 'Trend tracking'],
		bestPairedWith: ['perf-analyzer', 'tester'],
		useCases: ['Benchmarking', 'Performance regression', 'Comparison testing', 'Trend analysis'],
		complexity: 'intermediate',
		icon: 'Timer',
		keywords: ['benchmark', 'regression', 'comparison', 'measure', 'track']
	},
	{
		id: 'task-orchestrator',
		name: 'Task Orchestrator',
		category: 'performance-optimization',
		description: 'Task scheduling and orchestration optimization agent',
		capabilities: ['Task scheduling', 'Priority queuing', 'Resource allocation', 'Concurrency control', 'Throughput optimization'],
		bestPairedWith: ['coordinator', 'performance-engineer'],
		useCases: ['Task scheduling', 'Queue optimization', 'Resource management', 'Concurrency'],
		complexity: 'advanced',
		icon: 'ListOrdered',
		keywords: ['orchestrate', 'schedule', 'queue', 'priority', 'throughput']
	},
	{
		id: 'memory-coordinator',
		name: 'Memory Coordinator',
		category: 'performance-optimization',
		description: 'Memory management and coordination agent for multi-agent systems',
		capabilities: ['Memory allocation', 'Garbage collection tuning', 'Memory pooling', 'Leak prevention', 'Memory monitoring'],
		bestPairedWith: ['memory-specialist', 'swarm-memory-manager'],
		useCases: ['Memory management', 'GC tuning', 'Memory pools', 'Leak detection'],
		complexity: 'advanced',
		icon: 'HardDrive',
		keywords: ['memory', 'gc', 'allocation', 'pool', 'monitor']
	},
	{
		id: 'smart-agent',
		name: 'Smart Agent',
		category: 'performance-optimization',
		description: 'AI-enhanced decision-making agent for adaptive optimization',
		capabilities: ['Adaptive learning', 'Decision optimization', 'Pattern recognition', 'Predictive analysis', 'Self-improvement'],
		bestPairedWith: ['collective-intelligence-coordinator', 'ml-developer'],
		useCases: ['Adaptive systems', 'AI decisions', 'Pattern learning', 'Self-optimization'],
		complexity: 'advanced',
		icon: 'Lightbulb',
		keywords: ['smart', 'ai', 'adaptive', 'learn', 'predict']
	}
];

/**
 * Get agents by category
 */
export function getAgentsByCategory(category: string): AgentTypeDefinition[] {
	return AGENT_CATALOG.filter(agent => agent.category === category);
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): AgentTypeDefinition | undefined {
	return AGENT_CATALOG.find(agent => agent.id === id);
}

/**
 * Search agents by query
 */
export function searchAgents(query: string): AgentTypeDefinition[] {
	const lowerQuery = query.toLowerCase();
	return AGENT_CATALOG.filter(agent =>
		agent.name.toLowerCase().includes(lowerQuery) ||
		agent.description.toLowerCase().includes(lowerQuery) ||
		agent.keywords?.some(k => k.includes(lowerQuery)) ||
		agent.capabilities.some(c => c.toLowerCase().includes(lowerQuery))
	);
}

/**
 * Get category statistics
 */
export function getCategoryStats(): Record<string, number> {
	return AGENT_CATALOG.reduce((acc, agent) => {
		acc[agent.category] = (acc[agent.category] || 0) + 1;
		return acc;
	}, {} as Record<string, number>);
}
