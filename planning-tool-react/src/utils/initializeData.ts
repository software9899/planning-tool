// Initialize default data in localStorage if not exists

export function initializeDefaultData() {
  // Members are now loaded from database via API - no default members needed

  // Initialize task types if not exists
  if (!localStorage.getItem('taskTypes')) {
    const defaultTypes = ['Feature', 'Bug Fix', 'Enhancement', 'Documentation', 'Research', 'Refactoring'];
    localStorage.setItem('taskTypes', JSON.stringify(defaultTypes));
  }

  // Initialize priorities if not exists
  if (!localStorage.getItem('priorities')) {
    const defaultPriorities = ['Low', 'Medium', 'High'];
    localStorage.setItem('priorities', JSON.stringify(defaultPriorities));
  }

  // Initialize priority mapping if not exists
  if (!localStorage.getItem('priorityMapping')) {
    const defaultMapping = {
      'Feature': 'Medium',
      'Bug Fix': 'High',
      'Enhancement': 'Medium',
      'Documentation': 'Low',
      'Research': 'Medium',
      'Refactoring': 'Medium'
    };
    localStorage.setItem('priorityMapping', JSON.stringify(defaultMapping));
  }

  // Current user is now set via authentication - no default user needed
}
