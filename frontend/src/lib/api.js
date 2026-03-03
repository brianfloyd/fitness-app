import { get } from 'svelte/store';
import { currentUser } from './userStore.js';

const API_BASE = '/api';

// Enable in prod: localStorage.setItem('fitness_debug','1'); refresh. See docs/DEBUGGING-PROD-PERSIST.md
const DEBUG = typeof localStorage !== 'undefined' && localStorage.getItem('fitness_debug') === '1';

function apiHeaders() {
  const user = get(currentUser);
  const h = {};
  if (user?.id) h['X-Profile-Id'] = String(user.id);
  return h;
}

/** Fetch with profile header; on 401 clear session so user is sent to login. */
async function fetchWithProfile(url, options = {}) {
  const headers = { ...apiHeaders(), ...options.headers };
  if (DEBUG) {
    console.log('[fitness] fetch', options.method || 'GET', url, { hasProfileId: !!headers['X-Profile-Id'], profileId: headers['X-Profile-Id'] });
  }
  const response = await fetch(url, {
    ...options,
    headers,
  });
  if (DEBUG) {
    console.log('[fitness] response', response.status, url);
  }
  if (response.status === 401) {
    currentUser.logout();
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.details || errBody.error || 'Session expired. Please log in again.');
  }
  return response;
}

/** Throw if !response.ok (after fetchWithProfile); preserves 401 logout. */
function ensureOk(response) {
  if (!response.ok) {
    const errorText = response.statusText || 'Unknown error';
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }
}

