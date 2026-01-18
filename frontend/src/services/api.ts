// Type definitions
export type Task = {
  id?: number | string;
  title?: string;
  text?: string;
  description?: string;
  status?: string;
  column?: string;
  priority?: string;
  type?: string;
  assignedTo?: string;
  assigned_to?: string;
  assignee?: string | string[];
  teamId?: number;
  team_id?: number;
  team?: string;
  dueDate?: string;
  due_date?: string;
  tags?: string[];
  estimateHours?: number;
  estimate_hours?: number;
  createdAt?: string;
  created_at?: string;
  createdBy?: string;
  created_by?: string;
  updatedAt?: string;
  updated_at?: string;
  updatedBy?: string;
  updated_by?: string;
  subtasks?: any[];
  labels?: any[];
  size?: string;
  blocked?: boolean;
  readinessChecklist?: Array<{
    id: string;
    text: string;
    checked: boolean;
  }>;
  readiness_checklist?: Array<{
    id: string;
    text: string;
    checked: boolean;
  }>;
};

export type Setting = {
  id: number;
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
};

// Subscription & AI Provider Types
export type Plan = {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_users: number;
  max_tasks: number;
  max_teams: number;
  max_storage_mb: number;
  max_projects: number;
  features: Record<string, any>;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
};

export type Tenant = {
  id: number;
  uuid?: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  email: string;
  timezone: string;
  plan_id: number;
  subscription_status: string;
  trial_ends_at?: string;
  subscription_ends_at?: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
};

export type SubscriptionInfo = {
  tenant: Tenant;
  plan: Plan;
  usage: {
    users: { current: number; limit: number };
    tasks: { current: number; limit: number };
    teams: { current: number; limit: number };
    storage_mb: { current: number; limit: number };
    projects: { current: number; limit: number };
  };
};

export type AIProviderKey = {
  id: number;
  tenant_id: number;
  user_id?: number;
  provider: string;
  name: string;
  model?: string;
  base_url?: string;
  settings: Record<string, any>;
  is_active: boolean;
  last_used_at?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
  api_key_masked: string;
};

export type AIProviderKeyCreate = {
  provider: string;
  name: string;
  api_key: string;
  model?: string;
  base_url?: string;
  settings?: Record<string, any>;
};

export type AIProviderTestResponse = {
  success: boolean;
  message: string;
  models?: string[];
};

// Guest Trial Admin Types
export type GuestTrialStats = {
  total_guests: number;
  active_guests: number;
  total_translations: number;
  translations_today: number;
  top_translated_texts: { text: string; count: number }[];
};

export type GuestTrialAdmin = {
  id: number;
  session_id: string;
  username: string;
  ip_address?: string;
  usage_count: number;
  max_uses: number;
  created_at: string;
  expires_at: string;
  last_used_at?: string;
  is_active: boolean;
};

export type GuestTranslationLog = {
  id: number;
  session_id: string;
  original_text: string;
  translated_text?: string;
  detected_language?: string;
  created_at: string;
};

interface MigrationResult {
  migrated: number;
  failed: number;
}

