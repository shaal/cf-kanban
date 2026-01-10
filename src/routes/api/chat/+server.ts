/**
 * Chat API Route
 * GAP-8.1: AI Chat Assistant
 *
 * Handles chat messages with intent classification and contextual responses.
 * Provides:
 * - Capabilities exploration ("What can I do?")
 * - Agent/hook/worker explanations
 * - Conversational ticket creation
 * - Configuration suggestions
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AGENT_CATALOG, getAgentById, searchAgents } from '$lib/server/agents/agent-catalog-data';
import { HOOKS_DATA, WORKERS_DATA } from '$lib/components/command/command-data';

/**
 * Intent types for classification
 */
type MessageIntent =
	| 'capabilities'
	| 'explanation'
	| 'ticket_creation'
	| 'configuration'
	| 'general'
	| 'navigation';

/**
 * Ticket creation step tracking
 */
type TicketStep =
	| 'idle'
	| 'collecting_title'
	| 'collecting_description'
	| 'collecting_priority'
	| 'confirming'
	| 'created';

interface TicketCreationState {
	title?: string;
	description?: string;
	priority?: string;
	labels?: string[];
	projectId?: string;
	step: TicketStep;
}

interface ChatRequest {
	message: string;
	ticketCreation?: TicketCreationState;
	context?: {
		currentProjectId?: string;
		currentPage?: string;
	};
}

interface ChatResponse {
	content: string;
	intent: MessageIntent;
	ticketCreation?: TicketCreationState;
	metadata?: {
		ticketId?: string;
		agentId?: string;
		hookId?: string;
		workerId?: string;
		suggestions?: string[];
	};
}

/**
 * Classify the intent of a user message
 */
function classifyIntent(message: string, ticketState?: TicketCreationState): MessageIntent {
	const lower = message.toLowerCase();

	// If in ticket creation flow, stay in that intent
	if (ticketState && ticketState.step !== 'idle' && ticketState.step !== 'created') {
		return 'ticket_creation';
	}

	// Capabilities questions
	if (
		lower.includes('what can') ||
		lower.includes('help me') ||
		lower.includes('what do you do') ||
		lower.includes('capabilities') ||
		lower.includes('features') ||
		lower.includes('what are the')
	) {
		return 'capabilities';
	}

	// Explanation requests
	if (
		lower.includes('explain') ||
		lower.includes('what is') ||
		lower.includes("what's") ||
		lower.includes('tell me about') ||
		lower.includes('how does') ||
		lower.includes('describe')
	) {
		return 'explanation';
	}

	// Ticket creation triggers
	if (
		lower.includes('create ticket') ||
		lower.includes('new ticket') ||
		lower.includes('add ticket') ||
		lower.includes('create a task') ||
		lower.includes('new task') ||
		lower.includes('create issue') ||
		lower.includes('log a bug') ||
		lower.includes('report a bug')
	) {
		return 'ticket_creation';
	}

	// Configuration questions
	if (
		lower.includes('configure') ||
		lower.includes('setup') ||
		lower.includes('settings') ||
		lower.includes('optimal') ||
		lower.includes('best practice') ||
		lower.includes('recommend')
	) {
		return 'configuration';
	}

	// Navigation help
	if (
		lower.includes('where') ||
		lower.includes('navigate') ||
		lower.includes('find') ||
		lower.includes('go to') ||
		lower.includes('how do i get to')
	) {
		return 'navigation';
	}

	return 'general';
}

/**
 * Handle capabilities questions
 */
