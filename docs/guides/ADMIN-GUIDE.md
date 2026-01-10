# CF-Kanban Administrator Guide

## Overview

This guide is for system administrators managing CF-Kanban deployments. It covers user management, system configuration, monitoring, and troubleshooting.

---

## Accessing the Admin Panel

Navigate to `/admin` in your browser. You must have the `ADMIN` or `OWNER` role to access.

### Admin Panel Sections

1. **Dashboard** - System overview and health status
2. **Users** - User management and role assignments
3. **Projects** - Project oversight and management
4. **Settings** - System configuration
5. **Audit Logs** - Security and activity logs

---

## User Management

### Viewing Users

1. Go to **Admin > Users**
2. View all users with:
   - Email and name
   - Role (ADMIN, MEMBER)
   - Registration date
   - Last activity
   - Project memberships

### Inviting Users

1. Click **Invite User**
2. Enter email address
3. Select initial role:
   - **Member**: Standard access
   - **Admin**: Full system access
4. Click **Send Invitation**

User will receive email with setup instructions.

### Changing User Roles

1. Find user in list
2. Click **Edit** (pencil icon)
3. Change role dropdown
4. Click **Save**

### Deactivating Users

1. Find user in list
2. Click **Deactivate**
3. Confirm action

Deactivated users:
- Cannot log in
- Retain data for audit purposes
- Can be reactivated

### Deleting Users

> Warning: This permanently removes user and all their data.

1. Find user in list
2. Click **Delete**
3. Type user email to confirm
4. Click **Permanently Delete**

---

## Project Management

### Viewing All Projects

1. Go to **Admin > Projects**
2. View:
   - Project name and description
   - Owner and team members
   - Ticket counts by status
   - Created/updated dates
   - Activity level

### Archiving Projects

Archived projects are hidden but preserved.

1. Find project
2. Click **Archive**
3. Confirm action

To unarchive: Toggle **Show Archived** and click **Restore**.

### Deleting Projects

> Warning: This permanently removes project and all tickets.

1. Find project
2. Click **Delete**
3. Type project name to confirm
4. Click **Permanently Delete**

### Transferring Ownership

1. Find project
2. Click **Transfer Ownership**
3. Select new owner
4. Click **Transfer**

---

## System Settings

### General Settings

| Setting | Description | Default |
|---------|-------------|---------|
| App Name | Displayed in header | CF-Kanban |
| Default Project Visibility | Private or Public | Private |
| Allow Registration | Enable self-registration | Yes |
| Session Timeout | Auto-logout duration | 24 hours |

### Claude Flow Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Default Topology | Agent swarm topology | hierarchical-mesh |
| Max Agents | Maximum concurrent agents | 15 |
| Execution Timeout | Max time for ticket execution | 30 minutes |
| Auto-Start Swarm | Start swarm on IN_PROGRESS | Yes |

### Resource Limits

| Setting | Description | Default |
|---------|-------------|---------|
| Max Projects per User | Project limit | 10 |
| Max Tickets per Project | Ticket limit | 1000 |
| Max File Upload Size | Attachment limit | 10 MB |
| API Rate Limit | Requests per minute | 100 |

### Notification Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Email Notifications | Enable email alerts | Yes |
| Slack Integration | Webhook URL | None |
| Discord Integration | Webhook URL | None |

---

## Monitoring & Health

### System Dashboard

The admin dashboard shows:

- **System Health**: Database, Redis, WebSocket status
- **Active Users**: Currently online users
- **Ticket Activity**: Recent transitions
- **Agent Status**: Running Claude Flow swarms
- **Resource Usage**: CPU, memory, storage

### Health Checks

Monitor these endpoints:

```
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "redis": true,
    "websocket": true
  }
}
```

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| API Response Time | > 500ms | > 2000ms |
| Database Connections | > 80% | > 95% |
| Redis Memory | > 80% | > 95% |
| Error Rate | > 1% | > 5% |
| WebSocket Connections | > 500 | > 1000 |

### Setting Up Alerts

1. Go to **Admin > Settings > Alerts**
2. Configure notification channels
3. Set thresholds for each metric
4. Enable alert rules

