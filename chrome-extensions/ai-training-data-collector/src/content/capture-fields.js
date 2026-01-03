/**
 * Content Script: Captures input fields and dropdowns on page changes
 */

console.log('🤖 AI Training Data Collector - Content Script Loaded');

// Track the current URL to detect page changes
let currentUrl = window.location.href;

/**
 * Check if an element is visible to the user
 */
function isElementVisible(element) {
  // Check if element exists
  if (!element) return false;

  // Get computed styles
  const style = window.getComputedStyle(element);

  // Check display and visibility
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;

  // Check dimensions
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  // Check if element is in viewport or scrollable area
  // (we don't require it to be in current viewport, just to have dimensions)

  return true;
}

/**
 * Check if field is interactive (not disabled, not readonly for inputs we care about)
 */
function isFieldInteractive(element) {
  // Skip disabled fields
  if (element.disabled) return false;

  // For inputs, skip readonly fields unless they're selectable types
  if (element.tagName === 'INPUT') {
    const type = element.type.toLowerCase();

    // These types should not be readonly
    const editableTypes = ['text', 'email', 'password', 'tel', 'url', 'search', 'number', 'date', 'time', 'datetime-local', 'month', 'week'];

    if (editableTypes.includes(type) && element.readOnly) {
      return false;
    }

    // Skip hidden input fields (type="hidden")
    if (type === 'hidden') return false;
  }

  return true;
}

/**
 * Capture all visible and interactive input fields and dropdowns on the page
 */
function capturePageFields() {
  const timestamp = new Date().toISOString();
  const url = window.location.href;
  const pageTitle = document.title;

  // Find all input fields that are visible and interactive
  const inputs = Array.from(document.querySelectorAll('input'))
    .filter(input => isElementVisible(input) && isFieldInteractive(input))
    .map((input, index) => {
    return {
      type: 'input',
      inputType: input.type,
      id: input.id || `input-${index}`,
      name: input.name || '',
      placeholder: input.placeholder || '',
      value: input.value || '',
      label: findLabelForInput(input),
      required: input.required,
      className: input.className,
      ariaLabel: input.getAttribute('aria-label') || ''
    };
  });

  // Find all select/dropdown fields that are visible and interactive
  const selects = Array.from(document.querySelectorAll('select'))
    .filter(select => isElementVisible(select) && isFieldInteractive(select))
    .map((select, index) => {
    const options = Array.from(select.options).map(opt => ({
      text: opt.text,
      value: opt.value,
      selected: opt.selected
    }));

    return {
      type: 'select',
      id: select.id || `select-${index}`,
      name: select.name || '',
      label: findLabelForInput(select),
      options: options,
      selectedValue: select.value,
      selectedText: select.options[select.selectedIndex]?.text || '',
      required: select.required,
      className: select.className,
      ariaLabel: select.getAttribute('aria-label') || ''
    };
  });

  // Find all textareas that are visible and interactive
  const textareas = Array.from(document.querySelectorAll('textarea'))
    .filter(textarea => isElementVisible(textarea) && isFieldInteractive(textarea))
    .map((textarea, index) => {
    return {
      type: 'textarea',
      id: textarea.id || `textarea-${index}`,
      name: textarea.name || '',
      placeholder: textarea.placeholder || '',
      value: textarea.value || '',
      label: findLabelForInput(textarea),
      required: textarea.required,
      className: textarea.className,
      ariaLabel: textarea.getAttribute('aria-label') || ''
    };
  });

  const capturedData = {
    timestamp,
    url,
    pageTitle,
    fields: {
      inputs,
      selects,
      textareas
    },
    totalFields: inputs.length + selects.length + textareas.length,
    metadata: {
      captureType: 'visible-interactive-only',
      filterCriteria: 'Visible to user and interactive (not hidden, not disabled, not readonly)'
    }
  };

  console.log('📊 Captured visible & interactive fields:', capturedData);
  console.log(`✅ ${capturedData.totalFields} fields captured (${inputs.length} inputs, ${selects.length} selects, ${textareas.length} textareas)`);

  // Send to background script for storage
  chrome.runtime.sendMessage({
    action: 'saveTrainingData',
    data: capturedData
  });

  return capturedData;
}

/**
 * Find the label associated with an input element
 */
function findLabelForInput(element) {
  // Try to find label by 'for' attribute
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) return label.textContent.trim();
  }

  // Try to find parent label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    return parentLabel.textContent.replace(element.value, '').trim();
  }

  // Try to find previous sibling label
  let prev = element.previousElementSibling;
  while (prev) {
    if (prev.tagName === 'LABEL') {
      return prev.textContent.trim();
    }
    prev = prev.previousElementSibling;
  }

  return '';
}

/**
 * Detect page changes (including SPA navigation)
 */
function detectPageChange() {
  const newUrl = window.location.href;

  if (newUrl !== currentUrl) {
    console.log('🔄 Page changed:', currentUrl, '→', newUrl);
    currentUrl = newUrl;

    // Wait a bit for the page to render
    setTimeout(() => {
      capturePageFields();
    }, 1000);
  }
}

// Initial capture on page load
window.addEventListener('load', () => {
  setTimeout(() => {
    capturePageFields();
  }, 1000);
});

// Watch for URL changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    detectPageChange();
  }
}).observe(document, { subtree: true, childList: true });

// Also listen for history changes
window.addEventListener('popstate', detectPageChange);
window.addEventListener('pushstate', detectPageChange);
window.addEventListener('replacestate', detectPageChange);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureNow') {
    const data = capturePageFields();
    sendResponse({ success: true, data });
  }
});