async function apiCall(url, options = {}) {
  try {
    const response = await fetchWithProfile(url, options);
    ensureOk(response);
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
  const response = await fetchWithProfile(`${API_BASE}/logs/${date}`);
  ensureOk(response);
  const data = await response.json();
  if (DEBUG) {
    console.log('[fitness] getLogByDate', date, { weight: data.weight, fat_percent: data.fat_percent });
  }
  return data;
}

export async function saveLog(logData, photoFile) {
  const formData = new FormData();
  // Append all log fields first so multer receives multipart in a consistent order (file last can fix prod parsers)
  // Explicitly convert to string so multipart parsers handle consistently
  Object.keys(logData).forEach(key => {
    const val = logData[key];
    if (val !== null && val !== undefined && val !== '') {
      formData.append(key, typeof val === 'string' ? val : String(val));
    }
  });
  if (photoFile) {
    formData.append('photo', photoFile);
  }

  if (DEBUG) {
    const workoutLen = logData.workout ? String(logData.workout).length : 0;
    console.log('[fitness] saveLog', { date: logData.date, workoutLen, hasPhoto: !!photoFile });
  }
  const response = await fetchWithProfile(`${API_BASE}/logs`, {
    method: 'POST',
    body: formData,
  });
  ensureOk(response);
  const data = await response.json();
  if (DEBUG) {
    console.log('[fitness] saveLog done', { date: data.date, weight: data.weight, fat_percent: data.fat_percent });
  }
  return data;
}

export async function getSettings() {
  const response = await fetchWithProfile(`${API_BASE}/settings`);
  ensureOk(response);
  return response.json();
}

export async function updateSettings(settings, goalPhotoFile) {
  const formData = new FormData();
  Object.keys(settings).forEach(key => {
    if (settings[key] !== null && settings[key] !== undefined && settings[key] !== '') {
      formData.append(key, settings[key]);
    }
  });
  if (goalPhotoFile) {
    formData.append('goal_photo', goalPhotoFile);
  }
  const response = await fetchWithProfile(`${API_BASE}/settings`, {
    method: 'PUT',
    body: formData,
  });
  ensureOk(response);
  return response.json();
}

export async function getCurrentDay() {
  const response = await fetchWithProfile(`${API_BASE}/settings/current-day`);
  ensureOk(response);
  return response.json();
}

export function getPhotoUrl(date) {
  const user = get(currentUser);
  const q = user?.id ? `?profileId=${user.id}` : '';
  return `${API_BASE}/logs/${date}/photo${q}`;
}

export function getGoalPhotoUrl() {
  const user = get(currentUser);
  const q = user?.id ? `?profileId=${user.id}` : '';
  return `${API_BASE}/settings/goal-photo${q}`;
}

export async function getRecentLogs(limit = 20) {
  const response = await fetchWithProfile(`${API_BASE}/logs?limit=${limit}&page=1`);
  ensureOk(response);
  const data = await response.json();
  return data.logs || [];
}

export async function getLogsByDateRange(startDate, endDate) {
  const response = await fetchWithProfile(`${API_BASE}/logs/range?startDate=${startDate}&endDate=${endDate}`);
  ensureOk(response);
  return response.json();
}

// Food API functions
export async function searchFoods(query, options = {}) {
  const params = new URLSearchParams({ query });
  if (options.gtin) params.append('gtin', options.gtin);
  if (options.dataType) params.append('dataType', options.dataType);
  if (options.pageSize) params.append('pageSize', options.pageSize);
  
  const response = await fetchWithProfile(`${API_BASE}/foods/search?${params}`);
  ensureOk(response);
  return response.json();
}

export async function getFoodDetails(fdcId, format = 'full') {
  const response = await fetchWithProfile(`${API_BASE}/foods/${fdcId}?format=${format}`);
  ensureOk(response);
  return response.json();
}

export async function searchFoodsByBarcode(gtin) {
  const response = await fetchWithProfile(`${API_BASE}/foods/search?gtin=${gtin}`);
  ensureOk(response);
  return response.json();
}

export async function getBatchFoodDetails(fdcIds) {
  const response = await fetchWithProfile(`${API_BASE}/foods/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fdcIds }),
  });
  ensureOk(response);
  return response.json();
}

export async function getPreviouslyUsedFoods() {
  const response = await fetchWithProfile(`${API_BASE}/logs/foods/used`);
  ensureOk(response);
  return response.json();
}

export async function createCustomFood(data, options = {}) {
  const body = { ...data };
  if (options.universal) body.universal = true;
  const response = await fetchWithProfile(`${API_BASE}/foods/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create custom food');
  }
  return response.json();
}

export async function getCustomFood(id) {
  const response = await fetchWithProfile(`${API_BASE}/foods/custom/${id}`);
  ensureOk(response);
  return response.json();
}

// Recipes API
export async function getRecipes() {
  const response = await fetchWithProfile(`${API_BASE}/recipes`);
  ensureOk(response);
  return response.json();
}

export async function getRecipeById(id) {
  const response = await fetchWithProfile(`${API_BASE}/recipes/${id}`);
  ensureOk(response);
  return response.json();
}

export async function createOrUpdateRecipe(data) {
  const response = await fetchWithProfile(`${API_BASE}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save recipe');
  }
  return response.json();
}

export async function deleteRecipe(id) {
  const response = await fetchWithProfile(`${API_BASE}/recipes/${id}`, { method: 'DELETE' });
  if (response.status !== 204 && !response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete recipe');
  }
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

export async function getAuthConfig() {
  const response = await fetch(`${API_BASE}/auth/config`);
  if (!response.ok) {
    if (DEBUG) console.warn('[fitness] auth/config failed:', response.status);
    return { googleClientId: null };
  }
  const data = await response.json();
  if (DEBUG) console.log('[fitness] auth/config:', { hasClientId: !!data?.googleClientId });
  return data;
}

export async function verifyGoogleAuth(credential) {
  const response = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Google sign-in failed');
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

export async function getFitbitAuthUrl() {
  const response = await fetchWithProfile(`${API_BASE}/fitbit/auth-url`);
  ensureOk(response);
  return response.json();
}

export async function getFitbitStatus() {
  const response = await fetchWithProfile(`${API_BASE}/fitbit/status`, { cache: 'no-store' });
  ensureOk(response);
  return response.json();
}

export async function getFitbitDailyMetrics(date) {
  const response = await fetchWithProfile(`${API_BASE}/fitbit/daily-metrics?date=${encodeURIComponent(date)}`, {
    cache: 'no-store',
  });
  ensureOk(response);
  return response.json();
}

export async function checkCustomFoodDuplicates({ name, barcode }) {
  const params = new URLSearchParams();
  if (name && (name || '').trim()) params.set('name', (name || '').trim());
  if (barcode && (barcode || '').trim()) params.set('barcode', (barcode || '').trim());
  if (!params.toString()) return { matches: [] };
  const response = await fetchWithProfile(`${API_BASE}/foods/custom/check?${params}`);
  ensureOk(response);
  return response.json();
}