---

## Audit Logs

### Viewing Logs

1. Go to **Admin > Audit Logs**
2. Filter by:
   - Date range
   - User
   - Action type
   - Resource

### Logged Actions

| Action | Description |
|--------|-------------|
| user.login | User logged in |
| user.logout | User logged out |
| user.created | New user registered |
| user.role_changed | Role updated |
| project.created | New project created |
| project.deleted | Project deleted |
| ticket.transitioned | Ticket state changed |
| settings.changed | System settings modified |
| export.requested | Data export requested |

### Exporting Logs

1. Set date range filter
2. Click **Export**
3. Choose format (CSV, JSON)
4. Download file

### Log Retention

| Log Type | Retention Period |
|----------|-----------------|
| Security Events | 1 year |
| User Activity | 90 days |
| API Requests | 30 days |
| Debug Logs | 7 days |

---

## Backup & Recovery

### Manual Backup

1. Go to **Admin > Backups**
2. Click **Create Backup**
3. Wait for completion
4. Download backup file

### Scheduled Backups

1. Go to **Admin > Settings > Backups**
2. Enable scheduled backups
3. Set schedule (daily, weekly)
4. Set retention period

### Restoring from Backup

> Warning: This will overwrite current data.

1. Go to **Admin > Backups**
2. Upload or select backup file
3. Click **Restore**
4. Confirm action
5. Wait for completion
6. Verify data integrity

---

## Troubleshooting

### Common Issues

#### Users Cannot Log In

1. Check Clerk status page
2. Verify authentication settings
3. Check user status (not deactivated)
4. Clear browser cookies

#### Slow Performance

1. Check system metrics
2. Review database slow query log
3. Check Redis memory
4. Verify no memory leaks

#### WebSocket Disconnections

1. Check WebSocket server health
2. Verify Redis pub/sub
3. Check for network issues
4. Review connection limits

#### Ticket Transitions Failing

1. Check Claude Flow status
2. Verify API key configuration
3. Review error logs
4. Check rate limits

### Diagnostic Commands

```bash
# Check application health
curl https://your-domain.com/api/health

# View recent errors
docker-compose logs --tail 100 app | grep ERROR

# Check database connections
docker-compose exec db psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Check Redis info
docker-compose exec redis redis-cli info
```

### Log Locations

| Log Type | Location |
|----------|----------|
| Application | `/var/log/cf-kanban/app.log` |
| Access | `/var/log/cf-kanban/access.log` |
| Error | `/var/log/cf-kanban/error.log` |
| Audit | `/var/log/cf-kanban/audit.log` |

---

## Security Best Practices

### Regular Tasks

- [ ] Weekly: Review audit logs for anomalies
- [ ] Monthly: Rotate API keys and secrets
- [ ] Monthly: Review user access levels
- [ ] Quarterly: Full security audit
- [ ] Annually: Disaster recovery test

### Access Control

1. Use principle of least privilege
2. Review admin access quarterly
3. Remove access for departed employees immediately
4. Use separate accounts for admin tasks

### Incident Response

1. Identify and contain the issue
2. Preserve evidence (logs, screenshots)
3. Notify affected users if required
4. Document incident
5. Implement preventive measures

---

## Integrations

### Slack Integration

1. Create Slack app
2. Add Webhook URL to **Settings > Integrations**
3. Select notification types
4. Test connection

### GitHub Integration

1. Create GitHub OAuth app
2. Add credentials to settings
3. Enable repository sync
4. Configure webhook

### LDAP/SSO

1. Contact Clerk support for enterprise SSO
2. Configure SAML or LDAP settings
3. Map group permissions
4. Test with pilot users

---

## Support

### Getting Help

1. Check this documentation
2. Search audit logs for clues
3. Review application logs
4. Contact support with:
   - Error messages
   - Steps to reproduce
   - Log excerpts
   - Screenshots

### Useful Resources

- [API Documentation](/docs/api/API-DOCUMENTATION.md)
- [Deployment Guide](/docs/deployment/DEPLOYMENT-GUIDE.md)
- [Troubleshooting FAQ](https://github.com/your-repo/wiki/FAQ)