function handleCapabilities(message: string): ChatResponse {
	const lower = message.toLowerCase();

	// Specific capability queries
	if (lower.includes('agent')) {
		const categories = [...new Set(AGENT_CATALOG.map((a) => a.category))];
		return {
			content:
				`Claude Flow provides ${AGENT_CATALOG.length}+ specialized agents organized into these categories:\n\n` +
				categories
					.map((cat) => {
						const count = AGENT_CATALOG.filter((a) => a.category === cat).length;
						const label = cat
							.split('-')
							.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
							.join(' ');
						return `- **${label}** (${count} agents)`;
					})
					.join('\n') +
				'\n\nAsk me about any specific agent type for more details!',
			intent: 'capabilities',
			metadata: {
				suggestions: ['Tell me about the coder agent', 'What is a security-architect?', 'Explain swarm coordination agents']
			}
		};
	}

	if (lower.includes('hook')) {
		const categories = [...new Set(HOOKS_DATA.map((h) => h.category))];
		return {
			content:
				`Claude Flow includes ${HOOKS_DATA.length} hooks for extending behavior:\n\n` +
				categories
					.map((cat) => {
						const hooks = HOOKS_DATA.filter((h) => h.category === cat);
						return `**${cat}**:\n${hooks.map((h) => `  - \`${h.name}\`: ${h.description}`).join('\n')}`;
					})
					.join('\n\n') +
				'\n\nHooks let you intercept and enhance Claude Flow operations.',
			intent: 'capabilities',
			metadata: {
				suggestions: ['Explain the pre-task hook', 'What does session-start do?', 'How do coverage hooks work?']
			}
		};
	}

	if (lower.includes('worker')) {
		return {
			content:
				`Claude Flow has ${WORKERS_DATA.length} background workers for automated tasks:\n\n` +
				WORKERS_DATA.map((w) => `- **${w.name}**: ${w.description}`).join('\n') +
				'\n\nWorkers run in the background to continuously improve your codebase.',
			intent: 'capabilities',
			metadata: {
				suggestions: ['Tell me about the optimize worker', 'What does the audit worker do?', 'How does ultralearn work?']
			}
		};
	}

	// General capabilities overview
	return {
		content:
			'Claude Flow V3 provides a powerful AI-powered development system with:\n\n' +
			`**Agents** (${AGENT_CATALOG.length}+ types)\n` +
			'Specialized AI agents for coding, testing, security, architecture, and more.\n\n' +
			`**Hooks** (${HOOKS_DATA.length} available)\n` +
			'Intercept and enhance operations like file edits, commands, and tasks.\n\n' +
			`**Workers** (${WORKERS_DATA.length} background processes)\n` +
			'Automated processes for optimization, auditing, testing, and documentation.\n\n' +
			'**Key Features**:\n' +
			'- Multi-agent swarm coordination\n' +
			'- Neural pattern learning\n' +
			'- Memory-enhanced development\n' +
			'- Real-time Kanban tracking\n\n' +
			'What would you like to explore further?',
		intent: 'capabilities',
		metadata: {
			suggestions: ['Tell me about agents', 'What hooks are available?', 'How do workers help?', 'Create a ticket']
		}
	};
}

/**
 * Handle explanation requests
 */
function handleExplanation(message: string): ChatResponse {
	const lower = message.toLowerCase();

	// Check for specific agent mentions
	for (const agent of AGENT_CATALOG) {
		if (lower.includes(agent.id.toLowerCase()) || lower.includes(agent.name.toLowerCase())) {
			return {
				content:
					`**${agent.name}**\n\n` +
					`${agent.description}\n\n` +
					`**Category**: ${agent.category.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\n` +
					`**Capabilities**:\n${agent.capabilities.map((c) => `- ${c}`).join('\n')}\n\n` +
					`**Best Paired With**: ${agent.bestPairedWith.map((id) => getAgentById(id)?.name || id).join(', ')}\n\n` +
					`**Use Cases**:\n${agent.useCases.map((u) => `- ${u}`).join('\n')}\n\n` +
					`**Complexity**: ${agent.complexity.charAt(0).toUpperCase() + agent.complexity.slice(1)}`,
				intent: 'explanation',
				metadata: {
					agentId: agent.id,
					suggestions: agent.bestPairedWith.map((id) => `Tell me about ${id}`)
				}
			};
		}
	}

	// Check for specific hook mentions
	for (const hook of HOOKS_DATA) {
		if (lower.includes(hook.name.toLowerCase()) || lower.includes(hook.id.replace('hook-', ''))) {
			return {
				content:
					`**${hook.name}** Hook\n\n` +
					`${hook.description}\n\n` +
					`**Category**: ${hook.category}\n\n` +
					`**Usage**:\n\`\`\`bash\nnpx @claude-flow/cli@latest hooks ${hook.name} [options]\n\`\`\`\n\n` +
					`**Keywords**: ${hook.keywords.join(', ')}`,
				intent: 'explanation',
				metadata: {
					hookId: hook.id,
					suggestions: ['What other hooks are available?', 'How do I use hooks in my workflow?']
				}
			};
		}
	}

	// Check for specific worker mentions
	for (const worker of WORKERS_DATA) {
		if (lower.includes(worker.name.toLowerCase()) || lower.includes(worker.id.replace('worker-', ''))) {
			return {
				content:
					`**${worker.name}** Worker\n\n` +
					`${worker.description}\n\n` +
					`**Category**: ${worker.category}\n\n` +
					`**To dispatch**:\n\`\`\`bash\nnpx @claude-flow/cli@latest hooks worker dispatch --trigger ${worker.name}\n\`\`\`\n\n` +
					`**Keywords**: ${worker.keywords.join(', ')}`,
				intent: 'explanation',
				metadata: {
					workerId: worker.id,
					suggestions: ['What other workers are available?', 'How do workers run automatically?']
				}
			};
		}
	}

	// Search agents if no exact match
	const searchTerms = message.replace(/explain|what is|what's|tell me about|how does|describe/gi, '').trim();
	if (searchTerms.length > 2) {
		const matches = searchAgents(searchTerms);
		if (matches.length > 0) {
			const agent = matches[0];
			return {
				content:
					`I found **${agent.name}** which might be what you're looking for:\n\n` +
					`${agent.description}\n\n` +
					`**Capabilities**: ${agent.capabilities.join(', ')}\n\n` +
					`Would you like more details about this agent?`,
				intent: 'explanation',
				metadata: {
					agentId: agent.id,
					suggestions: [`Tell me more about ${agent.name}`, 'Show me similar agents']
				}
			};
		}
	}

	return {
		content:
			"I'm not sure what you'd like me to explain. I can tell you about:\n\n" +
			'- **Agents**: Specialized AI workers (e.g., "explain the coder agent")\n' +
			'- **Hooks**: Extension points (e.g., "what is the pre-task hook?")\n' +
			'- **Workers**: Background processes (e.g., "tell me about the audit worker")\n\n' +
			'What would you like to learn about?',
		intent: 'explanation',
		metadata: {
			suggestions: ['What is a coder agent?', 'Explain the security-auditor', 'What does the optimize worker do?']
		}
	};
}

/**
 * Handle ticket creation flow
 */
function handleTicketCreation(
	message: string,
	ticketState: TicketCreationState,
	context?: { currentProjectId?: string }
): ChatResponse {
	const lower = message.toLowerCase();

	// Cancel ticket creation
	if (lower === 'cancel' || lower === 'nevermind' || lower === 'stop') {
		return {
			content: 'No problem! Ticket creation cancelled. What else can I help you with?',
			intent: 'ticket_creation',
			ticketCreation: { step: 'idle' }
		};
	}

	switch (ticketState.step) {
		case 'idle':
			// Starting ticket creation
			return {
				content:
					"Let's create a ticket! What should the title be?\n\n" +
					'(You can say "cancel" at any time to stop)',
				intent: 'ticket_creation',
				ticketCreation: {
					...ticketState,
					step: 'collecting_title',
					projectId: context?.currentProjectId
				}
			};

		case 'collecting_title':
			return {
				content: `Great! The title will be: "${message}"\n\nNow, provide a description (or say "skip" to leave it empty):`,
				intent: 'ticket_creation',
				ticketCreation: {
					...ticketState,
					title: message,
					step: 'collecting_description'
				}
			};

		case 'collecting_description':
			const description = lower === 'skip' ? undefined : message;
			return {
				content:
					'What priority should this ticket have?\n\n' +
					'- **LOW**: Minor issue, no rush\n' +
					'- **MEDIUM**: Normal priority (default)\n' +
					'- **HIGH**: Important, needs attention soon\n' +
					'- **CRITICAL**: Urgent, needs immediate action',
				intent: 'ticket_creation',
				ticketCreation: {
					...ticketState,
					description,
					step: 'collecting_priority'
				}
			};

		case 'collecting_priority':
			const priorityMap: Record<string, string> = {
				low: 'LOW',
				medium: 'MEDIUM',
				high: 'HIGH',
				critical: 'CRITICAL'
			};
			const priority = priorityMap[lower] || 'MEDIUM';

			const confirmContent =
				`Please confirm the ticket details:\n\n` +
				`**Title**: ${ticketState.title}\n` +
				`**Description**: ${ticketState.description || '(none)'}\n` +
				`**Priority**: ${priority}\n\n` +
				'Type "confirm" to create or "cancel" to abort.';

			return {
				content: confirmContent,
				intent: 'ticket_creation',
				ticketCreation: {
					...ticketState,
					priority,
					step: 'confirming'
				}
			};

		case 'confirming':
			if (lower === 'confirm' || lower === 'yes' || lower === 'create') {
				// Return state for the client to make the actual API call
				return {
					content:
						'Creating your ticket now...\n\n' +
						`**Title**: ${ticketState.title}\n` +
						`**Description**: ${ticketState.description || '(none)'}\n` +
						`**Priority**: ${ticketState.priority}`,
					intent: 'ticket_creation',
					ticketCreation: {
						...ticketState,
						step: 'created'
					}
				};
			} else {
				return {
					content: 'Ticket creation cancelled. What else can I help you with?',
					intent: 'ticket_creation',
					ticketCreation: { step: 'idle' }
				};
			}

		default:
			return {
				content: "Let's start over. Would you like to create a new ticket?",
				intent: 'ticket_creation',
				ticketCreation: { step: 'idle' }
			};
	}
}

/**
 * Handle configuration suggestions
 */
function handleConfiguration(message: string): ChatResponse {
	const lower = message.toLowerCase();

	if (lower.includes('swarm') || lower.includes('topology')) {
		return {
			content:
				'**Swarm Topology Recommendations**\n\n' +
				'Choose based on your use case:\n\n' +
				'**Hierarchical** - For structured teams with clear leadership\n' +
				'Best for: Large projects, enterprise workflows\n\n' +
				'**Mesh** - For peer-to-peer collaboration\n' +
				'Best for: Distributed teams, democratic decisions\n\n' +
				'**Hierarchical-Mesh** (Recommended) - Hybrid approach\n' +
				'Best for: Most projects, balances structure and flexibility\n\n' +
				'**Adaptive** - Dynamic topology based on load\n' +
				'Best for: Variable workloads, auto-scaling needs',
			intent: 'configuration',
			metadata: {
				suggestions: [
					'How do I initialize a swarm?',
					'What agents work best together?',
					'Configure memory backend'
				]
			}
		};
	}

	if (lower.includes('agent') && (lower.includes('pair') || lower.includes('team') || lower.includes('together'))) {
		return {
			content:
				'**Agent Pairing Recommendations**\n\n' +
				'**For Features**:\n' +
				'coder + tester + reviewer (classic trio)\n\n' +
				'**For Security**:\n' +
				'security-architect + security-auditor + reviewer\n\n' +
				'**For Performance**:\n' +
				'performance-engineer + memory-specialist + coder\n\n' +
				'**For Complex Projects**:\n' +
				'coordinator + architect + multiple coders + tester + reviewer\n\n' +
				'**For SPARC Methodology**:\n' +
				'sparc-coord + specification + pseudocode + architecture + refinement',
			intent: 'configuration',
			metadata: {
				suggestions: ['Tell me about swarm topologies', 'What is SPARC methodology?', 'Show me all agent types']
			}
		};
	}

	return {
		content:
			'I can help you configure Claude Flow for optimal performance:\n\n' +
			'**Swarm Configuration**\n' +
			'Set up multi-agent topologies for your project\n\n' +
			'**Agent Pairing**\n' +
			'Choose the best agent combinations for your task\n\n' +
			'**Memory Backend**\n' +
			'Configure persistent memory for learning\n\n' +
			'**Performance Tuning**\n' +
			'Optimize for speed and resource usage\n\n' +
			'What would you like to configure?',
		intent: 'configuration',
		metadata: {
			suggestions: [
				'Recommend a swarm topology',
				'What agents should I use together?',
				'Configure for performance'
			]
		}
	};
}

/**
 * Handle navigation requests
 */
function handleNavigation(message: string): ChatResponse {
	const lower = message.toLowerCase();

	const navigationHelp: Record<string, { path: string; description: string }> = {
		kanban: { path: '/', description: 'Main Kanban board for ticket management' },
		board: { path: '/', description: 'Main Kanban board for ticket management' },
		memory: { path: '/learning/memory', description: 'View and search memory entries' },
		neural: { path: '/learning/neural', description: 'Neural training dashboard' },
		pattern: { path: '/learning/patterns', description: 'View learned patterns' },
		transfer: { path: '/learning/transfer', description: 'Transfer patterns between projects' },
		agent: { path: '/learning/agents', description: 'Browse the agent catalog' },
		hook: { path: '/learning/hooks', description: 'View available hooks' },
		worker: { path: '/learning/workers', description: 'View background workers' },
		admin: { path: '/admin', description: 'Admin dashboard' },
		user: { path: '/admin/users', description: 'User management' },
		project: { path: '/admin/projects', description: 'Project management' },
		setting: { path: '/admin/settings', description: 'System settings' },
		audit: { path: '/admin/audit', description: 'Audit logs' }
	};

	for (const [key, nav] of Object.entries(navigationHelp)) {
		if (lower.includes(key)) {
			return {
				content: `To access the **${key}** area:\n\nNavigate to \`${nav.path}\`\n\n${nav.description}\n\nYou can also use **Cmd+K** to open the command palette for quick navigation!`,
				intent: 'navigation',
				metadata: {
					suggestions: ['Show me all pages', 'How do I use the command palette?']
				}
			};
		}
	}

	return {
		content:
			'Here are the main areas of the application:\n\n' +
			'**Main**\n' +
			'- `/` - Kanban Board\n\n' +
			'**Learning**\n' +
			'- `/learning/memory` - Memory entries\n' +
			'- `/learning/neural` - Neural training\n' +
			'- `/learning/patterns` - Learned patterns\n' +
			'- `/learning/agents` - Agent catalog\n' +
			'- `/learning/hooks` - Available hooks\n' +
			'- `/learning/workers` - Background workers\n\n' +
			'**Admin**\n' +
			'- `/admin` - Dashboard\n' +
			'- `/admin/users` - User management\n' +
			'- `/admin/projects` - Projects\n\n' +
			'**Tip**: Press **Cmd+K** to open the command palette for quick navigation!',
		intent: 'navigation',
		metadata: {
			suggestions: ['Take me to agents', 'Open the Kanban board', 'Show admin settings']
		}
	};
}

/**
 * Handle general messages
 */
function handleGeneral(message: string): ChatResponse {
	const lower = message.toLowerCase();

	// Greetings
	if (lower.match(/^(hi|hello|hey|greetings)/)) {
		return {
			content:
				'Hello! I\'m your Claude Flow assistant. How can I help you today?\n\n' +
				'I can:\n' +
				'- Explain agents, hooks, and workers\n' +
				'- Help you create tickets\n' +
				'- Suggest configurations\n' +
				'- Navigate the application',
			intent: 'general',
			metadata: {
				suggestions: ['What can you do?', 'Create a ticket', 'Tell me about agents']
			}
		};
	}

	// Thanks
	if (lower.match(/^(thanks|thank you|thx)/)) {
		return {
			content: "You're welcome! Let me know if you need anything else.",
			intent: 'general'
		};
	}

	// Default response
	return {
		content:
			"I'm not sure I understand. I can help you with:\n\n" +
			'- **Capabilities**: "What can Claude Flow do?"\n' +
			'- **Explanations**: "Tell me about the coder agent"\n' +
			'- **Ticket Creation**: "Create a new ticket"\n' +
			'- **Configuration**: "Recommend a swarm topology"\n' +
			'- **Navigation**: "Where is the agent catalog?"\n\n' +
			'What would you like to know?',
		intent: 'general',
		metadata: {
			suggestions: ['What can you do?', 'Create a ticket', 'Explain agents']
		}
	};
}

/**
 * POST /api/chat
 * Process a chat message and return a response
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: ChatRequest = await request.json();
		const { message, ticketCreation, context } = body;

		if (!message || typeof message !== 'string') {
			return json({ error: 'Message is required' }, { status: 400 });
		}

		// Classify intent
		const intent = classifyIntent(message, ticketCreation);

		// Route to appropriate handler
		let response: ChatResponse;

		switch (intent) {
			case 'capabilities':
				response = handleCapabilities(message);
				break;
			case 'explanation':
				response = handleExplanation(message);
				break;
			case 'ticket_creation':
				response = handleTicketCreation(message, ticketCreation || { step: 'idle' }, context);
				break;
			case 'configuration':
				response = handleConfiguration(message);
				break;
			case 'navigation':
				response = handleNavigation(message);
				break;
			default:
				response = handleGeneral(message);
		}

		return json(response);
	} catch (err) {
		console.error('Chat API error:', err);
		return json({ error: 'Failed to process message' }, { status: 500 });
	}
};
