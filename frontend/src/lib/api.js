const API_BASE = '/api';

// Helper function for API calls with better error handling
async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('API call failed:', url, error);
    throw error;
  }
}

export async function getTodayLog() {
  return apiCall(`${API_BASE}/logs/today`);
}

export async function getLogByDate(date) {
  const response = await fetch(`${API_BASE}/logs/${date}`);
  if (!response.ok) throw new Error('Failed to fetch log');
  return response.json();
}

export async function saveLog(logData, photoFile) {
  const formData = new FormData();
  
  if (photoFile) {
    formData.append('photo', photoFile);
  }
  
  Object.keys(logData).forEach(key => {
    if (logData[key] !== null && logData[key] !== undefined && logData[key] !== '') {
      formData.append(key, logData[key]);
    }
  });
  
  const response = await fetch(`${API_BASE}/logs`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) throw new Error('Failed to save log');
  return response.json();
}

export async function getSettings() {
  const response = await fetch(`${API_BASE}/settings`);
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

export async function updateSettings(settings, goalPhotoFile) {
  const formData = new FormData();
  
  if (goalPhotoFile) {
    formData.append('goal_photo', goalPhotoFile);
  }
  
  Object.keys(settings).forEach(key => {
    if (settings[key] !== null && settings[key] !== undefined && settings[key] !== '') {
      formData.append(key, settings[key]);
    }
  });
  
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    body: formData,
  });
  
  if (!response.ok) throw new Error('Failed to update settings');
  return response.json();
}

export async function getCurrentDay() {
  const response = await fetch(`${API_BASE}/settings/current-day`);
  if (!response.ok) throw new Error('Failed to get current day');
  return response.json();
}

export function getPhotoUrl(date) {
  return `${API_BASE}/logs/${date}/photo`;
}

export function getGoalPhotoUrl() {
  return `${API_BASE}/settings/goal-photo`;
}

export async function getRecentLogs(limit = 20) {
  const response = await fetch(`${API_BASE}/logs?limit=${limit}&page=1`);
  if (!response.ok) throw new Error('Failed to fetch recent logs');
  const data = await response.json();
  // API returns { logs: [...], total, page, limit }
  return data.logs || [];
}

export async function getLogsByDateRange(startDate, endDate) {
  const response = await fetch(`${API_BASE}/logs/range?startDate=${startDate}&endDate=${endDate}`);
  if (!response.ok) throw new Error('Failed to fetch logs by date range');
  return response.json();
}

// Food API functions
export async function searchFoods(query, options = {}) {
  const params = new URLSearchParams({ query });
  if (options.gtin) params.append('gtin', options.gtin);
  if (options.dataType) params.append('dataType', options.dataType);
  if (options.pageSize) params.append('pageSize', options.pageSize);
  
  const response = await fetch(`${API_BASE}/foods/search?${params}`);
  if (!response.ok) throw new Error('Failed to search foods');
  return response.json();
}

export async function getFoodDetails(fdcId, format = 'full') {
  const response = await fetch(`${API_BASE}/foods/${fdcId}?format=${format}`);
  if (!response.ok) throw new Error('Failed to fetch food details');
  return response.json();
}

export async function searchFoodsByBarcode(gtin) {
  const response = await fetch(`${API_BASE}/foods/search?gtin=${gtin}`);
  if (!response.ok) throw new Error('Failed to search foods by barcode');
  return response.json();
}

export async function getBatchFoodDetails(fdcIds) {
  const response = await fetch(`${API_BASE}/foods/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fdcIds }),
  });
  if (!response.ok) throw new Error('Failed to fetch batch food details');
  return response.json();
}

export async function getPreviouslyUsedFoods() {
  const response = await fetch(`${API_BASE}/logs/foods/used`);
  if (!response.ok) throw new Error('Failed to fetch previously used foods');
  return response.json();
}

export async function createCustomFood(data) {
  const response = await fetch(`${API_BASE}/foods/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create custom food');
  }
  return response.json();
}

export async function getCustomFood(id) {
  const response = await fetch(`${API_BASE}/foods/custom/${id}`);
  if (!response.ok) throw new Error('Failed to fetch custom food');
  return response.json();
}

// Profiles API
export async function getProfiles() {
  const response = await fetch(`${API_BASE}/profiles`);
  if (!response.ok) throw new Error('Failed to fetch profiles');
  return response.json();
}

export async function createProfile({ username, password }) {
  const response = await fetch(`${API_BASE}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create profile');
  }
  return response.json();
}

export async function verifyProfile({ username, password }) {
  const response = await fetch(`${API_BASE}/profiles/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Invalid username or password');
  }
  return response.json();
}

export async function checkCustomFoodDuplicates({ name, barcode }) {
  const params = new URLSearchParams();
  if (name && (name || '').trim()) params.set('name', (name || '').trim());
  if (barcode && (barcode || '').trim()) params.set('barcode', (barcode || '').trim());
  if (!params.toString()) return { matches: [] };
  const response = await fetch(`${API_BASE}/foods/custom/check?${params}`);
  if (!response.ok) throw new Error('Failed to check duplicates');
  return response.json();
}
