/**
 * Kanban Component exports
 *
 * TASK-012, TASK-013, TASK-014: Kanban Components
 * TASK-057: TicketQuestions component for feedback loop
 * GAP-3.3.3: Agent Status on Ticket Cards
 * GAP-3.2.6: Feedback Interaction UI Enhancement
 * GAP-UX.1: KanbanCard AI Status Indicators
 * GAP-8.5: Contextual Suggestions on Ticket Creation
 */
export { default as KanbanCard } from './KanbanCard.svelte';
export { default as KanbanColumn } from './KanbanColumn.svelte';
export { default as KanbanBoard } from './KanbanBoard.svelte';
export { default as CreateTicketModal } from './CreateTicketModal.svelte';
export { default as TicketQuestions } from './TicketQuestions.svelte';
export { default as TicketDetailModal } from './TicketDetailModal.svelte';
export { default as AgentStatusBadge } from './AgentStatusBadge.svelte';
export { default as TicketAgentsDisplay } from './TicketAgentsDisplay.svelte';

// GAP-8.5: Contextual Suggestions on Ticket Creation
export { default as TicketSuggestions } from './TicketSuggestions.svelte';

// GAP-UX.1: AI Status Indicator Components
export { default as AIStatusIndicator } from './AIStatusIndicator.svelte';
export { default as ConfidenceMeter } from './ConfidenceMeter.svelte';
export { default as KnowledgeRing } from './KnowledgeRing.svelte';
export { default as AgentAvatar } from './AgentAvatar.svelte';
export { default as AIStatusSection } from './AIStatusSection.svelte';

// GAP-3.2.5: Ticket Attachment Support
export { default as FileDropZone } from './FileDropZone.svelte';
export { default as AttachmentsList } from './AttachmentsList.svelte';
