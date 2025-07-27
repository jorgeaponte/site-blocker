// Popup script for Site Blocker Pro
const db = new SiteBlockerDB();
let currentUser = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in (session storage)
  const sessionUser = sessionStorage.getItem('currentUser');
  if (sessionUser) {
    currentUser = JSON.parse(sessionUser);
    showMainPanel();
    loadSites();
  }
  
  // Setup event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Login button
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', login);
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
  // Add site button
  const addSiteBtn = document.getElementById('addSiteBtn');
  if (addSiteBtn) {
    addSiteBtn.addEventListener('click', addSite);
  }
  
  // Import sites button
  const importSitesBtn = document.getElementById('importSitesBtn');
  if (importSitesBtn) {
    importSitesBtn.addEventListener('click', importSites);
  }
  
  // Refresh sites button
  const refreshSitesBtn = document.getElementById('refreshSitesBtn');
  if (refreshSitesBtn) {
    refreshSitesBtn.addEventListener('click', loadSites);
  }
  
  // Setup validation
  setupValidation();
  
  // Tab switching
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      if (targetTab) {
        switchTab(targetTab);
      }
    });
  });
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('loginError');

  if (!username || !password) {
    errorDiv.textContent = 'Please enter both username and password';
    return;
  }

  try {
    const user = await db.authenticateUser(username, password);
    if (user) {
      currentUser = user;
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      showMainPanel();
      loadSites();
      errorDiv.textContent = '';
    } else {
      errorDiv.textContent = 'Invalid username or password';
    }
  } catch (error) {
    errorDiv.textContent = 'Login error: ' + error.message;
  }
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem('currentUser');
  showLoginForm();
}

function showLoginForm() {
  document.querySelector('.login-form').classList.add('active');
  document.querySelector('.main-panel').classList.remove('active');
}

function showMainPanel() {
  document.querySelector('.login-form').classList.remove('active');
  document.querySelector('.main-panel').classList.add('active');
}

function switchTab(tabName) {
  // Remove active class from all tabs and content
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  // Add active class to selected tab and content
  const targetTab = document.querySelector(`.tab:nth-child(${tabName === 'add' ? '1' : tabName === 'import' ? '2' : '3'})`);
  if (targetTab) targetTab.classList.add('active');
  
  const targetContent = document.getElementById(tabName + 'Tab');
  if (targetContent) targetContent.classList.add('active');
}

function getSelectedDays(prefix = '') {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayValues = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const selected = [];

  days.forEach((day, index) => {
    const checkbox = document.getElementById(prefix + day);
    if (checkbox && checkbox.checked) {
      selected.push(dayValues[index]);
    }
  });

  return selected.join(', ');
}

function setSelectedDays(daysString, prefix = '') {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayValues = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const selectedDays = daysString.split(',').map(d => d.trim());

  days.forEach((day, index) => {
    const checkbox = document.getElementById(prefix + day);
    if (checkbox) {
      checkbox.checked = selectedDays.includes(dayValues[index]);
    }
  });
}

// Helper function to validate time format
function isValidTime(timeString) {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

// Helper function to validate URL format
function isValidUrl(url) {
  if (!url || url.trim() === '') return false;
  
  const cleanUrl = url.trim();
  
  // Allow basic domain formats:
  // - example.com
  // - example.com/*
  // - subdomain.example.com
  // - subdomain.example.com/*
  
  // Remove trailing /* if present for validation
  const urlForValidation = cleanUrl.endsWith('/*') ? cleanUrl.slice(0, -2) : cleanUrl;
  
  // Basic domain validation (allows letters, numbers, hyphens, dots)
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)+$/;
  
  // Check if it's a valid domain
  if (!domainRegex.test(urlForValidation)) {
    return false;
  }
  
  // Additional check: must have at least one dot (for TLD)
  if (!urlForValidation.includes('.')) {
    return false;
  }
  
  // Must not start or end with dot or hyphen
  if (urlForValidation.startsWith('.') || urlForValidation.endsWith('.') || 
      urlForValidation.startsWith('-') || urlForValidation.endsWith('-')) {
    return false;
  }
  
  return true;
}

// Clear messages after some time
function clearMessage(elementId, delay = 3000) {
  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = '';
      element.className = '';
    }
  }, delay);
}

