/**
 * Onboarding Store
 * GAP-8.3: Interactive Tutorials
 *
 * Manages onboarding state with localStorage persistence:
 * - First-visit detection
 * - Onboarding path selection
 * - Tour progress tracking
 * - Skip and defer functionality
 */

import { writable, derived, get } from 'svelte/store';

// Storage keys
const STORAGE_KEYS = {
	FIRST_VISIT: 'cf-kanban-first-visit',
	ONBOARDING_PATH: 'cf-kanban-onboarding-path',
	TOUR_PROGRESS: 'cf-kanban-tour-progress',
	ONBOARDING_COMPLETED: 'cf-kanban-onboarding-completed',
	REMIND_LATER: 'cf-kanban-remind-later'
} as const;

// Onboarding paths
export type OnboardingPath = 'quick-start' | 'full-tour' | 'ask-claude' | 'read-docs' | null;

// Tour step definition
export interface TourStep {
	id: string;
	target: string; // CSS selector for the element to highlight
	title: string;
	content: string;
	position: 'top' | 'bottom' | 'left' | 'right';
	action?: string; // Optional action button text
	actionHref?: string; // Optional action URL
}

// Tour progress state
export interface TourProgress {
	currentStepIndex: number;
	completedSteps: string[];
	path: OnboardingPath;
	startedAt: string;
	lastUpdatedAt: string;
}

// Full onboarding state
export interface OnboardingState {
	isFirstVisit: boolean;
	showWelcomeModal: boolean;
	selectedPath: OnboardingPath;
	isTourActive: boolean;
	tourProgress: TourProgress | null;
	isCompleted: boolean;
	remindLaterUntil: string | null;
}

// Default state
const defaultState: OnboardingState = {
	isFirstVisit: true,
	showWelcomeModal: false,
	selectedPath: null,
	isTourActive: false,
	tourProgress: null,
	isCompleted: false,
	remindLaterUntil: null
};

// Helper to check if we're in browser
const isBrowser = typeof window !== 'undefined';

// Load state from localStorage
function loadPersistedState(): Partial<OnboardingState> {
	if (!isBrowser) return {};

	try {
		const firstVisit = localStorage.getItem(STORAGE_KEYS.FIRST_VISIT);
		const onboardingPath = localStorage.getItem(STORAGE_KEYS.ONBOARDING_PATH) as OnboardingPath;
		const tourProgress = localStorage.getItem(STORAGE_KEYS.TOUR_PROGRESS);
		const completed = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
		const remindLater = localStorage.getItem(STORAGE_KEYS.REMIND_LATER);

		// Check if remind later has expired
		let remindLaterUntil: string | null = null;
		if (remindLater) {
			const remindDate = new Date(remindLater);
			if (remindDate > new Date()) {
				remindLaterUntil = remindLater;
			} else {
				localStorage.removeItem(STORAGE_KEYS.REMIND_LATER);
			}
		}

		return {
			isFirstVisit: firstVisit !== 'false',
			selectedPath: onboardingPath,
			tourProgress: tourProgress ? JSON.parse(tourProgress) : null,
			isCompleted: completed === 'true',
			remindLaterUntil
		};
	} catch {
		console.warn('Failed to load onboarding state from localStorage');
		return {};
	}
}

