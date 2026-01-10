/**
 * GAP-3.1.1: Project Templates Seed Data
 *
 * Seeds the database with pre-configured project templates for common use cases.
 * Run with: npx tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Project template definitions
 */
const templates = [
  {
    slug: 'web-app',
    name: 'Web Application',
    description: 'Full-stack web application development with code, testing, and review agents for building modern web apps.',
    category: 'development',
    icon: 'globe',
    sortOrder: 1,
    swarmConfig: {
      agents: [
        { type: 'coder', role: 'worker', priority: 10 },
        { type: 'tester', role: 'worker', priority: 8 },
        { type: 'reviewer', role: 'worker', priority: 7 }
      ],
      topology: 'mesh',
      maxAgents: 5,
      hiveMind: false,
      options: {
        autoSpawnOnTicket: true,
        requireReviewBeforeDone: true
      }
    }
  },
  {
    slug: 'security-audit',
    name: 'Security Audit',
    description: 'Comprehensive security analysis with specialized security architects and auditors for vulnerability assessment.',
    category: 'security',
    icon: 'shield',
    sortOrder: 2,
    swarmConfig: {
      agents: [
        { type: 'security-architect', role: 'coordinator', priority: 10 },
        { type: 'security-auditor', role: 'worker', priority: 9 }
      ],
      topology: 'hierarchical',
      maxAgents: 4,
      hiveMind: true,
      options: {
        autoSpawnOnTicket: true,
        requireSecurityReview: true,
        scanForVulnerabilities: true
      }
    }
  },
  {
    slug: 'documentation',
    name: 'Documentation',
    description: 'Technical documentation generation with research and API documentation agents for comprehensive docs.',
    category: 'documentation',
    icon: 'book-open',
    sortOrder: 3,
    swarmConfig: {
      agents: [
        { type: 'researcher', role: 'worker', priority: 10 },
        { type: 'api-docs', role: 'worker', priority: 9 }
      ],
      topology: 'mesh',
      maxAgents: 3,
      hiveMind: false,
      options: {
        autoSpawnOnTicket: true,
        generateMarkdown: true,
        includeExamples: true
      }
    }
  },
  {
    slug: 'api-development',
    name: 'API Development',
    description: 'Backend API development with architecture design, coding, testing, and documentation agents.',
    category: 'development',
    icon: 'server',
    sortOrder: 4,
    swarmConfig: {
      agents: [
        { type: 'architect', role: 'coordinator', priority: 10 },
        { type: 'coder', role: 'worker', priority: 9 },
        { type: 'tester', role: 'worker', priority: 8 },
        { type: 'api-docs', role: 'worker', priority: 7 }
      ],
      topology: 'hierarchical',
      maxAgents: 6,
      hiveMind: false,
      options: {
        autoSpawnOnTicket: true,
        generateOpenAPISpec: true,
        requireTests: true
      }
    }
  },
  {
    slug: 'ml-pipeline',
    name: 'ML/AI Pipeline',
    description: 'Machine learning and AI development with research, coding, and testing agents for data science workflows.',
    category: 'development',
    icon: 'brain',
    sortOrder: 5,
    swarmConfig: {
      agents: [
        { type: 'researcher', role: 'coordinator', priority: 10 },
        { type: 'coder', role: 'worker', priority: 9 },
        { type: 'tester', role: 'worker', priority: 8 },
        { type: 'performance-engineer', role: 'worker', priority: 7 }
      ],
      topology: 'hierarchical',
      maxAgents: 6,
      hiveMind: true,
      options: {
        autoSpawnOnTicket: true,
        trackExperiments: true,
        optimizePerformance: true
      }
    }
  },
  {
    slug: 'refactoring',
    name: 'Code Refactoring',
    description: 'Code quality improvement with architecture review, refactoring, and testing agents for modernizing codebases.',
    category: 'maintenance',
    icon: 'refresh-cw',
    sortOrder: 6,
    swarmConfig: {
      agents: [
        { type: 'architect', role: 'coordinator', priority: 10 },
        { type: 'coder', role: 'worker', priority: 9 },
        { type: 'reviewer', role: 'worker', priority: 8 },
        { type: 'tester', role: 'worker', priority: 7 }
      ],
      topology: 'hierarchical',
      maxAgents: 5,
      hiveMind: false,
      options: {
        autoSpawnOnTicket: true,
        preserveTests: true,
        incrementalChanges: true
      }
    }
  },
  {
    slug: 'bug-fixing',
    name: 'Bug Fixing',
    description: 'Rapid bug investigation and resolution with research, coding, and testing agents for quick fixes.',
    category: 'maintenance',
    icon: 'bug',
    sortOrder: 7,
    swarmConfig: {
      agents: [
        { type: 'researcher', role: 'worker', priority: 10 },
        { type: 'coder', role: 'worker', priority: 9 },
        { type: 'tester', role: 'worker', priority: 8 }
      ],
      topology: 'mesh',
      maxAgents: 4,
      hiveMind: false,
      options: {
        autoSpawnOnTicket: true,
        rootCauseAnalysis: true,
        regressionTesting: true
      }
    }
  },
  {
    slug: 'performance-optimization',
    name: 'Performance Optimization',
    description: 'Performance analysis and optimization with specialized performance engineers and benchmarking agents.',
    category: 'maintenance',
    icon: 'zap',
    sortOrder: 8,
    swarmConfig: {
      agents: [
        { type: 'performance-engineer', role: 'coordinator', priority: 10 },
        { type: 'researcher', role: 'worker', priority: 9 },
        { type: 'coder', role: 'worker', priority: 8 }
      ],
      topology: 'hierarchical',
      maxAgents: 4,
      hiveMind: false,
      options: {
        autoSpawnOnTicket: true,
        benchmarkBefore: true,
        benchmarkAfter: true,
        profileCode: true
      }
    }
  },
  {
    slug: 'full-stack',
    name: 'Full Stack Enterprise',
    description: 'Complete enterprise development with coordinator, all core development agents, and quality assurance.',
    category: 'development',
    icon: 'layers',
    sortOrder: 9,
    swarmConfig: {
      agents: [
        { type: 'coordinator', role: 'coordinator', priority: 10 },
        { type: 'architect', role: 'worker', priority: 9 },
        { type: 'coder', role: 'worker', priority: 8 },
        { type: 'tester', role: 'worker', priority: 7 },
        { type: 'reviewer', role: 'worker', priority: 6 },
        { type: 'security-auditor', role: 'worker', priority: 5 }
      ],
      topology: 'hierarchical-mesh',
      maxAgents: 10,
      hiveMind: true,
      options: {
        autoSpawnOnTicket: true,
        requireReview: true,
        requireSecurityCheck: true,
        requireTests: true
      }
    }
  },
  {
    slug: 'minimal',
    name: 'Minimal / Custom',
    description: 'Start with a blank slate and configure your own agent setup. Best for unique or experimental workflows.',
    category: 'other',
    icon: 'settings',
    sortOrder: 100,
    swarmConfig: {
      agents: [],
      topology: 'single',
      maxAgents: 15,
      hiveMind: false,
      options: {
        autoSpawnOnTicket: false,
        customConfiguration: true
      }
    }
  }
];

async function main() {
  console.log('Seeding project templates...');

  for (const template of templates) {
    const result = await prisma.projectTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        category: template.category,
        icon: template.icon,
        sortOrder: template.sortOrder,
        swarmConfig: template.swarmConfig,
        isSystem: true,
        isActive: true
      },
      create: {
        slug: template.slug,
        name: template.name,
        description: template.description,
        category: template.category,
        icon: template.icon,
        sortOrder: template.sortOrder,
        swarmConfig: template.swarmConfig,
        isSystem: true,
        isActive: true
      }
    });

    console.log(`  - ${result.name} (${result.slug})`);
  }

  console.log(`\nSeeded ${templates.length} project templates.`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
