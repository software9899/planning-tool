# Planning Tool API Contract

## Overview

This document defines the API contract between plugins and the Planning Tool backend.

## API Versioning

Current API Version: **1.0**

Include version in all requests:
```javascript
headers: {
  'X-API-Version': '1.0'
}
```

## Request Format

### Headers

All API requests should include:

```
Content-Type: application/json
X-Plugin-ID: your-plugin-id
X-API-Version: 1.0
```

### Authentication (Future)

Currently no authentication required. Future versions will use JWT tokens.

## Response Format

### Success Response

```json
{
  "data": { ... },
  "message": "Success message",
  "timestamp": "2025-01-03T12:00:00Z"
}
```

### Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

## Standard HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal server error |

## Core API Endpoints

### Bookmarks API

#### GET /api/bookmarks
Get all bookmarks.

**Response:**
```json
{
  "bookmarks": [
    {
      "id": 1,
      "title": "Example",
      "url": "https://example.com",
      "favicon": "https://...",
      "description": "...",
      "tags": ["tag1", "tag2"],
      "user_id": null,
      "created_at": "2025-01-03T12:00:00",
      "updated_at": "2025-01-03T12:00:00"
    }
  ]
}
```

#### POST /api/bookmarks
Create a new bookmark.

**Request:**
```json
{
  "title": "Example",
  "url": "https://example.com",
  "favicon": "https://...",
  "description": "Optional description",
  "tags": ["tag1", "tag2"]
}
```

**Response:** (201 Created)
```json
{
  "id": 1,
  "title": "Example",
  "url": "https://example.com",
  ...
}
```

#### PUT /api/bookmarks/{id}
Update a bookmark.

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "id": 1,
  "title": "Updated Title",
  ...
}
```

#### DELETE /api/bookmarks/{id}
Delete a bookmark.

**Response:**
```json
{
  "message": "Bookmark deleted successfully"
}
```

### Tasks API

#### GET /api/tasks
Get all tasks.

**Query Parameters:**
- `status` - Filter by status (optional)
- `priority` - Filter by priority (optional)
- `limit` - Limit results (optional)

**Response:**
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Task title",
      "description": "...",
      "status": "pending",
      "priority": "high",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

#### POST /api/tasks
Create a new task.

**Request:**
```json
{
  "title": "Task title",
  "description": "Task description",
  "status": "pending",
  "priority": "medium",
  "due_date": "2025-01-10"
}
```

### Plugins API

#### GET /api/plugins
Get all registered plugins.

**Response:**
```json
{
  "plugins": [
    {
      "id": "hr",
      "name": "HR Management",
      "version": "1.0.0",
      "enabled": true
    }
  ]
}
```

## Data Models

### Bookmark

```typescript
interface Bookmark {
  id: number;
  title: string;
  url: string;
  favicon?: string;
  description?: string;
  tags?: string[];
  user_id?: number;
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}
```

### Task

```typescript
interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;  // ISO 8601
  created_at: string;
  updated_at: string;
}
```

### Plugin

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  icon?: string;
  category?: string;
  enabled: boolean;
  permissions: string[];
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request data validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `PERMISSION_DENIED` | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `SERVER_ERROR` | Internal server error |

## Rate Limiting

- Default: 100 requests per minute per plugin
- Rate limit headers included in response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Pagination

For endpoints returning lists:

**Query Parameters:**
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

## WebSocket API (Virtual Office)

For real-time features, connect to WebSocket:

```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected');
});

socket.emit('event', data);
```

## Best Practices

1. **Always handle errors** - API can fail
2. **Use appropriate HTTP methods** - GET for reading, POST for creating, etc.
3. **Include proper headers** - Content-Type, X-Plugin-ID, X-API-Version
4. **Validate data before sending** - Check required fields
5. **Respect rate limits** - Don't spam the API
6. **Cache when possible** - Reduce unnecessary requests

## Changelog

### Version 1.0 (2025-01-03)
- Initial API contract
- Bookmarks endpoints
- Tasks endpoints
- Plugins endpoints
- Standard error handling
