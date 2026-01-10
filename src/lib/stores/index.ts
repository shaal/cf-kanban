/**
 * Stores Index - Export all stores for easy importing
 */

// Socket store for WebSocket connection management
export {
  connectionStatus,
  currentProjectId,
  connect,
  disconnect,
  joinProject,
  leaveProject,
  onTicketCreated,
  onTicketUpdated,
  onTicketDeleted,
  onTicketMoved,
  getSocket,
  emit,
  type ConnectionStatus
} from './socket';

// Tickets store for ticket state management
export {
  tickets,
  ticketsByStatus,
  setTickets,
  initTickets,
  addTicket,
  updateTicket,
  removeTicket,
  moveTicket,
  rollbackTicket,
  getTicketById,
  getTicketsByStatus,
  clearTickets,
  type TicketPreviousState
} from './tickets';

// Projects store for project state management
export {
  projects,
  currentProject,
  currentProjectUsers,
  currentProjectUserCount,
  initProjects,
  addProject,
  updateProject,
  removeProject,
  setCurrentProject,
  updateUserCount,
  addUser,
  removeUser,
  clearProjects,
  getProjectById
} from './projects';

// Position store for real-time position sync
export {
  positionVersions,
  getPositionVersion,
  setPositionVersion,
  resolvePositionConflict,
  updatePositionsForColumn,
  clearPositions,
  getNextPosition,
  reorderPositions,
  calculateInsertPositions,
  type ConflictResolutionResult,
  type PositionUpdate,
  type ReorderedPosition
} from './position';

// Optimistic updates store
export {
  pendingOperations,
  hasPending,
  addPendingOperation,
  removePendingOperation,
  rollbackOperation,
  getPendingForTicket,
  clearPendingOperations,
  getOperation,
  confirmOperation,
  getLatestOperationForTicket,
  type OperationType,
  type PendingOperation,
  type AddOperationInput,
  type RollbackResult
} from './optimistic';

// Progress tracking store for real-time execution progress
export {
  getTicketProgress,
  activeProgress,
  selectedProgressTicketId,
  initializeProgress,
  updateStage,
  addProgressLog,
  completeProgress,
  failProgress,
  removeProgress,
  hasActiveProgress,
  setupProgressListeners,
  type ProgressStage,
  type ProgressLogEntry,
  type TicketProgressState,
  type StageStatus
} from './progress';

// GAP-UX.1: AI Status store for ticket AI status indicators
export {
  ticketAIStatuses,
  getTicketAIStatus,
  createTicketAIStatusStore,
  setTicketAIStatus,
  updateTicketConfidence,
  updateTicketKnowledge,
  updateTicketAIProcessingStatus,
  assignAIAgent,
  setAICurrentTask,
  clearTicketAIStatus,
  clearAllAIStatuses,
  initializeAIStatuses,
  initializeMockAIStatuses,
  createAIStatusEventHandlers,
  type TicketAIStatus,
  type AIStatusUpdatePayload,
  type AIConfidenceUpdatePayload,
  type AIKnowledgeUpdatePayload
} from './ai-status';

// GAP-3.5.2: Health status store for system monitoring
export {
  healthStore,
  healthStatus,
  activeAlerts,
  isHealthChecking,
  checkHealth,
  startHealthPolling,
  stopHealthPolling,
  dismissAlert,
  dismissAllAlerts,
  clearAlerts,
  resetHealthStore,
  getStatusColor,
  getStatusLabel,
  type HealthStatus,
  type ComponentHealth,
  type HealthCheckResult,
  type HealthAlert
} from './health';

// GAP-8.3: Onboarding store for interactive tutorials
export {
  onboardingStore,
  isFirstVisit,
  showWelcomeModal,
  selectedPath,
  isTourActive,
  tourProgress,
  isOnboardingCompleted,
  currentStepIndex,
  hasResumableTour,
  getTourSteps,
  QUICK_START_STEPS,
  FULL_TOUR_STEPS,
  type OnboardingPath,
  type TourStep,
  type TourProgress,
  type OnboardingState
} from './onboarding';

// GAP-8.1: Chat store for AI Chat Assistant
export {
  messages,
  isOpen,
  isLoading,
  ticketCreation,
  chatError,
  unreadCount,
  toggleChat,
  openChat,
  closeChat,
  addUserMessage,
  addAssistantMessage,
  addSystemMessage,
  setLoading,
  setError,
  updateTicketCreation,
  resetTicketCreation,
  clearMessages,
  getChatState,
  initializeChat,
  type MessageRole,
  type MessageIntent,
  type TicketCreationState,
  type ChatMessage
} from './chat';

// GAP-3.2.3: Time estimates store for completion time tracking
export {
  getTimeEstimate,
  getTicketTimeEstimate,
  prefetchEstimates,
  clearEstimate,
  clearAllEstimates,
  recordCompletion,
  formatDuration,
  getConfidenceLabel,
  getConfidenceColor,
  type TimeEstimate
} from './time-estimates';

// GAP-3.3.5: Agent configuration store for custom agent presets
export {
  currentProjectSettings,
  currentProjectConfigs,
  allConfigs,
  configsByAgentType,
  defaultConfigs,
  setActiveProject,
  createConfig,
  updateConfig,
  deleteConfig,
  getConfigById,
  getConfigsForAgentType,
  getDefaultConfigForAgentType,
  duplicateConfig,
  updateProjectAgentSettings,
  exportConfigs,
  importConfigs,
  initializeAgentConfigStore
} from './agent-configs';
