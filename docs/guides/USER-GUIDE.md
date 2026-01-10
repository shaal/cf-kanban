# CF-Kanban User Guide

## Welcome to CF-Kanban

CF-Kanban is an AI-orchestrated Kanban board where Claude Flow agents automatically execute your tickets. Move a ticket to "In Progress" and watch AI agents analyze, plan, and complete your work.

---

## Getting Started

### Logging In

1. Navigate to your CF-Kanban URL
2. Click **Sign In**
3. Use your email/password or SSO provider
4. You'll be redirected to your dashboard

### Dashboard Overview

After logging in, you'll see:

- **Projects List**: All projects you have access to
- **Recent Activity**: Latest updates across projects
- **Quick Actions**: Create project, join project

---

## Managing Projects

### Creating a Project

1. Click **+ New Project** button
2. Enter project name (required)
3. Add description (optional)
4. Click **Create Project**

### Opening a Project

Click on any project card to open the Kanban board.

### Project Settings

1. Click the **gear icon** in the project header
2. Modify:
   - Project name
   - Description
   - Team members
   - Default settings

### Inviting Team Members

1. Open project settings
2. Click **Team** tab
3. Click **Add Member**
4. Enter email address
5. Select role:
   - **Viewer**: Can view only
   - **Member**: Can edit tickets
   - **Admin**: Can manage project

---

## The Kanban Board

### Understanding Columns

| Column | Description |
|--------|-------------|
| **Backlog** | Ideas and future work |
| **To Do** | Ready to be worked on |
| **In Progress** | Currently being executed by AI |
| **Needs Feedback** | AI needs your input |
| **Ready to Resume** | Feedback provided, resuming |
| **Review** | Work complete, needs human review |
| **Done** | Completed tickets |

### Creating Tickets

1. Click **+ Add Ticket** in the Backlog column
2. Fill in the form:
   - **Title**: Brief description (required)
   - **Description**: Detailed requirements
   - **Priority**: Low, Medium, High, Critical
   - **Labels**: Tags for organization
3. Click **Create**

### Ticket Details

Click any ticket to view/edit:

- Title and description
- Priority and labels
- History of state changes
- Execution progress (if running)
- Questions from AI agents

### Moving Tickets

**Drag and Drop:**
- Click and hold a ticket
- Drag to the target column
- Release to drop

**Keyboard Navigation:**
- Use arrow keys to select tickets
- Press Enter to open details
- Use Tab to navigate form fields

---

## AI Execution Flow

### Starting Execution

When you move a ticket to **In Progress**:

1. Claude Flow analyzes the ticket
2. Determines complexity and required agents
3. Spawns a swarm of specialized agents
4. Begins working on the task

### Understanding Progress

While a ticket is executing:

- **Progress Bar**: Shows completion percentage
- **Stage Indicator**: Current execution phase
- **Agent List**: Active agents working on the task
- **Live Logs**: Real-time execution output

### Execution Stages

| Stage | What Happens |
|-------|--------------|
| Analyzing | Parsing requirements and keywords |
| Assigning Agents | Selecting optimal agent types |
| Executing | Agents are working on the task |
| Testing | Automated tests running |
| Reviewing | Quality checks |
| Completing | Finalizing output |

---

## Handling Feedback Requests

### When AI Needs Input

Sometimes agents need clarification. The ticket moves to **Needs Feedback** with questions.

### Answering Questions

1. Click the ticket in **Needs Feedback**
2. View the question(s) from the AI
3. Provide your answer:
   - **Choice**: Select an option
   - **Text**: Type your response
   - **Confirm**: Yes or No
4. Click **Submit Answer**

### Resuming Execution

After answering all required questions:

1. The **Ready to Resume** button activates
2. Click it to continue execution
3. Ticket moves to **Ready to Resume**, then back to **In Progress**

---

## Reviewing Completed Work

### When Tickets Reach Review

1. AI execution is complete
2. Output/artifacts are ready
3. Human review is needed

### Approving Work

1. Open the ticket
2. Review the execution results
3. Check attached files/artifacts
4. If satisfied, move to **Done**

### Requesting Changes

1. Add a comment with change requests
2. Move ticket back to **In Progress**
3. AI will address the feedback

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | Create new ticket |
| `E` | Edit selected ticket |
| `Delete` | Delete selected ticket (with confirm) |
| `Escape` | Close modal/detail view |
| `Arrow Keys` | Navigate between tickets |
| `Enter` | Open ticket details |
| `1-7` | Move ticket to column 1-7 |
| `?` | Show keyboard shortcuts |

---

## Tips and Best Practices

### Writing Effective Tickets

**Good ticket title:**
```
Implement user authentication with OAuth2
```

**Good description:**
```
- Add Google and GitHub OAuth providers
- Store user sessions in database
- Redirect to dashboard after login
- Handle errors gracefully

Tech: Use Clerk.js for authentication
```

### Optimal Workflow

1. **Keep Backlog Groomed**: Regularly prioritize
2. **One Thing at a Time**: Limit WIP in Progress
3. **Provide Quick Feedback**: Don't leave AI waiting
4. **Review Thoroughly**: Check agent output carefully

### Common Questions

**Q: How long does execution take?**
A: Depends on complexity. Simple tasks: minutes. Complex features: hours.

**Q: Can I cancel a running ticket?**
A: Move it back to To Do. Execution will stop gracefully.

**Q: What if execution fails?**
A: Ticket returns to To Do with error details. Fix and retry.

---

## Troubleshooting

### Ticket Stuck in Progress

1. Check for feedback requests
2. View execution logs for errors
3. Try moving back to To Do and restarting

### Can't Move Ticket

1. Verify you have edit permissions
2. Check if transition is valid (see column descriptions)
3. Ensure network connection is active

### Not Seeing Updates

1. Check connection status (top-right indicator)
2. Refresh the page
3. Clear browser cache

### Questions Not Appearing

1. Ensure WebSocket is connected
2. Refresh the ticket details
3. Check browser console for errors

---

## Mobile Usage

CF-Kanban works on mobile devices:

- **Touch to select** tickets
- **Long press and drag** to move
- **Tap ticket** to view details
- **Swipe** to scroll columns

For best experience, use landscape orientation on tablets.

---

## Notifications

### In-App Notifications

Bell icon in top-right shows:
- New feedback requests
- Ticket completions
- Team mentions

### Email Notifications

Configure in your profile settings:
- Feedback requests
- Daily digest
- Mentioned in comments

---

## Getting Help

### Help Resources

- **This Guide**: You're reading it!
- **Tooltips**: Hover over icons for hints
- **Keyboard Shortcuts**: Press `?` anywhere

### Support

If you need help:
1. Check this guide first
2. Ask your project admin
3. Contact support via help menu

---

## Glossary

| Term | Definition |
|------|------------|
| **Agent** | AI worker that performs specific tasks |
| **Swarm** | Group of agents working together |
| **Topology** | How agents are organized |
| **Feedback Loop** | Process of AI asking for human input |
| **Transition** | Moving a ticket between states |
| **Execution** | AI agents working on a ticket |

---

Happy building with CF-Kanban!
