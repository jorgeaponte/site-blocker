// Database utilities for Site Blocker Pro
class SiteBlockerDB {
  constructor() {
    this.initializeDB();
  }

  async initializeDB() {
    // Initialize default admin user
    const users = await this.getUsers();
    if (users.length === 0) {
      await this.createUser('admin', 'adminlock');
    }
  }

  // Encrypt password (simple hash for demo - use bcrypt in production)
  hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Users table operations
  async createUser(username, password) {
    const users = await this.getUsers();
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      userName: username,
      password: this.hashPassword(password),
      timeStamp: new Date().toISOString()
    };
    users.push(newUser);
    await chrome.storage.local.set({ users: users });
    return newUser;
  }

  async getUsers() {
    const result = await chrome.storage.local.get(['users']);
    return result.users || [];
  }

  async authenticateUser(username, password) {
    const users = await this.getUsers();
    const hashedPassword = this.hashPassword(password);
    return users.find(u => u.userName === username && u.password === hashedPassword);
  }

  // LockSites table operations
  async createLockSite(url, startDate, endDate, days, userId) {
    const sites = await this.getLockSites();
    const newSite = {
      id: sites.length > 0 ? Math.max(...sites.map(s => s.id)) + 1 : 1,
      url: url,
      startDate: startDate,
      endDate: endDate,
      days: days,
      timeStamp: new Date().toISOString(),
      idUsuario: userId
    };
    sites.push(newSite);
    await chrome.storage.local.set({ lockSites: sites });
    return newSite;
  }

  async getLockSites() {
    const result = await chrome.storage.local.get(['lockSites']);
    return result.lockSites || [];
  }

  async updateLockSite(id, url, startDate, endDate, days) {
    const sites = await this.getLockSites();
    const index = sites.findIndex(s => s.id === id);
    if (index !== -1) {
      sites[index] = {
        ...sites[index],
        url: url,
        startDate: startDate,
        endDate: endDate,
        days: days
      };
      await chrome.storage.local.set({ lockSites: sites });
      return sites[index];
    }
    return null;
  }

  async deleteLockSite(id) {
    const sites = await this.getLockSites();
    const filteredSites = sites.filter(s => s.id !== id);
    await chrome.storage.local.set({ lockSites: filteredSites });
    return true;
  }

  async importSites(urls, startDate, endDate, days, userId) {
    const sites = await this.getLockSites();
    let maxId = sites.length > 0 ? Math.max(...sites.map(s => s.id)) : 0;
    
    const newSites = urls.map(url => ({
      id: ++maxId,
      url: url.trim(),
      startDate: startDate,
      endDate: endDate,
      days: days,
      timeStamp: new Date().toISOString(),
      idUsuario: userId
    }));

    sites.push(...newSites);
    await chrome.storage.local.set({ lockSites: sites });
    return newSites;
  }

  // Check if a URL should be blocked at current time
  async shouldBlockUrl(url) {
    const sites = await this.getLockSites();
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');
    const currentDay = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][now.getDay()];

    console.log(`Checking URL: ${url} at time: ${currentTime} on day: ${currentDay}`);

    for (const site of sites) {
      console.log(`Checking against site: ${site.url}, time: ${site.startDate}-${site.endDate}, days: ${site.days}`);
      
      // Check if current day is in the days list
      const siteDays = site.days.split(',').map(d => d.trim());
      if (!siteDays.includes(currentDay)) {
        console.log(`Day ${currentDay} not in ${siteDays}`);
        continue;
      }

      // Check time range
      if (currentTime >= site.startDate && currentTime <= site.endDate) {
        console.log(`Time ${currentTime} is in range ${site.startDate}-${site.endDate}`);
        
        // Check URL match
        if (site.url.endsWith('*')) {
          const domain = site.url.slice(0, -1);
          if (url.toLowerCase().includes(domain.toLowerCase())) {
            console.log(`URL ${url} matches wildcard ${site.url}`);
            return true;
          }
        } else if (url.toLowerCase().includes(site.url.toLowerCase())) {
          console.log(`URL ${url} matches ${site.url}`);
          return true;
        }
      } else {
        console.log(`Time ${currentTime} not in range ${site.startDate}-${site.endDate}`);
      }
    }
    
    console.log(`URL ${url} should not be blocked`);
    return false;
  }
}

// Make it available globally - removed window assignment for service worker compatibility
// The class is already available via importScripts() in background.js