// Determine API base URL based on current hostname
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;

  // Check for environment variable first (set in .env file)
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    return envApiUrl;
  }

  // Local development (Vite dev server or Docker)
  if (hostname === 'localhost' && (window.location.port === '5173' || window.location.port === '3001')) {
    return 'http://localhost:8002/api';
  }

  // ngrok frontend - use ngrok backend (read from localStorage if set)
  if (hostname.includes('ngrok-free.app') || hostname.includes('ngrok.io')) {
    const ngrokBackendUrl = localStorage.getItem('ngrok_backend_url');
    if (ngrokBackendUrl) {
      return ngrokBackendUrl + '/api';
    }
    // Fallback - will need to be updated when ngrok restarts
    console.warn('ngrok backend URL not set. Use localStorage.setItem("ngrok_backend_url", "https://xxx.ngrok-free.app")');
    return 'http://localhost:8002/api';
  }

  // Production (proxied through Nginx)
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiServiceClass {
  /**
   * Generic fetch wrapper with error handling
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
        return null as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ============================================
  // TASKS API
  // ============================================

  /**
   * Get all tasks or filter by status
   */
  async getTasks(status: string | null = null): Promise<Task[]> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<Task[]>(`/tasks${params}`);
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: number | string): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}`);
  }

  /**
   * Create a new task
   */
  async createTask(taskData: Partial<Task>): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: number | string, taskData: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: number | string): Promise<void> {
    return this.request<void>(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
  }

  // ============================================
  // AUTHENTICATION API
  // ============================================

  /**
   * Register a new user
   */
  async registerUser(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<any> {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  /**
   * Login user and get JWT token
   */
  async loginUser(credentials: {
    email: string;
    password: string;
  }): Promise<{ access_token: string; token_type: string }> {
    return this.request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  // ============================================
  // USERS API
  // ============================================

  /**
   * Get all users
   */
  async getUsers(): Promise<any[]> {
    return this.request<any[]>('/users');
  }

  /**
   * Get a single user by ID
   */
  async getUser(userId: number): Promise<any> {
    return this.request<any>(`/users/${userId}`);
  }

  // ============================================
  // SETTINGS API
  // ============================================

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<Setting[]> {
    return this.request<Setting[]>('/settings');
  }

  /**
   * Get a single setting by key
   */
  async getSetting(key: string): Promise<Setting> {
    return this.request<Setting>(`/settings/${key}`);
  }

  /**
   * Create a new setting
   */
  async createSetting(settingData: { key: string; value: string; description?: string }): Promise<Setting> {
    return this.request<Setting>('/settings', {
      method: 'POST',
      body: JSON.stringify(settingData)
    });
  }

  /**
   * Update an existing setting (or create if not exists)
   */
  async updateSetting(key: string, settingData: { value: string; description?: string }): Promise<Setting> {
    return this.request<Setting>(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify(settingData)
    });
  }

  /**
   * Delete a setting
   */
  async deleteSetting(key: string): Promise<void> {
    return this.request<void>(`/settings/${key}`, {
      method: 'DELETE'
    });
  }

  // ============================================
  // SUBSCRIPTION API
  // ============================================

  /**
   * Get all available subscription plans
   */
  async getPlans(): Promise<Plan[]> {
    return this.request<Plan[]>('/subscription/plans');
  }

  /**
   * Get subscription info for current tenant
   */
  async getSubscriptionInfo(tenantId: number = 1): Promise<SubscriptionInfo> {
    return this.request<SubscriptionInfo>(`/subscription/info?tenant_id=${tenantId}`);
  }

  /**
   * Update tenant settings
   */
  async updateTenant(tenantData: Partial<Tenant>, tenantId: number = 1): Promise<Tenant> {
    return this.request<Tenant>(`/subscription/tenant?tenant_id=${tenantId}`, {
      method: 'PUT',
      body: JSON.stringify(tenantData)
    });
  }

  // ============================================
  // AI PROVIDER KEYS API
  // ============================================

  /**
   * Get all AI provider keys for tenant (masked)
   */
  async getAIProviderKeys(tenantId: number = 1): Promise<AIProviderKey[]> {
    return this.request<AIProviderKey[]>(`/subscription/ai-keys?tenant_id=${tenantId}`);
  }

  /**
   * Create a new AI provider key
   */
  async createAIProviderKey(keyData: AIProviderKeyCreate, tenantId: number = 1): Promise<AIProviderKey> {
    return this.request<AIProviderKey>(`/subscription/ai-keys?tenant_id=${tenantId}`, {
      method: 'POST',
      body: JSON.stringify(keyData)
    });
  }

  /**
   * Update an AI provider key
   */
  async updateAIProviderKey(keyId: number, keyData: Partial<AIProviderKeyCreate>, tenantId: number = 1): Promise<AIProviderKey> {
    return this.request<AIProviderKey>(`/subscription/ai-keys/${keyId}?tenant_id=${tenantId}`, {
      method: 'PUT',
      body: JSON.stringify(keyData)
    });
  }

  /**
   * Delete an AI provider key
   */
  async deleteAIProviderKey(keyId: number, tenantId: number = 1): Promise<void> {
    return this.request<void>(`/subscription/ai-keys/${keyId}?tenant_id=${tenantId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Test an AI provider API key
   */
  async testAIProviderKey(testData: { provider: string; api_key: string; model?: string }): Promise<AIProviderTestResponse> {
    return this.request<AIProviderTestResponse>('/subscription/ai-keys/test', {
      method: 'POST',
      body: JSON.stringify(testData)
    });
  }

  // ============================================
  // GUEST TRIAL ADMIN API
  // ============================================

  /**
   * Get guest trial statistics
   */
  async getGuestTrialStats(): Promise<GuestTrialStats> {
    return this.request<GuestTrialStats>('/guest/admin/stats');
  }

  /**
   * Get list of guest trials
   */
  async getGuestTrials(skip: number = 0, limit: number = 50, activeOnly: boolean = false): Promise<GuestTrialAdmin[]> {
    return this.request<GuestTrialAdmin[]>(`/guest/admin/trials?skip=${skip}&limit=${limit}&active_only=${activeOnly}`);
  }

  /**
   * Get translation logs
   */
  async getGuestTranslationLogs(skip: number = 0, limit: number = 100, sessionId?: string): Promise<GuestTranslationLog[]> {
    let url = `/guest/admin/translations?skip=${skip}&limit=${limit}`;
    if (sessionId) {
      url += `&session_id=${sessionId}`;
    }
    return this.request<GuestTranslationLog[]>(url);
  }

  // ============================================
  // LOCALSTORAGE FALLBACK (for gradual migration)
  // ============================================

  /**
   * Migrate localStorage data to PostgreSQL
   */
  async migrateLocalStorageToAPI(): Promise<MigrationResult> {
    try {
      const tasksFromStorage: Task[] = JSON.parse(localStorage.getItem('tasks') || '[]');

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
          const apiTask: Partial<Task> = {
            title: task.title || task.text || 'Untitled',
            description: task.description || '',
            status: task.status || task.column || 'todo',
            priority: task.priority || 'medium',
            assigned_to: task.assignedTo || undefined,
            team_id: task.teamId || undefined,
            due_date: task.dueDate || undefined,
            tags: task.tags || [],
            estimate_hours: task.estimateHours || undefined
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
        const tasksBackup = localStorage.getItem('tasks');
        if (tasksBackup) {
          localStorage.setItem('tasks_backup', tasksBackup);
        }
        localStorage.setItem('migration_date', new Date().toISOString());
      }

      return { migrated, failed };
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  }

  /**
   * Check if API is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// ============================================
// DATA MANAGER - Smart layer that uses API or localStorage
// ============================================

class DataManagerClass {
  useAPI = false;
  initPromise: Promise<boolean> | null = null;

  /**
   * Initialize and check if API is available
   */
  async init(): Promise<boolean> {
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
  }

  /**
   * Get all tasks
   */
  async getTasks(status: string | null = null): Promise<Task[]> {
    await this.init();

    if (this.useAPI) {
      return await ApiService.getTasks(status);
    } else {
      // localStorage fallback
      const tasks: Task[] = JSON.parse(localStorage.getItem('tasks') || '[]');
      return status ? tasks.filter(t => t.status === status || t.column === status) : tasks;
    }
  }

  /**
   * Get current user from authentication
   */
  getCurrentUser(): { name: string; email: string } | null {
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
      try {
        return JSON.parse(currentUserData);
      } catch (e) {
        return null;
      }
    }

    // No user logged in
    return null;
  }

  /**
   * Save a task (create or update)
   */
  async saveTask(task: Task): Promise<Task> {
    await this.init();

    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    if (this.useAPI) {
      // Check if task exists in database by trying to fetch it
      let taskExists = false;
      if (task.id && typeof task.id === 'number' && task.id < 1000000000000) {
        // Only check if ID looks like a database ID (not a timestamp)
        try {
          await ApiService.getTask(task.id);
          taskExists = true;
        } catch (error) {
          // Task doesn't exist, will create new one
          taskExists = false;
        }
      }

      if (taskExists) {
        // Update existing task
        const taskWithMeta = {
          ...task,
          updatedAt: now,
          updated_at: now,
          updatedBy: currentUser.name,
          updated_by: currentUser.name
        };
        return await ApiService.updateTask(task.id, taskWithMeta);
      } else {
        // Create new task (remove temporary ID)
        const { id, ...taskWithoutId } = task;
        const taskWithMeta = {
          ...taskWithoutId,
          createdAt: now,
          created_at: now,
          createdBy: currentUser.name,
          created_by: currentUser.name,
          updatedAt: now,
          updated_at: now,
          updatedBy: currentUser.name,
          updated_by: currentUser.name
        };
        return await ApiService.createTask(taskWithMeta);
      }
    } else {
      // localStorage fallback
      let tasks: Task[] = JSON.parse(localStorage.getItem('tasks') || '[]');

      if (task.id) {
        const index = tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          // Update existing task
          tasks[index] = {
            ...task,
            updatedAt: now,
            updated_at: now,
            updatedBy: currentUser.name,
            updated_by: currentUser.name
          };
        } else {
          // New task with existing ID
          tasks.push({
            ...task,
            createdAt: now,
            created_at: now,
            createdBy: currentUser.name,
            created_by: currentUser.name,
            updatedAt: now,
            updated_at: now,
            updatedBy: currentUser.name,
            updated_by: currentUser.name
          });
        }
      } else {
        // New task without ID
        const newTask = {
          ...task,
          id: 'local_' + Date.now(),
          createdAt: now,
          created_at: now,
          createdBy: currentUser.name,
          created_by: currentUser.name,
          updatedAt: now,
          updated_at: now,
          updatedBy: currentUser.name,
          updated_by: currentUser.name
        };
        tasks.push(newTask);
        task = newTask;
      }

      localStorage.setItem('tasks', JSON.stringify(tasks));
      return task;
    }
  }

  /**
   * Update a task
   */
  async updateTask(task: Task): Promise<Task> {
    await this.init();

    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    const taskWithMeta = {
      ...task,
      updatedAt: now,
      updated_at: now,
      updatedBy: currentUser.name,
      updated_by: currentUser.name
    };

    if (this.useAPI) {
      if (task.id && typeof task.id === 'number') {
        return await ApiService.updateTask(task.id, taskWithMeta);
      } else {
        throw new Error('Task ID is required for update');
      }
    } else {
      // localStorage fallback
      let tasks: Task[] = JSON.parse(localStorage.getItem('tasks') || '[]');
      const index = tasks.findIndex(t => t.id === task.id);

      if (index !== -1) {
        tasks[index] = taskWithMeta;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        return taskWithMeta;
      } else {
        throw new Error('Task not found');
      }
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: number | string): Promise<boolean> {
    await this.init();

    if (this.useAPI) {
      await ApiService.deleteTask(taskId);
      return true;
    } else {
      // localStorage fallback
      let tasks: Task[] = JSON.parse(localStorage.getItem('tasks') || '[]');
      tasks = tasks.filter(t => t.id !== taskId);
      localStorage.setItem('tasks', JSON.stringify(tasks));
      return true;
    }
  }

  /**
   * Migrate localStorage to API
   */
  async migrate(): Promise<MigrationResult> {
    await this.init();

    if (!this.useAPI) {
      throw new Error('API is not available - cannot migrate');
    }

    return await ApiService.migrateLocalStorageToAPI();
  }

  /**
   * Get settings from API
   */
  async getSettings(): Promise<any> {
    await this.init();

    if (this.useAPI) {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('Failed to fetch settings');
        const settingsList = await response.json();

        // Convert array of settings to object
        const settings: any = {
          taskTypes: [],
          checklistTemplates: {}
        };

        settingsList.forEach((setting: any) => {
          try {
            const value = JSON.parse(setting.value);
            if (setting.key === 'taskTypes') {
              settings.taskTypes = value;
            } else if (setting.key === 'checklistTemplates') {
              settings.checklistTemplates = value;
            }
          } catch (e) {
            // If parsing fails, use raw value
            settings[setting.key] = setting.value;
          }
        });

        return settings;
      } catch (error) {
        console.error('Error fetching settings from API:', error);
        return null;
      }
    } else {
      // localStorage fallback
      const stored = localStorage.getItem('appSettings');
      return stored ? JSON.parse(stored) : null;
    }
  }

  /**
   * Save settings to API
   */
  async saveSettings(settings: any): Promise<void> {
    await this.init();

    if (this.useAPI) {
      try {
        // Save checklistTemplates
        if (settings.checklistTemplates !== undefined) {
          await fetch('/api/settings/checklistTemplates', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              value: JSON.stringify(settings.checklistTemplates),
              description: 'Readiness checklist templates for each task type'
            })
          });
        }

        // Save taskTypes
        if (settings.taskTypes !== undefined) {
          await fetch('/api/settings/taskTypes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              value: JSON.stringify(settings.taskTypes),
              description: 'Available task types'
            })
          });
        }
      } catch (error) {
        console.error('Error saving settings to API:', error);
      }
    }

    // Always save to localStorage as backup
    const currentSettings = localStorage.getItem('appSettings');
    const parsed = currentSettings ? JSON.parse(currentSettings) : {};
    const updated = { ...parsed, ...settings };
    localStorage.setItem('appSettings', JSON.stringify(updated));
  }
}

