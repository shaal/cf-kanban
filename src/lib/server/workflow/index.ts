/**
 * Workflow Module Exports
 *
 * TASK-054: Feedback Handler for agent-user interaction
 *
 * This module contains the workflow handlers for the swim-lane feedback loop,
 * which is the core feature of CF-Kanban.
 */

export {
  requestFeedback,
  getPendingQuestions,
  getAllQuestions,
  allRequiredQuestionsAnswered,
  generateQuestionId,
  QuestionBuilder,
  subscribeFeedbackEvents,
  type Question,
  type QuestionType,
  type FeedbackRequest,
  type FeedbackRequestResult,
  type FeedbackRequestedEvent
} from './feedback-handler';
