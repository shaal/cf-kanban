/**
 * TASK-118: User-Friendly Error Messages
 *
 * Maps technical errors to user-friendly messages with:
 * - Clear explanations
 * - Suggested actions
 * - Error codes for support
 */

interface ErrorDetails {
  title: string;
  message: string;
  suggestion: string;
  code: string;
}

// HTTP status code mappings
const httpErrors: Record<number, ErrorDetails> = {
  400: {
    title: 'Invalid Request',
    message: 'The information you provided seems to have an issue.',
    suggestion: 'Please check your input and try again.',
    code: 'ERR_BAD_REQUEST',
  },
  401: {
    title: 'Not Signed In',
    message: 'You need to sign in to access this feature.',
    suggestion: 'Please sign in and try again.',
    code: 'ERR_UNAUTHORIZED',
  },
  403: {
    title: 'Access Denied',
    message: "You don't have permission to perform this action.",
    suggestion: 'Contact your project admin if you need access.',
    code: 'ERR_FORBIDDEN',
  },
  404: {
    title: 'Not Found',
    message: "We couldn't find what you're looking for.",
    suggestion: 'It may have been moved or deleted. Try going back.',
    code: 'ERR_NOT_FOUND',
  },
  409: {
    title: 'Conflict',
    message: 'This action conflicts with another operation.',
    suggestion: 'Refresh the page and try again.',
    code: 'ERR_CONFLICT',
  },
  429: {
    title: 'Slow Down',
    message: "You're making too many requests.",
    suggestion: 'Please wait a moment before trying again.',
    code: 'ERR_RATE_LIMIT',
  },
  500: {
    title: 'Server Error',
    message: 'Something went wrong on our end.',
    suggestion: "We're looking into it. Please try again later.",
    code: 'ERR_INTERNAL',
  },
  502: {
    title: 'Service Unavailable',
    message: "We're having trouble connecting to our services.",
    suggestion: 'Please try again in a few moments.',
    code: 'ERR_BAD_GATEWAY',
  },
  503: {
    title: 'Service Unavailable',
    message: 'The service is temporarily unavailable.',
    suggestion: "We're working on it. Please try again later.",
    code: 'ERR_SERVICE_UNAVAILABLE',
  },
  504: {
    title: 'Request Timeout',
    message: 'The request took too long to complete.',
    suggestion: 'Please try again. If this persists, contact support.',
    code: 'ERR_TIMEOUT',
  },
};

// Domain-specific error mappings
const domainErrors: Record<string, ErrorDetails> = {
  // Ticket errors
  INVALID_TRANSITION: {
    title: 'Invalid Move',
    message: "This ticket can't be moved to that column right now.",
    suggestion: 'Check the ticket status and try a different column.',
    code: 'ERR_INVALID_TRANSITION',
  },
  TICKET_LOCKED: {
    title: 'Ticket Locked',
    message: 'This ticket is currently being processed.',
    suggestion: 'Wait for the current operation to complete.',
    code: 'ERR_TICKET_LOCKED',
  },
  UNANSWERED_QUESTIONS: {
    title: 'Questions Pending',
    message: 'Please answer all required questions before continuing.',
    suggestion: 'Review the feedback requests and provide answers.',
    code: 'ERR_UNANSWERED_QUESTIONS',
  },

  // Project errors
  PROJECT_NOT_FOUND: {
    title: 'Project Not Found',
    message: 'This project may have been deleted or moved.',
    suggestion: 'Return to the dashboard and select a different project.',
    code: 'ERR_PROJECT_NOT_FOUND',
  },
  PROJECT_LIMIT_REACHED: {
    title: 'Project Limit Reached',
    message: "You've reached the maximum number of projects.",
    suggestion: 'Archive or delete unused projects to create new ones.',
    code: 'ERR_PROJECT_LIMIT',
  },

  // Execution errors
  EXECUTION_FAILED: {
    title: 'Execution Failed',
    message: 'The AI agent encountered an issue while processing.',
    suggestion: 'Review the error details and try again, or modify the ticket.',
    code: 'ERR_EXECUTION_FAILED',
  },
  AGENT_UNAVAILABLE: {
    title: 'Agent Unavailable',
    message: 'The AI agent service is temporarily unavailable.',
    suggestion: 'Please try again in a few moments.',
    code: 'ERR_AGENT_UNAVAILABLE',
  },
  TIMEOUT: {
    title: 'Execution Timeout',
    message: 'The task took too long to complete.',
    suggestion: 'Try breaking the task into smaller pieces.',
    code: 'ERR_EXECUTION_TIMEOUT',
  },

  // Connection errors
  WEBSOCKET_DISCONNECTED: {
    title: 'Connection Lost',
    message: 'Real-time updates are temporarily unavailable.',
    suggestion: "We're trying to reconnect. Your work is saved.",
    code: 'ERR_WS_DISCONNECTED',
  },
  NETWORK_ERROR: {
    title: 'Network Issue',
    message: 'Unable to connect to the server.',
    suggestion: 'Check your internet connection and try again.',
    code: 'ERR_NETWORK',
  },

  // Validation errors
  VALIDATION_ERROR: {
    title: 'Validation Error',
    message: 'Some of the information provided is invalid.',
    suggestion: 'Please review the highlighted fields and correct them.',
    code: 'ERR_VALIDATION',
  },
  REQUIRED_FIELD: {
    title: 'Missing Information',
    message: 'Please fill in all required fields.',
    suggestion: 'Fields marked with * are required.',
    code: 'ERR_REQUIRED_FIELD',
  },

  // Generic fallback
  UNKNOWN: {
    title: 'Unexpected Error',
    message: 'Something unexpected happened.',
    suggestion: 'Please try again. If the problem persists, contact support.',
    code: 'ERR_UNKNOWN',
  },
};

