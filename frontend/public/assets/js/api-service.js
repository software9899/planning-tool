/**
 * API Service for Planning Tool
 * Handles all communication with the PostgreSQL backend
 */

const API_BASE_URL = window.location.hostname === 'localhost' && window.location.port === '3000'
    ? 'http://localhost:8002/api'  // Dev mode
    : '/api';  // Prod mode (proxied through Nginx)

const ApiService = {
    /**
     * Generic fetch wrapper with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(error.detail || `HTTP ${response.status}`);
            }

            // Handle 204 No Content
            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    // ============================================
    // TASKS API
    // ============================================

    /**
     * Get all tasks or filter by status
     */
    async getTasks(status = null) {
        const params = status ? `?status=${encodeURIComponent(status)}` : '';
        return this.request(`/tasks${params}`);
    },

    /**
     * Get a single task by ID
     */
    async getTask(taskId) {
        return this.request(`/tasks/${taskId}`);
    },

    /**
     * Create a new task
     */
    async createTask(taskData) {
        return this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    },

    /**
     * Update an existing task
     */
    async updateTask(taskId, taskData) {
        return this.request(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(taskData)
        });
    },

    /**
     * Delete a task
     */
    async deleteTask(taskId) {
        return this.request(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
    },

    // ============================================
    // LOCALSTORAGE FALLBACK (for gradual migration)
    // ============================================

    /**
     * Migrate localStorage data to PostgreSQL
     */
    async migrateLocalStorageToAPI() {
        try {
            const tasksFromStorage = JSON.parse(localStorage.getItem('tasks') || '[]');

            if (tasksFromStorage.length === 0) {
                console.log('No tasks in localStorage to migrate');
                return { migrated: 0, failed: 0 };
            }

            console.log(`Starting migration of ${tasksFromStorage.length} tasks...`);

            let migrated = 0;
            let failed = 0;

            for (const task of tasksFromStorage) {
                try {
                    // Map localStorage task format to API format
                    const apiTask = {
                        title: task.title || task.text || 'Untitled',
                        description: task.description || '',
                        status: task.status || task.column || 'todo',
                        priority: task.priority || 'medium',
                        assigned_to: task.assignedTo || null,
                        team_id: task.teamId || null,
                        due_date: task.dueDate || null,
                        tags: task.tags || [],
                        estimate_hours: task.estimateHours || null
                    };

                    await this.createTask(apiTask);
                    migrated++;
                } catch (error) {
                    console.error(`Failed to migrate task ${task.id}:`, error);
                    failed++;
                }
            }

            console.log(`Migration complete: ${migrated} succeeded, ${failed} failed`);

            // Backup localStorage before clearing
            if (migrated > 0) {
                localStorage.setItem('tasks_backup', localStorage.getItem('tasks'));
                localStorage.setItem('migration_date', new Date().toISOString());
            }

            return { migrated, failed };
        } catch (error) {
            console.error('Migration error:', error);
            throw error;
        }
    },

    /**
     * Check if API is available
     */
    async checkHealth() {
        try {
            const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
};

// ============================================
// DATA MANAGER - Smart layer that uses API or localStorage
// ============================================

const DataManager = {
    useAPI: false,
    initPromise: null,

    /**
     * Initialize and check if API is available
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            const isHealthy = await ApiService.checkHealth();
            this.useAPI = isHealthy;

            if (this.useAPI) {
                console.log('✅ API is available - using PostgreSQL backend');
            } else {
                console.log('⚠️  API is not available - using localStorage fallback');
            }

            return this.useAPI;
        })();

        return this.initPromise;
    },

    /**
     * Get all tasks
     */
    async getTasks(status = null) {
        await this.init();

        if (this.useAPI) {
            return await ApiService.getTasks(status);
        } else {
            // localStorage fallback
            const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            return status ? tasks.filter(t => t.status === status || t.column === status) : tasks;
        }
    },

    /**
     * Save a task (create or update)
     */
    async saveTask(task) {
        await this.init();

        if (this.useAPI) {
            if (task.id && typeof task.id === 'number') {
                return await ApiService.updateTask(task.id, task);
            } else {
                return await ApiService.createTask(task);
            }
        } else {
            // localStorage fallback
            let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');

            if (task.id) {
                const index = tasks.findIndex(t => t.id === task.id);
                if (index !== -1) {
                    tasks[index] = task;
                } else {
                    tasks.push(task);
                }
            } else {
                task.id = 'local_' + Date.now();
                tasks.push(task);
            }

            localStorage.setItem('tasks', JSON.stringify(tasks));
            return task;
        }
    },

    /**
     * Delete a task
     */
    async deleteTask(taskId) {
        await this.init();

        if (this.useAPI) {
            return await ApiService.deleteTask(taskId);
        } else {
            // localStorage fallback
            let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            tasks = tasks.filter(t => t.id !== taskId);
            localStorage.setItem('tasks', JSON.stringify(tasks));
            return true;
        }
    },

    /**
     * Migrate localStorage to API
     */
    async migrate() {
        await this.init();

        if (!this.useAPI) {
            throw new Error('API is not available - cannot migrate');
        }

        return await ApiService.migrateLocalStorageToAPI();
    }
};

// Export for use in other scripts
window.ApiService = ApiService;
window.DataManager = DataManager;