// Export singleton instances
export const ApiService = new ApiServiceClass();
export const DataManager = new DataManagerClass();

// Export authentication functions for convenience
export const registerUser = (userData: { name: string; email: string; password: string; role?: string }) =>
  ApiService.registerUser(userData);

export const loginUser = (credentials: { email: string; password: string }) =>
  ApiService.loginUser(credentials);

// Export users functions for convenience
export const getUsers = () => ApiService.getUsers();
export const getUser = (userId: number) => ApiService.getUser(userId);

// Export settings functions for convenience
export const getAllSettings = () => ApiService.getAllSettings();
export const getSetting = (key: string) => ApiService.getSetting(key);
export const createSetting = (settingData: { key: string; value: string; description?: string }) =>
  ApiService.createSetting(settingData);
export const updateSetting = (key: string, settingData: { value: string; description?: string }) =>
  ApiService.updateSetting(key, settingData);
export const deleteSetting = (key: string) => ApiService.deleteSetting(key);

// Export subscription functions for convenience
export const getPlans = () => ApiService.getPlans();
export const getSubscriptionInfo = (tenantId?: number) => ApiService.getSubscriptionInfo(tenantId);
export const updateTenant = (tenantData: Partial<Tenant>, tenantId?: number) =>
  ApiService.updateTenant(tenantData, tenantId);

// Export AI provider key functions for convenience
export const getAIProviderKeys = (tenantId?: number) => ApiService.getAIProviderKeys(tenantId);
export const createAIProviderKey = (keyData: AIProviderKeyCreate, tenantId?: number) =>
  ApiService.createAIProviderKey(keyData, tenantId);
export const updateAIProviderKey = (keyId: number, keyData: Partial<AIProviderKeyCreate>, tenantId?: number) =>
  ApiService.updateAIProviderKey(keyId, keyData, tenantId);
export const deleteAIProviderKey = (keyId: number, tenantId?: number) =>
  ApiService.deleteAIProviderKey(keyId, tenantId);
export const testAIProviderKey = (testData: { provider: string; api_key: string; model?: string }) =>
  ApiService.testAIProviderKey(testData);

// Export guest trial admin functions for convenience
export const getGuestTrialStats = () => ApiService.getGuestTrialStats();
export const getGuestTrials = (skip?: number, limit?: number, activeOnly?: boolean) =>
  ApiService.getGuestTrials(skip, limit, activeOnly);
export const getGuestTranslationLogs = (skip?: number, limit?: number, sessionId?: string) =>
  ApiService.getGuestTranslationLogs(skip, limit, sessionId);