// Create the main store
function createOnboardingStore() {
	const persistedState = loadPersistedState();
	const initialState: OnboardingState = {
		...defaultState,
		...persistedState,
		// Show welcome modal if first visit and not completed and not reminded later
		showWelcomeModal:
			persistedState.isFirstVisit !== false &&
			!persistedState.isCompleted &&
			!persistedState.remindLaterUntil
	};

	const { subscribe, set, update } = writable<OnboardingState>(initialState);

	return {
		subscribe,

		// Initialize onboarding (call on mount)
		initialize: () => {
			update((state) => {
				const shouldShow =
					state.isFirstVisit && !state.isCompleted && !state.remindLaterUntil;
				return { ...state, showWelcomeModal: shouldShow };
			});
		},

		// Open welcome modal manually
		openWelcomeModal: () => {
			update((state) => ({ ...state, showWelcomeModal: true }));
		},

		// Close welcome modal
		closeWelcomeModal: () => {
			update((state) => ({ ...state, showWelcomeModal: false }));
		},

		// Select an onboarding path
		selectPath: (path: OnboardingPath) => {
			if (isBrowser && path) {
				localStorage.setItem(STORAGE_KEYS.ONBOARDING_PATH, path);
			}

			update((state) => ({
				...state,
				selectedPath: path,
				showWelcomeModal: false
			}));
		},

		// Start the tour
		startTour: (path: OnboardingPath = 'full-tour') => {
			const now = new Date().toISOString();
			const progress: TourProgress = {
				currentStepIndex: 0,
				completedSteps: [],
				path,
				startedAt: now,
				lastUpdatedAt: now
			};

			if (isBrowser) {
				localStorage.setItem(STORAGE_KEYS.FIRST_VISIT, 'false');
				localStorage.setItem(STORAGE_KEYS.TOUR_PROGRESS, JSON.stringify(progress));
			}

			update((state) => ({
				...state,
				isFirstVisit: false,
				isTourActive: true,
				tourProgress: progress,
				showWelcomeModal: false,
				selectedPath: path
			}));
		},

		// Advance to next tour step
		nextStep: (totalSteps: number) => {
			update((state) => {
				if (!state.tourProgress) return state;

				const newIndex = Math.min(state.tourProgress.currentStepIndex + 1, totalSteps - 1);
				const progress: TourProgress = {
					...state.tourProgress,
					currentStepIndex: newIndex,
					lastUpdatedAt: new Date().toISOString()
				};

				if (isBrowser) {
					localStorage.setItem(STORAGE_KEYS.TOUR_PROGRESS, JSON.stringify(progress));
				}

				return { ...state, tourProgress: progress };
			});
		},

		// Go to previous tour step
		prevStep: () => {
			update((state) => {
				if (!state.tourProgress) return state;

				const newIndex = Math.max(state.tourProgress.currentStepIndex - 1, 0);
				const progress: TourProgress = {
					...state.tourProgress,
					currentStepIndex: newIndex,
					lastUpdatedAt: new Date().toISOString()
				};

				if (isBrowser) {
					localStorage.setItem(STORAGE_KEYS.TOUR_PROGRESS, JSON.stringify(progress));
				}

				return { ...state, tourProgress: progress };
			});
		},

		// Go to specific step
		goToStep: (stepIndex: number) => {
			update((state) => {
				if (!state.tourProgress) return state;

				const progress: TourProgress = {
					...state.tourProgress,
					currentStepIndex: stepIndex,
					lastUpdatedAt: new Date().toISOString()
				};

				if (isBrowser) {
					localStorage.setItem(STORAGE_KEYS.TOUR_PROGRESS, JSON.stringify(progress));
				}

				return { ...state, tourProgress: progress };
			});
		},

		// Mark step as completed
		completeStep: (stepId: string) => {
			update((state) => {
				if (!state.tourProgress) return state;

				const completedSteps = [...state.tourProgress.completedSteps];
				if (!completedSteps.includes(stepId)) {
					completedSteps.push(stepId);
				}

				const progress: TourProgress = {
					...state.tourProgress,
					completedSteps,
					lastUpdatedAt: new Date().toISOString()
				};

				if (isBrowser) {
					localStorage.setItem(STORAGE_KEYS.TOUR_PROGRESS, JSON.stringify(progress));
				}

				return { ...state, tourProgress: progress };
			});
		},

		// Complete the tour/onboarding
		complete: () => {
			if (isBrowser) {
				localStorage.setItem(STORAGE_KEYS.FIRST_VISIT, 'false');
				localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
				localStorage.removeItem(STORAGE_KEYS.TOUR_PROGRESS);
			}

			update((state) => ({
				...state,
				isFirstVisit: false,
				isTourActive: false,
				tourProgress: null,
				isCompleted: true,
				showWelcomeModal: false
			}));
		},

		// Skip onboarding entirely
		skip: () => {
			if (isBrowser) {
				localStorage.setItem(STORAGE_KEYS.FIRST_VISIT, 'false');
				localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
			}

			update((state) => ({
				...state,
				isFirstVisit: false,
				isTourActive: false,
				tourProgress: null,
				isCompleted: true,
				showWelcomeModal: false
			}));
		},

		// Remind me later (defer for 24 hours)
		remindLater: (hours: number = 24) => {
			const remindDate = new Date();
			remindDate.setHours(remindDate.getHours() + hours);
			const remindLaterUntil = remindDate.toISOString();

			if (isBrowser) {
				localStorage.setItem(STORAGE_KEYS.REMIND_LATER, remindLaterUntil);
				localStorage.setItem(STORAGE_KEYS.FIRST_VISIT, 'false');
			}

			update((state) => ({
				...state,
				isFirstVisit: false,
				showWelcomeModal: false,
				remindLaterUntil
			}));
		},

		// Exit tour without completing
		exitTour: () => {
			update((state) => ({
				...state,
				isTourActive: false
			}));
		},

		// Resume tour from saved progress
		resumeTour: () => {
			update((state) => {
				if (state.tourProgress) {
					return { ...state, isTourActive: true, showWelcomeModal: false };
				}
				return state;
			});
		},

		// Reset all onboarding state
		reset: () => {
			if (isBrowser) {
				Object.values(STORAGE_KEYS).forEach((key) => {
					localStorage.removeItem(key);
				});
			}

			set({
				...defaultState,
				showWelcomeModal: true
			});
		}
	};
}