/**
 * Get user-friendly error details from an HTTP status code
 */
export function getHttpErrorDetails(status: number): ErrorDetails {
  return httpErrors[status] || httpErrors[500];
}

/**
 * Get user-friendly error details from a domain error code
 */
export function getDomainErrorDetails(code: string): ErrorDetails {
  return domainErrors[code] || domainErrors.UNKNOWN;
}

/**
 * Parse an error and return user-friendly details
 */
export function parseError(error: unknown): ErrorDetails {
  // Handle fetch Response
  if (error instanceof Response) {
    return getHttpErrorDetails(error.status);
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return domainErrors.NETWORK_ERROR;
    }

    // Timeout errors
    if (message.includes('timeout')) {
      return domainErrors.TIMEOUT;
    }

    // Try to extract error code from message
    const codeMatch = error.message.match(/\[([A-Z_]+)\]/);
    if (codeMatch && domainErrors[codeMatch[1]]) {
      return domainErrors[codeMatch[1]];
    }
  }

  // Handle API error responses
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    if (err.code && typeof err.code === 'string' && domainErrors[err.code]) {
      return domainErrors[err.code];
    }

    if (err.status && typeof err.status === 'number') {
      return getHttpErrorDetails(err.status);
    }
  }

  return domainErrors.UNKNOWN;
}

/**
 * Format error for display
 */
export function formatError(error: unknown): {
  title: string;
  message: string;
  suggestion: string;
  code: string;
  technical?: string;
} {
  const details = parseError(error);

  // Include technical details in development
  let technical: string | undefined;
  if (import.meta.env.DEV) {
    if (error instanceof Error) {
      technical = `${error.name}: ${error.message}\n${error.stack}`;
    } else if (typeof error === 'object') {
      technical = JSON.stringify(error, null, 2);
    } else {
      technical = String(error);
    }
  }

  return {
    ...details,
    technical,
  };
}

/**
 * Commonly used error messages for forms
 */
export const formErrors = {
  required: 'This field is required',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be no more than ${max} characters`,
  email: 'Please enter a valid email address',
  url: 'Please enter a valid URL',
  number: 'Please enter a valid number',
  positive: 'Must be a positive number',
  integer: 'Must be a whole number',
  pattern: 'Invalid format',
  match: 'Values do not match',
};

/**
 * Helper to create validation error
 */
export function validationError(field: string, message: string): ErrorDetails {
  return {
    ...domainErrors.VALIDATION_ERROR,
    message: `${field}: ${message}`,
  };
}
