# Planning Tool Plugin SDK Guide

## Overview

The Plugin SDK provides a standardized way to create plugins for the Planning Tool. All plugins follow a consistent structure and use the same API patterns.

## Plugin Structure

```
my-plugin/
├── plugin.json      # Plugin metadata and configuration
├── index.html       # Main plugin UI
├── style.css        # Plugin styles
└── script.js        # Plugin logic
```

## Plugin Configuration (plugin.json)

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Description of your plugin",
  "author": "Your Name",
  "icon": "🔌",
  "category": "utilities",
  "main": "index.html",
  "permissions": [
    "api:read",
    "api:write"
  ],
  "api": {
    "version": "1.0",
    "endpoints": []
  }
}
```

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique plugin identifier (lowercase, dash-separated) |
| `name` | string | Yes | Display name for the plugin |
| `version` | string | Yes | Semantic version (e.g., "1.0.0") |
| `description` | string | Yes | Short description of plugin functionality |
| `author` | string | No | Plugin author name |
| `icon` | string | No | Emoji or icon for the plugin |
| `category` | string | No | Plugin category (utilities, hr, kpi, etc.) |
| `main` | string | Yes | Entry point HTML file |
| `permissions` | array | No | Required permissions |
| `api.version` | string | Yes | API version compatibility |
| `api.endpoints` | array | No | Custom API endpoints |

## Using the Plugin SDK

### 1. Initialize the SDK

```javascript
// In your script.js
const plugin = new PluginSDK('my-plugin');
```

### 2. Make API Requests

#### GET Request
```javascript
const data = await plugin.get('/api/bookmarks');
console.log(data);
```

#### POST Request
```javascript
const newItem = await plugin.post('/api/bookmarks', {
  title: 'New Bookmark',
  url: 'https://example.com'
});
```

#### PUT Request
```javascript
const updated = await plugin.put('/api/bookmarks/1', {
  title: 'Updated Title'
});
```

#### DELETE Request
```javascript
await plugin.delete('/api/bookmarks/1');
```

### 3. Error Handling

```javascript
try {
  const data = await plugin.get('/api/endpoint');
  // Handle success
} catch (error) {
  plugin.log(error, 'error');
  // Handle error
}
```

### 4. Logging

```javascript
plugin.log('Info message', 'info');
plugin.log('Warning message', 'warn');
plugin.log('Error message', 'error');
```

## Backend API Endpoints

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookmarks` | Get all bookmarks |
| POST | `/api/bookmarks` | Create new bookmark |
| PUT | `/api/bookmarks/:id` | Update bookmark |
| DELETE | `/api/bookmarks/:id` | Delete bookmark |
| GET | `/api/plugins` | Get all plugins |
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create new task |

## Plugin Categories

- `utilities` - General utility plugins
- `hr` - Human Resources plugins
- `kpi` - KPI and metrics plugins
- `productivity` - Productivity tools
- `communication` - Communication tools
- `games` - Games and entertainment

## Best Practices

### 1. Error Handling
Always wrap API calls in try-catch blocks and provide user feedback.

### 2. Loading States
Show loading indicators during async operations.

```javascript
button.classList.add('loading');
// ... do work
button.classList.remove('loading');
```

### 3. Responsive Design
Use relative units and flexbox/grid for responsive layouts.

### 4. Accessibility
- Use semantic HTML
- Add ARIA labels
- Ensure keyboard navigation works

### 5. Performance
- Minimize API calls
- Cache data when appropriate
- Use debouncing for frequent operations

## Example Plugin

See `/plugin-sdk/template/` for a complete example plugin.

## Creating a New Plugin

1. Copy the template:
   ```bash
   cp -r plugin-sdk/template plugins/my-plugin
   ```

2. Update `plugin.json` with your plugin details

3. Modify `index.html`, `style.css`, and `script.js`

4. Test your plugin locally

5. Submit for review

## Plugin Permissions

### `api:read`
Allows plugin to read data from backend API.

### `api:write`
Allows plugin to create, update, or delete data.

### `storage`
Allows plugin to use local storage.

### `notifications`
Allows plugin to show browser notifications.

## Troubleshooting

### CORS Errors
If you get CORS errors, make sure the backend is running and accessible.

### API Not Found
Check that you're using the correct backend URL (localhost vs remote).

### Plugin Not Loading
Verify `plugin.json` is valid JSON and `main` points to correct file.

## Support

For questions or issues:
- Check existing plugins in `/plugins/` for examples
- Read the main README.md
- Submit an issue on GitHub

## Version History

- **1.0.0** (2025-01-03) - Initial SDK release