// Create the store instance
export const onboardingStore = createOnboardingStore();

// Derived stores for convenience
export const isFirstVisit = derived(onboardingStore, ($s) => $s.isFirstVisit);
export const showWelcomeModal = derived(onboardingStore, ($s) => $s.showWelcomeModal);
export const selectedPath = derived(onboardingStore, ($s) => $s.selectedPath);
export const isTourActive = derived(onboardingStore, ($s) => $s.isTourActive);
export const tourProgress = derived(onboardingStore, ($s) => $s.tourProgress);
export const isOnboardingCompleted = derived(onboardingStore, ($s) => $s.isCompleted);
export const currentStepIndex = derived(
	onboardingStore,
	($s) => $s.tourProgress?.currentStepIndex ?? 0
);
export const hasResumableTour = derived(
	onboardingStore,
	($s) => $s.tourProgress !== null && !$s.isTourActive && !$s.isCompleted
);

// Tour steps configuration
export const QUICK_START_STEPS: TourStep[] = [
	{
		id: 'welcome',
		target: '[data-tour="kanban-board"]',
		title: 'Welcome to CF-Kanban',
		content:
			'This is your AI-powered Kanban board. Tickets flow from left to right as they progress.',
		position: 'bottom'
	},
	{
		id: 'create-ticket',
		target: '[data-tour="create-ticket"]',
		title: 'Create Your First Ticket',
		content: 'Click here to create a new ticket. AI agents will help you refine and execute it.',
		position: 'bottom',
		action: 'Create Ticket'
	},
	{
		id: 'command-palette',
		target: '[data-tour="command-trigger"]',
		title: 'Quick Actions (Cmd+K)',
		content:
			'Press Cmd+K anytime to access the command palette. Search for agents, hooks, workers, and more.',
		position: 'bottom'
	}
];

export const FULL_TOUR_STEPS: TourStep[] = [
	{
		id: 'welcome',
		target: '[data-tour="kanban-board"]',
		title: 'Welcome to CF-Kanban',
		content:
			'This is your AI-powered Kanban board where work flows from backlog to done. Each column represents a stage in your workflow.',
		position: 'bottom'
	},
	{
		id: 'columns',
		target: '[data-tour="kanban-columns"]',
		title: 'Workflow Stages',
		content:
			'Tickets move through Backlog, Ready, In Progress, Review, and Done. Drag and drop to move tickets between stages.',
		position: 'bottom'
	},
	{
		id: 'create-ticket',
		target: '[data-tour="create-ticket"]',
		title: 'Create Tickets',
		content:
			'Create new tickets here. You can use templates and AI will help refine your requirements.',
		position: 'bottom',
		action: 'Create Ticket'
	},
	{
		id: 'ticket-card',
		target: '[data-tour="ticket-card"]',
		title: 'Ticket Cards',
		content:
			'Each card shows the ticket title, status, and AI agent indicators. Click to view details and track progress.',
		position: 'right'
	},
	{
		id: 'command-palette',
		target: '[data-tour="command-trigger"]',
		title: 'Command Palette',
		content:
			'Press Cmd+K to open the command palette. Search for agents, hooks, workers, and navigate quickly.',
		position: 'bottom'
	},
	{
		id: 'agents',
		target: '[data-tour="nav-agents"]',
		title: 'AI Agents',
		content:
			'Browse and configure AI agents. Each agent specializes in different tasks like coding, testing, or reviewing.',
		position: 'right',
		action: 'View Agents',
		actionHref: '/learning/agents'
	},
	{
		id: 'memory',
		target: '[data-tour="nav-memory"]',
		title: 'Memory System',
		content:
			'The memory system stores patterns, solutions, and knowledge that agents learn over time.',
		position: 'right',
		action: 'View Memory',
		actionHref: '/learning/memory'
	},
	{
		id: 'neural',
		target: '[data-tour="nav-neural"]',
		title: 'Neural Training',
		content:
			'Monitor and configure neural network training. Watch as agents learn from successful patterns.',
		position: 'right',
		action: 'View Neural',
		actionHref: '/learning/neural'
	},
	{
		id: 'complete',
		target: '[data-tour="kanban-board"]',
		title: 'You\'re Ready!',
		content:
			'You now know the basics. Explore the sidebar to discover more features, or start creating tickets!',
		position: 'bottom'
	}
];

// Get steps for the selected path
export function getTourSteps(path: OnboardingPath): TourStep[] {
	switch (path) {
		case 'quick-start':
			return QUICK_START_STEPS;
		case 'full-tour':
			return FULL_TOUR_STEPS;
		default:
			return [];
	}
}
