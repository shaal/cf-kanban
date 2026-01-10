# CF-Kanban API Documentation

## Overview

The CF-Kanban API provides RESTful endpoints for managing projects, tickets, and AI-orchestrated workflows. All responses are in JSON format.

**Base URL**: `http://localhost:4173/api` (development) or your production domain.

## Authentication

> Note: Authentication is handled via Clerk in production. Include the session token in requests.

```http
Authorization: Bearer <session_token>
```

## Rate Limiting

| Endpoint Type | Rate Limit |
|--------------|------------|
| Read operations | 100 requests/minute |
| Write operations | 30 requests/minute |
| WebSocket connections | 50 concurrent |

---

## Projects API

### List Projects

```http
GET /api/projects
```

Returns all projects ordered by most recently updated.

**Response** `200 OK`
```json
[
  {
    "id": "clx1abc123",
    "name": "My Project",
    "description": "Project description",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "_count": {
      "tickets": 15
    }
  }
]
```

### Create Project

```http
POST /api/projects
Content-Type: application/json

{
  "name": "New Project",
  "description": "Optional description"
}
```

**Response** `201 Created`
```json
{
  "id": "clx1abc123",
  "name": "New Project",
  "description": "Optional description",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Errors**
- `400 Bad Request` - Name is required and must be non-empty

### Get Project

```http
GET /api/projects/:id
```

**Response** `200 OK`
```json
{
  "id": "clx1abc123",
  "name": "My Project",
  "description": "Description",
  "tickets": [...],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Errors**
- `404 Not Found` - Project not found

### Update Project

```http
PUT /api/projects/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response** `200 OK` - Returns updated project

### Delete Project

```http
DELETE /api/projects/:id
```

**Response** `204 No Content`

**Errors**
- `404 Not Found` - Project not found

---

## Tickets API

### List Project Tickets

```http
GET /api/projects/:projectId/tickets
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (BACKLOG, TODO, IN_PROGRESS, etc.) |
| priority | string | Filter by priority (LOW, MEDIUM, HIGH, CRITICAL) |
| search | string | Search in title and description |

**Response** `200 OK`
```json
[
  {
    "id": "clx1ticket1",
    "title": "Implement feature",
    "description": "Feature description",
    "status": "TODO",
    "priority": "HIGH",
    "position": 0,
    "complexity": 5,
    "labels": ["frontend", "urgent"],
    "projectId": "clx1abc123",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### Create Ticket

```http
POST /api/projects/:projectId/tickets
Content-Type: application/json

{
  "title": "New Ticket",
  "description": "Ticket description",
  "priority": "MEDIUM",
  "labels": ["feature"]
}
```

**Response** `201 Created`
```json
{
  "id": "clx1ticket1",
  "title": "New Ticket",
  "description": "Ticket description",
  "status": "BACKLOG",
  "priority": "MEDIUM",
  "position": 0,
  "labels": ["feature"],
  "projectId": "clx1abc123",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Get Ticket

```http
GET /api/tickets/:id
```

**Response** `200 OK`
```json
{
  "id": "clx1ticket1",
  "title": "My Ticket",
  "description": "Description",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "position": 0,
  "complexity": 7,
  "labels": ["security"],
  "history": [
    {
      "id": "hist1",
      "ticketId": "clx1ticket1",
      "fromState": "TODO",
      "toState": "IN_PROGRESS",
      "triggeredBy": "user",
      "createdAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

### Update Ticket

```http
PUT /api/tickets/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "priority": "CRITICAL",
  "labels": ["urgent", "security"],
  "position": 1
}
```

**Response** `200 OK` - Returns updated ticket

### Delete Ticket

```http
DELETE /api/tickets/:id
```

**Response** `204 No Content`

---

## Ticket Transitions

### Transition Ticket State

```http
POST /api/tickets/:id/transition
Content-Type: application/json

{
  "toState": "IN_PROGRESS",
  "triggeredBy": "user",
  "reason": "Starting work on feature"
}
```

**Valid States**
- `BACKLOG` - Not yet prioritized
- `TODO` - Ready to be worked on
- `IN_PROGRESS` - Currently being worked on (triggers Claude Flow)
- `NEEDS_FEEDBACK` - Waiting for user input
- `READY_TO_RESUME` - Feedback provided, ready to continue
- `REVIEW` - Work complete, awaiting review
- `DONE` - Completed
- `CANCELLED` - Cancelled

**Valid Transitions**
```
BACKLOG -> TODO
TODO -> IN_PROGRESS, CANCELLED
IN_PROGRESS -> NEEDS_FEEDBACK, REVIEW, TODO (on failure)
NEEDS_FEEDBACK -> READY_TO_RESUME
READY_TO_RESUME -> IN_PROGRESS
REVIEW -> DONE, IN_PROGRESS (needs changes)
```

**Response** `200 OK`
```json
{
  "ticket": { ... },
  "transition": {
    "from": "TODO",
    "to": "IN_PROGRESS"
  }
}
```

**Errors**
- `400 Bad Request` - Invalid transition
- `404 Not Found` - Ticket not found

---

## Questions & Feedback API

### List Ticket Questions

```http
GET /api/tickets/:id/questions
```

**Response** `200 OK`
```json
[
  {
    "id": "q1",
    "ticketId": "clx1ticket1",
    "text": "Which database should we use?",
    "type": "CHOICE",
    "options": ["PostgreSQL", "MySQL", "MongoDB"],
    "required": true,
    "answered": false,
    "answer": null,
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
]
```

### Answer Question

```http
POST /api/tickets/:id/questions/:questionId/answer
Content-Type: application/json

{
  "answer": "PostgreSQL"
}
```

**Response** `200 OK`
```json
{
  "id": "q1",
  "answered": true,
  "answer": "PostgreSQL",
  "answeredAt": "2024-01-15T11:05:00.000Z"
}
```

### Request Feedback (Agent Use)

```http
POST /api/tickets/:id/feedback
Content-Type: application/json

{
  "agentId": "agent-123",
  "questions": [
    {
      "text": "Which approach should I use?",
      "type": "CHOICE",
      "options": ["Option A", "Option B"],
      "required": true
    }
  ],
  "context": "Working on feature implementation",
  "blocking": true
}
```

**Question Types**
- `TEXT` - Free text input
- `CHOICE` - Single selection from options
- `MULTI_CHOICE` - Multiple selection from options
- `CONFIRM` - Yes/No confirmation
- `FILE` - File upload (future)

### Resume Ticket

```http
POST /api/tickets/:id/resume
```

Moves ticket from `NEEDS_FEEDBACK` to `READY_TO_RESUME` after all required questions are answered.

**Response** `200 OK`
```json
{
  "ticket": { ... },
  "transition": {
    "from": "NEEDS_FEEDBACK",
    "to": "READY_TO_RESUME"
  }
}
```

**Errors**
- `400 Bad Request` - Unanswered required questions

---

## Memory API

### Store Memory Entry

```http
POST /api/memory/store
Content-Type: application/json

{
  "key": "pattern-auth",
  "value": "JWT with refresh tokens works well",
  "namespace": "patterns",
  "tags": ["auth", "security"]
}
```

**Response** `201 Created`

### Search Memory

```http
GET /api/memory/search?query=authentication&namespace=patterns&limit=10
```

**Response** `200 OK`
```json
[
  {
    "key": "pattern-auth",
    "value": "JWT with refresh tokens works well",
    "score": 0.95,
    "metadata": {
      "tags": ["auth", "security"]
    }
  }
]
```

### Check Memory Exists

```http
GET /api/memory/exists?key=pattern-auth&namespace=patterns
```

**Response** `200 OK`
```json
{
  "exists": true,
  "key": "pattern-auth",
  "namespace": "patterns"
}
```

---

## WebSocket Events

Connect to: `ws://localhost:3001/socket.io/`

### Client -> Server Events

```javascript
// Join project room
socket.emit('join', { projectId: 'clx1abc123' });

// Leave project room
socket.emit('leave', { projectId: 'clx1abc123' });
```

### Server -> Client Events

```javascript
// Ticket created
socket.on('ticket:created', {
  ticketId: 'clx1ticket1',
  projectId: 'clx1abc123',
  ticket: { ... }
});

// Ticket updated
socket.on('ticket:updated', {
  ticketId: 'clx1ticket1',
  projectId: 'clx1abc123',
  changes: { title: 'New title' },
  previous: { title: 'Old title' }
});

// Ticket moved (state transition)
socket.on('ticket:moved', {
  ticketId: 'clx1ticket1',
  projectId: 'clx1abc123',
  fromState: 'TODO',
  toState: 'IN_PROGRESS',
  position: 0
});

// Ticket deleted
socket.on('ticket:deleted', {
  ticketId: 'clx1ticket1',
  projectId: 'clx1abc123'
});

// Execution progress
socket.on('execution:progress', {
  ticketId: 'clx1ticket1',
  stage: 'Analyzing',
  status: 'completed',
  percentComplete: 14
});

// Execution log
socket.on('execution:log', {
  ticketId: 'clx1ticket1',
  message: 'Spawning agents...',
  level: 'info',
  timestamp: '2024-01-15T11:00:00.000Z'
});

// Questions requested
socket.on('questions:requested', {
  ticketId: 'clx1ticket1',
  questions: [...]
});
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## SDK Examples

### JavaScript/TypeScript

```typescript
const API_URL = 'http://localhost:4173/api';

// Create a ticket
const response = await fetch(`${API_URL}/projects/${projectId}/tickets`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: 'New feature',
    description: 'Implement OAuth login',
    priority: 'HIGH',
  }),
});

const ticket = await response.json();
```

### Python

```python
import requests

API_URL = "http://localhost:4173/api"
headers = {"Authorization": f"Bearer {token}"}

# List projects
response = requests.get(f"{API_URL}/projects", headers=headers)
projects = response.json()

# Create ticket
response = requests.post(
    f"{API_URL}/projects/{project_id}/tickets",
    headers=headers,
    json={
        "title": "New feature",
        "priority": "HIGH"
    }
)
ticket = response.json()
```

---

## Changelog

### v1.0.0 (Initial Release)
- Projects CRUD operations
- Tickets CRUD operations
- State machine transitions
- WebSocket real-time updates
- Questions/Feedback system
- Memory storage API