async function addSite() {
  const url = document.getElementById('siteUrl').value.trim();
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const days = getSelectedDays();
  const messageDiv = document.getElementById('addMessage');

  messageDiv.className = '';
  messageDiv.textContent = '';

  // Validation
  if (!url || !startTime || !endTime || !days) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Please fill in all fields';
    clearMessage('addMessage');
    return;
  }

  if (!isValidUrl(url)) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Invalid URL format. Use: example.com or example.com/* (without http://)';
    clearMessage('addMessage');
    return;
  }

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Please enter valid time format (HH:MM)';
    clearMessage('addMessage');
    return;
  }

  if (startTime >= endTime) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'End time must be after start time';
    clearMessage('addMessage');
    return;
  }

  try {
    await db.createLockSite(url, startTime, endTime, days, currentUser.id);
    messageDiv.className = 'success';
    messageDiv.textContent = 'Site added successfully!';
    clearMessage('addMessage');
    
    // Clear form
    document.getElementById('siteUrl').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.querySelectorAll('#addTab input[type="checkbox"]').forEach(cb => cb.checked = false);

    // Update blocking rules
    chrome.runtime.sendMessage({ action: 'updateRules' });
  } catch (error) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Error adding site: ' + error.message;
    clearMessage('addMessage');
  }
}

async function importSites() {
  const urlsText = document.getElementById('importUrls').value.trim();
  const startTime = document.getElementById('importStartTime').value;
  const endTime = document.getElementById('importEndTime').value;
  const days = getSelectedDays('import');
  const messageDiv = document.getElementById('importMessage');

  messageDiv.className = '';
  messageDiv.textContent = '';

  if (!urlsText || !startTime || !endTime || !days) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Please fill in all fields';
    clearMessage('importMessage');
    return;
  }

  const urls = urlsText.split('\n')
    .map(url => url.trim())
    .filter(url => url !== '');

  if (urls.length === 0) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Please enter at least one URL';
    clearMessage('importMessage');
    return;
  }

  // Validate all URLs
  const invalidUrls = urls.filter(url => !isValidUrl(url));
  if (invalidUrls.length > 0) {
    messageDiv.className = 'error';
    messageDiv.textContent = `Invalid URLs found: ${invalidUrls.join(', ')}. Use format: example.com or example.com/*`;
    clearMessage('importMessage');
    return;
  }

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Please enter valid time format (HH:MM)';
    clearMessage('importMessage');
    return;
  }

  if (startTime >= endTime) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'End time must be after start time';
    clearMessage('importMessage');
    return;
  }

  try {
    await db.importSites(urls, startTime, endTime, days, currentUser.id);
    messageDiv.className = 'success';
    messageDiv.textContent = `Successfully imported ${urls.length} sites!`;
    clearMessage('importMessage');
    
    // Clear form
    document.getElementById('importUrls').value = '';
    document.getElementById('importStartTime').value = '';
    document.getElementById('importEndTime').value = '';
    document.querySelectorAll('#importTab input[type="checkbox"]').forEach(cb => cb.checked = false);

    // Update blocking rules
    chrome.runtime.sendMessage({ action: 'updateRules' });
  } catch (error) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Error importing sites: ' + error.message;
    clearMessage('importMessage');
  }
}

async function loadSites() {
  const sitesListDiv = document.getElementById('sitesList');
  const messageDiv = document.getElementById('manageMessage');

  try {
    const sites = await db.getLockSites();
    
    if (sites.length === 0) {
      sitesListDiv.innerHTML = '<p>No blocked sites configured.</p>';
      return;
    }

    let html = '';
    sites.forEach(site => {
      html += `
        <div class="site-item">
          <div class="site-info">
            <div class="site-url">${site.url}</div>
            <div class="site-details">
              ${site.startDate} - ${site.endDate} | ${site.days}
            </div>
          </div>
          <div class="site-actions">
            <button class="edit-btn" data-site-id="${site.id}">Edit</button>
            <button class="delete-btn danger" data-site-id="${site.id}">Delete</button>
          </div>
        </div>
      `;
    });
    
    sitesListDiv.innerHTML = html;
    
    // Add event listeners to the new buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const siteId = parseInt(this.getAttribute('data-site-id'));
        editSite(siteId);
      });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const siteId = parseInt(this.getAttribute('data-site-id'));
        deleteSite(siteId);
      });
    });
    
  } catch (error) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Error loading sites: ' + error.message;
  }
}

async function deleteSite(id) {
  if (!confirm('Are you sure you want to delete this site?')) {
    return;
  }

  const messageDiv = document.getElementById('manageMessage');
  
  try {
    await db.deleteLockSite(id);
    messageDiv.className = 'success';
    messageDiv.textContent = 'Site deleted successfully!';
    clearMessage('manageMessage');
    loadSites();
    
    // Update blocking rules
    chrome.runtime.sendMessage({ action: 'updateRules' });
  } catch (error) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Error deleting site: ' + error.message;
    clearMessage('manageMessage');
  }
}

async function editSite(id) {
  const sites = await db.getLockSites();
  const site = sites.find(s => s.id === id);
  
  if (!site) {
    alert('Site not found');
    return;
  }

  // Switch to add tab and populate with existing data
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  document.querySelector('.tab[data-tab="add"]').classList.add('active');
  document.getElementById('addTab').classList.add('active');
  
  document.getElementById('siteUrl').value = site.url;
  document.getElementById('startTime').value = site.startDate;
  document.getElementById('endTime').value = site.endDate;
  setSelectedDays(site.days);

  // Change the add button to update button temporarily
  const addButton = document.getElementById('addSiteBtn');
  addButton.textContent = 'Update Site';
  addButton.onclick = null;
  addButton.removeEventListener('click', addSite);
  addButton.addEventListener('click', () => updateSite(id));
}

async function updateSite(id) {
  const url = document.getElementById('siteUrl').value.trim();
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const days = getSelectedDays();
  const messageDiv = document.getElementById('addMessage');

  messageDiv.className = '';
  messageDiv.textContent = '';

  // Validation
  if (!url || !startTime || !endTime || !days) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Please fill in all fields';
    clearMessage('addMessage');
    return;
  }

  if (!isValidUrl(url)) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Invalid URL format. Use: example.com or example.com/* (without http://)';
    clearMessage('addMessage');
    return;
  }

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Please enter valid time format (HH:MM)';
    clearMessage('addMessage');
    return;
  }

  if (startTime >= endTime) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'End time must be after start time';
    clearMessage('addMessage');
    return;
  }

  try {
    await db.updateLockSite(id, url, startTime, endTime, days);
    messageDiv.className = 'success';
    messageDiv.textContent = 'Site updated successfully!';
    clearMessage('addMessage');
    
    // Clear form and reset button
    document.getElementById('siteUrl').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.querySelectorAll('#addTab input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    const addButton = document.getElementById('addSiteBtn');
    addButton.textContent = 'Add Site';
    addButton.onclick = null;
    addButton.removeEventListener('click', updateSite);
    addButton.addEventListener('click', addSite);

    // Update blocking rules
    chrome.runtime.sendMessage({ action: 'updateRules' });
    
    // Switch back to manage tab and refresh
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector('.tab[data-tab="manage"]').classList.add('active');
    document.getElementById('manageTab').classList.add('active');
    loadSites();
  } catch (error) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Error updating site: ' + error.message;
    clearMessage('addMessage');
  }
}

// Handle Enter key in login form
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const loginForm = document.querySelector('.login-form');
    if (loginForm.classList.contains('active')) {
      login();
    }
  }
});

// Add real-time validation - moved inside setupEventListeners
function setupValidation() {
  // Real-time URL validation
  const urlInput = document.getElementById('siteUrl');
  if (urlInput) {
    urlInput.addEventListener('blur', function() {
      const url = this.value.trim();
      if (url && !isValidUrl(url)) {
        this.style.borderColor = '#f44336';
        this.style.backgroundColor = '#ffebee';
        this.title = 'Invalid format. Use: example.com or example.com/*';
      } else {
        this.style.borderColor = '#4CAF50';
        this.style.backgroundColor = url ? '#e8f5e8' : '';
        this.title = '';
      }
    });
    
    urlInput.addEventListener('input', function() {
      // Reset styles while typing
      this.style.borderColor = '#ddd';
      this.style.backgroundColor = '';
    });
  }

  // Time validation
  const timeInputs = document.querySelectorAll('input[type="time"]');
  timeInputs.forEach(input => {
    input.addEventListener('change', function() {
      if (!isValidTime(this.value)) {
        this.style.borderColor = '#f44336';
        this.style.backgroundColor = '#ffebee';
      } else {
        this.style.borderColor = '#4CAF50';
        this.style.backgroundColor = '#e8f5e8';
      }
    });
  });
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + 1, 2, 3 to switch tabs
  if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '3') {
    e.preventDefault();
    const tabs = ['add', 'import', 'manage'];
    const tabIndex = parseInt(e.key) - 1;
    if (tabs[tabIndex] && currentUser) {
      // Remove active classes
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // Add active classes
      document.querySelector(`.tab[data-tab="${tabs[tabIndex]}"]`).classList.add('active');
      document.getElementById(tabs[tabIndex] + 'Tab').classList.add('active');
    }
  }
  
  // Ctrl/Cmd + R to refresh sites list
  if ((e.ctrlKey || e.metaKey) && e.key === 'r' && document.getElementById('manageTab').classList.contains('active')) {
    e.preventDefault();
    loadSites();
  }
});