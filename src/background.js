// Background script for Site Blocker Pro
importScripts('database.js');

const db = new SiteBlockerDB();
let blockingRules = [];
let updateInterval;

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Site Blocker Pro installed');
  await updateBlockingRules();
  startPeriodicUpdate();
});

// Start extension when browser starts
chrome.runtime.onStartup.addListener(async () => {
  console.log('Site Blocker Pro started');
  await updateBlockingRules();
  startPeriodicUpdate();
});

// Start periodic updates
function startPeriodicUpdate() {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  // Update rules every 30 seconds for more responsive blocking
  updateInterval = setInterval(updateBlockingRules, 30000);
}

async function updateBlockingRules() {
  try {
    console.log('Updating blocking rules...');
    const sites = await db.getLockSites();
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');
    const currentDay = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][now.getDay()];

    console.log(`Current time: ${currentTime}, Current day: ${currentDay}`);
    console.log(`Found ${sites.length} configured sites`);

    // Clear existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    if (existingRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRules.map(rule => rule.id)
      });
      console.log(`Removed ${existingRules.length} existing rules`);
    }

    // Create new rules for currently active blocks
    const newRules = [];
    // Use timestamp-based rule IDs to ensure uniqueness
    let ruleId = Date.now() % 1000000; // Use timestamp modulo to keep IDs reasonable

    for (const site of sites) {
      console.log(`Checking site: ${site.url}`);
      console.log(`  Time range: ${site.startDate} - ${site.endDate}`);
      console.log(`  Days: ${site.days}`);
      
      // Check if current day is in the days list
      const siteDays = site.days.split(',').map(d => d.trim());
      if (!siteDays.includes(currentDay)) {
        console.log(`  Skipped - not active on ${currentDay}`);
        continue;
      }

      // Check time range
      if (currentTime >= site.startDate && currentTime <= site.endDate) {
        console.log(`  Active - blocking ${site.url}`);
        
        let urlFilter;
        if (site.url.endsWith('*')) {
          // For wildcard URLs like "facebook.com/*"
          urlFilter = '*://*.' + site.url.slice(0, -1) + '*';
          // Also block the main domain
          newRules.push({
            id: ruleId++,
            priority: 1,
            action: {
              type: 'redirect',
              redirect: {
                extensionPath: '/blocked.html'
              }
            },
            condition: {
              urlFilter: '*://' + site.url.slice(0, -1) + '*',
              resourceTypes: ['main_frame']
            }
          });
        } else {
          // For specific URLs
          urlFilter = '*://*' + site.url + '*';
        }

        newRules.push({
          id: ruleId++,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: {
              extensionPath: '/blocked.html'
            }
          },
          condition: {
            urlFilter: urlFilter,
            resourceTypes: ['main_frame']
          }
        });
      } else {
        console.log(`  Not active - current time ${currentTime} not in range ${site.startDate}-${site.endDate}`);
      }
    }

    if (newRules.length > 0) {
      // Validate that all rule IDs are unique
      const ruleIds = newRules.map(r => r.id);
      const uniqueIds = new Set(ruleIds);
      if (ruleIds.length !== uniqueIds.size) {
        console.error('Duplicate rule IDs detected, regenerating...');
        // Regenerate with sequential IDs
        newRules.forEach((rule, index) => {
          rule.id = ruleId + index;
        });
      }
      
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules
      });
      console.log(`Added ${newRules.length} blocking rules`);
      console.log('Active rules:', newRules.map(r => ({ id: r.id, urlFilter: r.condition.urlFilter })));
    } else {
      console.log('No active blocking rules');
    }

    blockingRules = newRules;
  } catch (error) {
    console.error('Error updating blocking rules:', error);
  }
}

// Listen for storage changes to update rules
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.lockSites) {
    console.log('Sites configuration changed, updating rules...');
    updateBlockingRules();
  }
});

// Listen for tab updates to check blocking in real-time
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const shouldBlock = await db.shouldBlockUrl(tab.url);
    if (shouldBlock) {
      console.log(`Blocking navigation to ${tab.url}`);
      chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(tab.url)
      });
    }
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateRules') {
    console.log('Manual rule update requested');
    updateBlockingRules().then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }
});