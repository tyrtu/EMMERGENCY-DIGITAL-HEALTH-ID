// Offline Cache System for Critical Patient Data

const CACHE_KEY = 'emergency_health_offline_cache';
const CACHE_VERSION = '1.0';
const MAX_CACHED_PATIENTS = 50; // Maximum number of patients to cache

// Initialize cache with version
export const initOfflineCache = () => {
  try {
    const existing = localStorage.getItem(CACHE_KEY);
    if (!existing) {
      const cacheData = {
        version: CACHE_VERSION,
        patients: [],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    }
  } catch (e) {
    console.error('Failed to initialize offline cache:', e);
  }
};

// Save patient data to offline cache
export const savePatientToCache = (patientData) => {
  try {
    const cache = getCache();
    if (!cache) return;
    
    const patientId = patientData.id || patientData.authId || patientData._id;
    if (!patientId) return;
    
    // Check if patient already exists in cache
    const existingIndex = cache.patients.findIndex(p => 
      (p.id || p.authId || p._id) === patientId
    );
    
    const patientCacheEntry = {
      ...patientData,
      cachedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      // Update existing patient
      cache.patients[existingIndex] = patientCacheEntry;
    } else {
      // Add new patient
      cache.patients.unshift(patientCacheEntry);
      
      // Limit cache size
      if (cache.patients.length > MAX_CACHED_PATIENTS) {
        cache.patients = cache.patients.slice(0, MAX_CACHED_PATIENTS);
      }
    }
    
    cache.lastUpdated = new Date().toISOString();
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    
    return true;
  } catch (e) {
    console.error('Failed to save patient to cache:', e);
    return false;
  }
};

// Get patient from cache
export const getPatientFromCache = (patientId) => {
  try {
    const cache = getCache();
    if (!cache) return null;
    
    const patient = cache.patients.find(p => 
      (p.id || p.authId || p._id) === patientId
    );
    
    if (patient) {
      // Update last accessed time
      patient.lastAccessed = new Date().toISOString();
      updateCache(cache);
      return patient;
    }
    
    return null;
  } catch (e) {
    console.error('Failed to get patient from cache:', e);
    return null;
  }
};

// Get all cached patients
export const getAllCachedPatients = () => {
  try {
    const cache = getCache();
    if (!cache) return [];
    
    return cache.patients || [];
  } catch (e) {
    console.error('Failed to get cached patients:', e);
    return [];
  }
};

// Get recent scans (last 10)
export const getRecentScans = (limit = 10) => {
  try {
    const cache = getCache();
    if (!cache) return [];
    
    const patients = cache.patients || [];
    return patients
      .sort((a, b) => {
        const timeA = new Date(a.lastAccessed || a.cachedAt);
        const timeB = new Date(b.lastAccessed || b.cachedAt);
        return timeB - timeA;
      })
      .slice(0, limit);
  } catch (e) {
    console.error('Failed to get recent scans:', e);
    return [];
  }
};

// Clear cache
export const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    initOfflineCache();
    return true;
  } catch (e) {
    console.error('Failed to clear cache:', e);
    return false;
  }
};

// Get cache size
export const getCacheSize = () => {
  try {
    const cache = getCache();
    if (!cache) return 0;
    return cache.patients?.length || 0;
  } catch (e) {
    return 0;
  }
};

// Internal helper to get cache
const getCache = () => {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    if (!cacheStr) {
      initOfflineCache();
      return JSON.parse(localStorage.getItem(CACHE_KEY));
    }
    return JSON.parse(cacheStr);
  } catch (e) {
    console.error('Failed to get cache:', e);
    return null;
  }
};

// Internal helper to update cache
const updateCache = (cache) => {
  try {
    cache.lastUpdated = new Date().toISOString();
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to update cache:', e);
  }
};

// Check if offline mode is available
export const isOfflineAvailable = () => {
  try {
    const cache = getCache();
    return cache && cache.patients && cache.patients.length > 0;
  } catch (e) {
    return false;
  }
};

// Export cache data for backup
export const exportCache = () => {
  try {
    const cache = getCache();
    if (!cache) return null;
    
    const exportData = {
      version: cache.version,
      exportedAt: new Date().toISOString(),
      patients: cache.patients,
      count: cache.patients.length
    };
    
    return JSON.stringify(exportData, null, 2);
  } catch (e) {
    console.error('Failed to export cache:', e);
    return null;
  }
};

// Import cache data
export const importCache = (cacheData) => {
  try {
    const parsed = typeof cacheData === 'string' ? JSON.parse(cacheData) : cacheData;
    if (!parsed || !parsed.patients) {
      return false;
    }
    
    const cache = {
      version: CACHE_VERSION,
      patients: parsed.patients.slice(0, MAX_CACHED_PATIENTS),
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    return true;
  } catch (e) {
    console.error('Failed to import cache:', e);
    return false;
  }
};

