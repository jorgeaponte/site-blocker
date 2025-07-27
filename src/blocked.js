// Blocked page script for Site Blocker Pro

// Update current time
function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  document.getElementById('currentTime').textContent = timeString;
}

// Show blocked URL
function showBlockedUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  let blockedUrl = urlParams.get('url') || document.referrer || window.location.href;
  
  // Clean up the URL for display
  if (blockedUrl.includes('chrome-extension://')) {
    blockedUrl = 'Blocked Website';
  }
  
  document.getElementById('blockedUrl').textContent = blockedUrl;
}

// Go back function
function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = 'about:blank';
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize
  updateTime();
  showBlockedUrl();
  setInterval(updateTime, 1000);

  // Add event listener for Go Back button
  const goBackBtn = document.getElementById('goBackBtn');
  if (goBackBtn) {
    goBackBtn.addEventListener('click', goBack);
  }

  // Handle keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      goBack();
    }
  });
});
