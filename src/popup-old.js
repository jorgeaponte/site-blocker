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
});

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
  event.target.classList.add('active');
  document.getElementById(tabName + 'Tab').classList.add('active');
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

async function addSite() {
  const url = document.getElementById('siteUrl').value.trim();
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const days = getSelectedDays();
  const messageDiv = document.getElementById('addMessage');

  messageDiv.className = '';
  messageDiv.textContent = '';

  if (!url || !startTime || !endTime || !days) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Please fill in all fields';
    return;
  }

  try {
    await db.updateLockSite(id, url, startTime, endTime, days);
    messageDiv.className = 'success';
    messageDiv.textContent = 'Site updated successfully!';
    
    // Clear form and reset button
    document.getElementById('siteUrl').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.querySelectorAll('#addTab input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    const addButton = document.querySelector('#addTab button');
    addButton.textContent = 'Add Site';
    addButton.onclick = addSite;

    // Update blocking rules
    chrome.runtime.sendMessage({ action: 'updateRules' });
    
    // Switch back to manage tab and refresh
    switchTab('manage');
    document.querySelector('.tab[onclick="switchTab(\'manage\')"]').click();
    loadSites();
  } catch (error) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Error updating site: ' + error.message;
  }
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

// Helper function to validate time format
function isValidTime(timeString) {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

// Helper function to validate URL format
function isValidUrl(url) {
  if (!url || url.trim() === '') return false;
  
  // Allow domains with or without wildcards
  const urlRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*(\*)?$/;
  return urlRegex.test(url.trim());
}

// Enhanced add site function with validation
async function addSiteEnhanced() {
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
    messageDiv.textContent = 'Please enter a valid URL (e.g., example.com or example.com/*)';
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

// Enhanced import sites function with better validation
async function importSitesEnhanced() {
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
    messageDiv.textContent = `Invalid URLs found: ${invalidUrls.join(', ')}`;
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

// Add event listeners for form validation
document.addEventListener('DOMContentLoaded', () => {
  // Real-time URL validation
  const urlInput = document.getElementById('siteUrl');
  if (urlInput) {
    urlInput.addEventListener('blur', function() {
      const url = this.value.trim();
      if (url && !isValidUrl(url)) {
        this.style.borderColor = '#f44336';
        this.title = 'Please enter a valid URL (e.g., example.com or example.com/*)';
      } else {
        this.style.borderColor = '#ddd';
        this.title = '';
      }
    });
  }

  // Time validation
  const timeInputs = document.querySelectorAll('input[type="time"]');
  timeInputs.forEach(input => {
    input.addEventListener('change', function() {
      if (!isValidTime(this.value)) {
        this.style.borderColor = '#f44336';
      } else {
        this.style.borderColor = '#ddd';
      }
    });
  });
});

// Handle Enter key in login form
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const loginForm = document.querySelector('.login-form');
    if (loginForm.classList.contains('active')) {
      login();
    }
  }
});

// Replace the original functions with enhanced versions
window.addSite = addSiteEnhanced;
window.importSites = importSitesEnhanced;

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + 1, 2, 3 to switch tabs
  if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '3') {
    e.preventDefault();
    const tabs = ['add', 'import', 'manage'];
    const tabIndex = parseInt(e.key) - 1;
    if (tabs[tabIndex]) {
      switchTab(tabs[tabIndex]);
      document.querySelector(`.tab[onclick="switchTab('${tabs[tabIndex]}')"]`).click();
    }
  }
  
  // Ctrl/Cmd + R to refresh sites list
  if ((e.ctrlKey || e.metaKey) && e.key === 'r' && document.getElementById('manageTab').classList.contains('active')) {
    e.preventDefault();
    loadSites();
  }
});

  try {
    await db.createLockSite(url, startTime, endTime, days, currentUser.id);
    messageDiv.className = 'success';
    messageDiv.textContent = 'Site added successfully!';
    
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
    return;
  }

  const urls = urlsText.split('\n').filter(url => url.trim() !== '');
  if (urls.length === 0) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Please enter at least one URL';
    return;
  }

  try {
    await db.importSites(urls, startTime, endTime, days, currentUser.id);
    messageDiv.className = 'success';
    messageDiv.textContent = `Successfully imported ${urls.length} sites!`;
    
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
            <button onclick="editSite(${site.id})">Edit</button>
            <button onclick="deleteSite(${site.id})" class="danger">Delete</button>
          </div>
        </div>
      `;
    });
    
    sitesListDiv.innerHTML = html;
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
    loadSites();
    
    // Update blocking rules
    chrome.runtime.sendMessage({ action: 'updateRules' });
  } catch (error) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Error deleting site: ' + error.message;
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
  switchTab('add');
  document.querySelector('.tab[onclick="switchTab(\'add\')"]').click();
  
  document.getElementById('siteUrl').value = site.url;
  document.getElementById('startTime').value = site.startDate;
  document.getElementById('endTime').value = site.endDate;
  setSelectedDays(site.days);

  // Change the add button to update button temporarily
  const addButton = document.querySelector('#addTab button');
  addButton.textContent = 'Update Site';
  addButton.onclick = () => updateSite(id);
}

async function updateSite(id) {
  const url = document.getElementById('siteUrl').value.trim();
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const days = getSelectedDays();
  const messageDiv = document.getElementById('addMessage');

  messageDiv.className = '';
  messageDiv.textContent = '';

  if (!url || !startTime || !endTime || !days) {
    messageDiv.className = 'error';
    messageDiv.textContent = 'Please fill in all fields';
    return;
  