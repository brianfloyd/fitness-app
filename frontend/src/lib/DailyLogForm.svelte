<script>
  import { onMount } from 'svelte';
  import { getTodayLog, getLogByDate, saveLog, getCurrentDay, getSettings, getPhotoUrl, getGoalPhotoUrl } from '../lib/api.js';
  import DayCounter from './DayCounter.svelte';
  import PhotoUpload from './PhotoUpload.svelte';
  import MetricInput from './MetricInput.svelte';
  import SleepTimeInput from './SleepTimeInput.svelte';
  import StravaActivities from './StravaActivities.svelte';
  import WorkoutExercises from './WorkoutExercises.svelte';
  import GraphView from './GraphView.svelte';
  import FoodTracker from './FoodTracker.svelte';
  
  let loading = true;
  let saving = false;
  let error = null;
  let success = false;
  let isInitialMount = true;
  let isDataLoaded = false; // Track if data has been loaded to avoid saving on initial load
  let saveTimeout = null;
  
  let dayNumber = 1;
  let totalDays = 84;
  let startDate = '';
  let selectedDate = new Date().toISOString().split('T')[0];
  
  // Check if selected date is today
  $: isToday = (() => {
    if (!selectedDate) return false;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return selectedDate === todayStr;
  })();
  
  let photoFile = null;
  let currentPhotoUrl = null;
  let photoMimeType = null;
  let goalPhotoUrl = null; // AI goal photo URL
  
  let weight = '';
  let fatPercent = '';
  let workoutExercises = []; // Array of exercises with sets
  let protein = '';
  let fat = '';
  let carbs = '';
  let foods = []; // Array of food entries
  let foodMacros = { protein: 0, fat: 0, carbs: 0, calories: 0 }; // Macros from foods
  
  // Calculate total calories from macros (manual + foods)
  // Protein: 4 cal/g, Carbs: 4 cal/g, Fat: 9 cal/g
  $: totalCalories = (() => {
    const p = (parseFloat(protein) || 0) + foodMacros.protein;
    const f = (parseFloat(fat) || 0) + foodMacros.fat;
    const c = (parseFloat(carbs) || 0) + foodMacros.carbs;
    return (p * 4) + (f * 9) + (c * 4);
  })();
  
  // Handle food tracker totals
  function handleFoodTotals(event) {
    foodMacros = event.detail;
  }
  
  // Handle food tracker changes
  function handleFoodsChange(event) {
    foods = event.detail;
  }
  
  // Calculate total workout volume (sum of all volumes from completed exercises)
  $: totalWorkoutVolume = (() => {
    if (!workoutExercises || !Array.isArray(workoutExercises)) return 0;
    return workoutExercises
      .filter(ex => ex.completed && ex.sets && Array.isArray(ex.sets))
      .reduce((total, exercise) => {
        const exerciseVolume = exercise.sets.reduce((vol, set) => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseFloat(set.reps) || 0;
          return vol + (weight * reps);
        }, 0);
        return total + exerciseVolume;
      }, 0);
  })();
  
  // Get unique muscle groups from completed exercises
  $: musclesWorked = (() => {
    if (!workoutExercises || !Array.isArray(workoutExercises)) return [];
    const muscleGroups = new Set();
    workoutExercises
      .filter(ex => ex.completed && ex.muscleGroup)
      .forEach(ex => muscleGroups.add(ex.muscleGroup));
    return Array.from(muscleGroups).sort();
  })();
  
  // Muscle group colors matching WorkoutExercises component
  function getMuscleGroupColor(name) {
    const colors = {
      'Biceps': '#3b82f6',
      'Triceps': '#8b5cf6',
      'Chest': '#ef4444',
      'Back': '#10b981',
      'Shoulders': '#f59e0b',
      'Legs': '#ec4899',
      'Forearms': '#06b6d4',
      'Core': '#f97316',
    };
    return colors[name] || '#64748b';
  }
  let sleepTime = '';
  let sleepScore = '';
  let stravaActivities = []; // Array of { id, link, name, distance, time, type }
  let steps = '';
  
  // Copy to functionality
  let showCopyModal = false;
  let copyTargetDate = '';
  let copyCategory = ''; // 'photo', 'body', 'sleep', 'workout', 'macros'
  
  // Graph functionality
  let showGraphModal = false;
  let graphCategory = ''; // 'photo', 'body', 'sleep', 'workout', 'macros'
  
  async function loadSettings() {
    try {
      const settings = await getSettings();
      startDate = settings.start_date || new Date().toISOString().split('T')[0];
      totalDays = settings.total_days || 84;
      
      // Load goal photo URL if available
      if (settings.has_goal_photo) {
        goalPhotoUrl = getGoalPhotoUrl();
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  }
  
  // Calculate date from day number
  function getDateFromDayNumber(dayNum) {
    if (!startDate) {
      console.warn('startDate not loaded yet');
      return new Date().toISOString().split('T')[0];
    }
    // Parse as local date to avoid timezone issues
    const startParts = startDate.split('-');
    const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
    start.setHours(0, 0, 0, 0);
    const targetDate = new Date(start);
    targetDate.setDate(start.getDate() + (dayNum - 1));
    
    // Format as YYYY-MM-DD (local, no timezone conversion)
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Navigate to previous day
  async function navigateToPreviousDay() {
    if (dayNumber > 1 && startDate) {
      const newDayNumber = dayNumber - 1;
      const newDate = getDateFromDayNumber(newDayNumber);
      lastLoadedDate = ''; // Reset to force reload
      selectedDate = newDate;
      // loadLogForDate will be triggered by the reactive statement
    }
  }
  
  // Navigate to next day
  async function navigateToNextDay() {
    if (dayNumber < totalDays && startDate) {
      const newDayNumber = dayNumber + 1;
      const newDate = getDateFromDayNumber(newDayNumber);
      lastLoadedDate = ''; // Reset to force reload
      selectedDate = newDate;
      // loadLogForDate will be triggered by the reactive statement
    }
  }
  
  async function loadLogForDate(date) {
    try {
      loading = true;
      error = null;
      
      // Load settings if not already loaded
      if (!startDate || !totalDays) {
        await loadSettings();
      }
      
      // Load log for this date first
      const log = await getLogByDate(date);
      
      // Update totalDays from the log response if available
      if (log && log.total_days) {
        totalDays = log.total_days;
      }
      
      // Always calculate day number from the date, never use stored day_number from log
      // This ensures day numbers are always correct even if database has wrong values
      if (startDate) {
        // Parse dates as local dates (YYYY-MM-DD format) to avoid timezone issues
        const startParts = startDate.split('-');
        const selectedParts = date.split('-');
        const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
        const selected = new Date(parseInt(selectedParts[0]), parseInt(selectedParts[1]) - 1, parseInt(selectedParts[2]));
        start.setHours(0, 0, 0, 0);
        selected.setHours(0, 0, 0, 0);
        const diffTime = selected - start;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        // Day 1 = start date (diffDays = 0)
        // Day 2 = start date + 1 day (diffDays = 1)
        // etc.
        dayNumber = Math.max(1, Math.min(diffDays + 1, totalDays));
        
        // Ensure selectedDate matches the calculated date for this day number
        // This fixes any date picker sync issues
        const expectedDate = getDateFromDayNumber(dayNumber);
        if (expectedDate !== date) {
          console.log(`Date mismatch: expected ${expectedDate} for day ${dayNumber}, got ${date}`);
          // Don't update selectedDate here to avoid infinite loops, but log for debugging
        }
      } else {
        // Fallback if startDate not loaded yet
        if (log && log.day_number) {
          dayNumber = log.day_number;
        }
      }
      
      // Clear all fields first
      weight = '';
      fatPercent = '';
      workoutExercises = [];
      protein = '';
      fat = '';
      carbs = '';
      foods = [];
      foodMacros = { protein: 0, fat: 0, carbs: 0, calories: 0 };
        sleepTime = '';
        sleepScore = '';
        stravaActivities = [];
        steps = '';
      currentPhotoUrl = null;
      photoMimeType = null;
      photoFile = null;
      
      // Populate if log exists
      // Normalize dates for comparison (API may return ISO string or just date)
      const logDateStr = log.date ? (typeof log.date === 'string' ? log.date.split('T')[0] : log.date) : null;
      
      if (log && logDateStr === date) {
        weight = log.weight || '';
        fatPercent = log.fat_percent || '';
        // Parse workout exercises from JSON or empty array
        if (log.workout) {
          try {
            workoutExercises = JSON.parse(log.workout);
            // Ensure it's an array
            if (!Array.isArray(workoutExercises)) {
              workoutExercises = [];
            }
          } catch (e) {
            // If it's not JSON, it might be old text format
            workoutExercises = [];
          }
        } else {
          workoutExercises = [];
        }
        protein = log.protein || '';
        fat = log.fat || '';
        carbs = log.carbs || '';
        
        // Parse foods (stored as JSON string)
        if (log.foods) {
          try {
            foods = JSON.parse(log.foods);
            if (!Array.isArray(foods)) {
              foods = [];
            }
            // Ensure each food has a unique ID (for keyed each blocks)
            foods = foods.map((food, index) => {
              if (!food.id) {
                food.id = `${food.fdcId || 'food'}-${index}-${Date.now()}`;
              }
              return food;
            });
            // Calculate food macros
            foodMacros = foods.reduce((acc, food) => ({
              protein: acc.protein + (food.protein || 0),
              fat: acc.fat + (food.fat || 0),
              carbs: acc.carbs + (food.carbs || 0),
              calories: acc.calories + (food.calories || 0),
            }), { protein: 0, fat: 0, carbs: 0, calories: 0 });
          } catch (e) {
            console.error('Error parsing foods:', e);
            foods = [];
            foodMacros = { protein: 0, fat: 0, carbs: 0, calories: 0 };
          }
        } else {
          foods = [];
          foodMacros = { protein: 0, fat: 0, carbs: 0, calories: 0 };
        }
        
        // Handle sleep time - strip seconds if present
        if (log.sleep_time) {
          const sleepParts = log.sleep_time.split(':');
          if (sleepParts.length >= 2) {
            sleepTime = `${sleepParts[0].padStart(2, '0')}:${sleepParts[1].padStart(2, '0')}`;
          } else {
            sleepTime = log.sleep_time;
          }
        } else {
          sleepTime = '';
        }
        
        sleepScore = log.sleep_score || '';
        
        // Parse Strava activities (stored as JSON string)
        if (log.strava) {
          try {
            stravaActivities = JSON.parse(log.strava);
            if (!Array.isArray(stravaActivities)) {
              stravaActivities = [];
            }
          } catch (e) {
            // If it's not JSON, it might be an old format - ignore it
            stravaActivities = [];
          }
        } else {
          stravaActivities = [];
        }
        
        steps = log.steps || '';
        
        if (log.photo_mime_type) {
          currentPhotoUrl = getPhotoUrl(logDateStr || date);
          photoMimeType = log.photo_mime_type;
        }
        
        // Don't override dayNumber from log.day_number - we calculate it from the date above
        // This ensures day numbers are always correct even if database has wrong values
      }
      
      // Mark data as loaded to enable auto-save
      isDataLoaded = true;
    } catch (err) {
      console.error('Error loading log:', err);
      error = 'Failed to load log for selected date';
      isDataLoaded = false;
    } finally {
      loading = false;
    }
  }
  
  let lastLoadedDate = '';
  
  async function handleDateChange() {
    if (selectedDate && selectedDate !== lastLoadedDate && !loading) {
      lastLoadedDate = selectedDate;
      await loadLogForDate(selectedDate);
    }
  }
  
  // React to date changes (but not on initial mount)
  $: if (selectedDate && !loading && !isInitialMount && selectedDate !== lastLoadedDate) {
    handleDateChange();
  }
  
  // Validate date is within range
  function isDateInRange(date) {
    if (!startDate || !date) return false;
    const dateObj = new Date(date);
    const startDateObj = new Date(startDate);
    const diffTime = dateObj - startDateObj;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays < totalDays;
  }
  
  // Open copy modal for a category
  function openCopyModal(category) {
    copyCategory = category;
    copyTargetDate = '';
    showCopyModal = true;
  }
  
  // Copy data to target date
  async function executeCopy() {
    if (!copyTargetDate || !isDateInRange(copyTargetDate)) {
      error = 'Please select a valid date within the program range';
      setTimeout(() => { error = null; }, 3000);
      return;
    }
    
    if (copyTargetDate === selectedDate) {
      error = 'Cannot copy to the same date';
      setTimeout(() => { error = null; }, 3000);
      return;
    }
    
    try {
      saving = true;
      error = null;
      
      // Prepare data to copy based on category
      const logData = {
        date: copyTargetDate,
      };
      
      if (copyCategory === 'photo') {
        // For photo, we need to copy the photo file if it exists
        if (currentPhotoUrl && photoMimeType) {
          try {
            // Fetch the photo blob from current date
            const photoResponse = await fetch(currentPhotoUrl);
            if (photoResponse.ok) {
              const photoBlob = await photoResponse.blob();
              const photoFile = new File([photoBlob], `photo-${selectedDate}.jpg`, { type: photoMimeType });
              await saveLog(logData, photoFile);
            } else {
              throw new Error('Failed to fetch photo');
            }
          } catch (err) {
            console.error('Error copying photo:', err);
            throw new Error('Failed to copy photo. Please try again.');
          }
        } else {
          throw new Error('No photo to copy');
        }
      } else if (copyCategory === 'body') {
        logData.weight = weight || null;
        logData.fat_percent = fatPercent || null;
        await saveLog(logData, null);
      } else if (copyCategory === 'sleep') {
        let formattedSleepTime = null;
        if (sleepTime) {
          const parts = sleepTime.split(':');
          if (parts.length >= 2) {
            formattedSleepTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
          }
        }
        logData.sleep_time = formattedSleepTime;
        logData.sleep_score = sleepScore || null;
        logData.steps = steps || null;
        await saveLog(logData, null);
      } else if (copyCategory === 'workout') {
        logData.workout = workoutExercises.length > 0 ? JSON.stringify(workoutExercises) : null;
        await saveLog(logData, null);
      } else if (copyCategory === 'macros') {
        logData.protein = protein || null;
        logData.fat = fat || null;
        logData.carbs = carbs || null;
        logData.foods = foods.length > 0 ? JSON.stringify(foods) : null;
        await saveLog(logData, null);
      }
      
      success = true;
      showCopyModal = false;
      setTimeout(() => { success = false; }, 2000);
    } catch (err) {
      console.error('Error copying data:', err);
      error = 'Failed to copy data. Please try again.';
      setTimeout(() => { error = null; }, 5000);
    } finally {
      saving = false;
    }
  }
  
  function closeCopyModal() {
    showCopyModal = false;
    copyTargetDate = '';
    copyCategory = '';
  }
  
  // Open graph modal for a category
  function openGraphModal(category) {
    graphCategory = category;
    showGraphModal = true;
  }
  
  function closeGraphModal() {
    showGraphModal = false;
    graphCategory = '';
  }
  
  // Auto-save function with debouncing
  async function autoSave() {
    // Don't save if data hasn't been loaded yet or during initial mount
    if (!isDataLoaded || loading) {
      return;
    }
    
    // Clear any pending save
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Debounce: wait 500ms after last change before saving
    saveTimeout = setTimeout(async () => {
      try {
        saving = true;
        error = null;
        success = false;
        
        // Format sleep time - ensure it's HH:MM format (no seconds)
        let formattedSleepTime = null;
        if (sleepTime) {
          const parts = sleepTime.split(':');
          if (parts.length >= 2) {
            formattedSleepTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
          } else {
            formattedSleepTime = sleepTime;
          }
        }
        
        // Stringify Strava activities array to JSON
        const stravaJson = stravaActivities.length > 0 ? JSON.stringify(stravaActivities) : null;
        
        const logData = {
          date: selectedDate,
          weight: weight || null,
          fat_percent: fatPercent || null,
          workout: workoutExercises.length > 0 ? JSON.stringify(workoutExercises) : null,
          protein: protein || null,
          fat: fat || null,
          carbs: carbs || null,
          foods: foods.length > 0 ? JSON.stringify(foods) : null,
          sleep_time: formattedSleepTime,
          sleep_score: sleepScore || null,
          strava: stravaJson,
          steps: steps || null,
        };
        
        const result = await saveLog(logData, photoFile);
        
        // Update photo URL if photo was uploaded
        if (photoFile && result.photo_mime_type) {
          currentPhotoUrl = getPhotoUrl(result.date);
          photoMimeType = result.photo_mime_type;
          photoFile = null;
        }
        
        // Don't override dayNumber from result - we calculate it from the date
        // But update totalDays if it changed
        if (result.total_days) {
          totalDays = result.total_days;
        }
        
        success = true;
        setTimeout(() => {
          success = false;
        }, 2000);
      } catch (err) {
        console.error('Error auto-saving log:', err);
        error = 'Failed to save changes. Please try again.';
        setTimeout(() => {
          error = null;
        }, 5000);
      } finally {
        saving = false;
      }
    }, 500);
  }
  
  function handlePhotoSelected(event) {
    photoFile = event.detail;
    autoSave(); // Auto-save when photo is selected/uploaded
  }
  
  function handlePhotoRemoved() {
    photoFile = null;
    currentPhotoUrl = null;
    photoMimeType = null;
    autoSave(); // Auto-save when photo is removed
  }
  
  // Auto-save reactive statements - trigger save when any field changes
  $: if (isDataLoaded && !loading) {
    // Watch for changes in weight, fatPercent, protein, fat, carbs, sleepTime, sleepScore, steps, foods
    weight, fatPercent, protein, fat, carbs, sleepTime, sleepScore, steps, foods;
    autoSave();
  }
  
  // Auto-save when workout exercises change
  $: if (isDataLoaded && !loading) {
    workoutExercises;
    autoSave();
  }
  
  // Auto-save when Strava activities change
  $: if (isDataLoaded && !loading) {
    stravaActivities;
    autoSave();
  }
  
  // React to date changes (but not on initial mount)
  $: if (selectedDate && !loading && !isInitialMount) {
    handleDateChange();
  }
  
  onMount(async () => {
    try {
      await loadSettings();
      
      // Always load today's date on refresh
      // Get today's date in local timezone (YYYY-MM-DD format)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      // Check if today is within the valid date range
      if (startDate) {
        const todayParts = todayStr.split('-');
        const startParts = startDate.split('-');
        const todayDate = new Date(parseInt(todayParts[0]), parseInt(todayParts[1]) - 1, parseInt(todayParts[2]));
        const startDateObj = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
        const diffTime = todayDate - startDateObj;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const todayDayNumber = diffDays + 1;
        
        // Only use today if it's within the valid range (Day 1 to totalDays)
        if (todayDayNumber >= 1 && todayDayNumber <= totalDays) {
          selectedDate = todayStr;
        } else if (todayDayNumber < 1) {
          // If today is before start date, use start date (Day 1)
          selectedDate = startDate;
        } else {
          // If today is after the program ends, use the last day
          selectedDate = getDateFromDayNumber(totalDays);
        }
      } else {
        // If startDate not loaded yet, use today
        selectedDate = todayStr;
      }
      
      lastLoadedDate = '';
      await loadLogForDate(selectedDate);
      lastLoadedDate = selectedDate;
      isInitialMount = false;
    } catch (err) {
      console.error('Error in onMount:', err);
      error = 'Failed to load app. Please refresh the page.';
      loading = false; // Ensure loading state is cleared even on error
      isInitialMount = false;
    }
  });
</script>

<div class="daily-log-form">
  {#if loading}
    <div class="loading">Loading...</div>
  {:else}
    <DayCounter {dayNumber} {totalDays} onPrevious={navigateToPreviousDay} onNext={navigateToNextDay} />
    
    <div class="form-layout">
        <!-- Left Column: Photo, Date, Body Composition, and Sleep -->
        <div class="left-column">
          <div class="card photo-card">
            <div class="photo-section-header">
              <h3 class="section-header">
                <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Photo
              </h3>
              <div class="header-actions">
                <button type="button" class="graph-icon-btn" on:click|stopPropagation={() => openGraphModal('photo')} aria-label="View photo progression">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </button>
                <button type="button" class="copy-icon-btn" on:click|stopPropagation={() => openCopyModal('photo')} aria-label="Copy photo to another date">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="section-with-copy">
              <PhotoUpload
                {currentPhotoUrl}
                {photoMimeType}
                {goalPhotoUrl}
                on:photoSelected={handlePhotoSelected}
                on:photoRemoved={handlePhotoRemoved}
              />
            </div>
          </div>
          
          <div class="card">
            <div class="form-section">
              <h3 class="section-header">
                <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Date Selection
              </h3>
              <div class="form-row">
                <div class="date-input-wrapper">
                  <MetricInput label="Date" type="date" bind:value={selectedDate} on:change={handleDateChange} />
                  {#if isToday}
                    <span class="today-pill">TODAY</span>
                  {/if}
                </div>
                <div class="metric-input">
                  <label>Start Date</label>
                  <input type="text" value={new Date(startDate).toLocaleDateString()} readonly />
                </div>
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="form-section">
              <h3 class="section-header">
                <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.21 15.32A8.56 8.56 0 1 0 11.67 3.28a8.56 8.56 0 0 0 8.54 12.04z"></path>
                  <line x1="12" y1="12" x2="12" y2="12"></line>
                </svg>
                Body Composition
                <div class="header-actions">
                  <button type="button" class="graph-icon-btn" on:click|stopPropagation={() => openGraphModal('body')} aria-label="View body composition graph">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                  </button>
                  <button type="button" class="copy-icon-btn" on:click|stopPropagation={() => openCopyModal('body')} aria-label="Copy body composition to another date">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </h3>
              <div class="grid grid-2">
                <MetricInput label="Weight" type="number" step="0.1" bind:value={weight} placeholder="lbs" />
                <MetricInput label="Fat %" type="number" step="0.1" bind:value={fatPercent} placeholder="%" />
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="form-section">
              <h3 class="section-header">
                <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Sleep & Activity
                <div class="header-actions">
                  <button type="button" class="graph-icon-btn" on:click|stopPropagation={() => openGraphModal('sleep')} aria-label="View sleep & activity graph">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                  </button>
                  <button type="button" class="copy-icon-btn" on:click|stopPropagation={() => openCopyModal('sleep')} aria-label="Copy sleep & activity to another date">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </h3>
              <div class="grid grid-2">
                <SleepTimeInput bind:value={sleepTime} />
                <MetricInput label="Sleep Score" type="number" min="0" max="100" bind:value={sleepScore} />
              </div>
              <div class="grid grid-1">
                <div class="steps-input-wrapper">
                  <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                  </svg>
                  <MetricInput label="Steps" type="number" bind:value={steps} placeholder="Steps" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Right Column: Workout, Macros, and Strava -->
        <div class="right-column">
          <div class="card">
            <div class="form-section">
              <div class="section-header-wrapper">
                <h3 class="section-header">
                  <span class="header-left">
                    <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M6.5 6.5h11v11h-11z"></path>
                      <path d="M6.5 6.5l5.5 5.5 5.5-5.5"></path>
                      <path d="M12 12v6"></path>
                      <path d="M8 17h8"></path>
                    </svg>
                    Workout
                  </span>
                  <span class="header-right">
                    {#if totalWorkoutVolume > 0}
                      <span class="total-volume-container">
                        <span class="total-volume">Total Volume: {totalWorkoutVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })} lbs</span>
                        {#if musclesWorked.length > 0}
                          <div class="muscle-groups-pills">
                            {#each musclesWorked as muscle}
                              <span 
                                class="muscle-pill" 
                                style="border-color: {getMuscleGroupColor(muscle)}; color: {getMuscleGroupColor(muscle)}; background-color: {getMuscleGroupColor(muscle)}20;"
                              >
                                {muscle.toUpperCase()}
                              </span>
                            {/each}
                          </div>
                        {/if}
                      </span>
                    {/if}
                    <div class="header-actions">
                      <button type="button" class="graph-icon-btn" on:click|stopPropagation={() => openGraphModal('workout')} aria-label="View workout graph">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                      </button>
                      <button type="button" class="copy-icon-btn" on:click|stopPropagation={() => openCopyModal('workout')} aria-label="Copy workout to another date">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  </span>
                </h3>
              </div>
              <WorkoutExercises 
                bind:exercises={workoutExercises}
                on:exercisesChanged={(e) => {
                  workoutExercises = e.detail;
                  // Auto-save is triggered by reactive statement watching workoutExercises
                }}
              />
            </div>
          </div>
          
          <div class="card">
            <div class="form-section">
              <h3 class="section-header">
                <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                Macros
                <div class="header-actions">
                  <button type="button" class="graph-icon-btn" on:click|stopPropagation={() => openGraphModal('macros')} aria-label="View macros graph">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                  </button>
                  <button type="button" class="copy-icon-btn" on:click|stopPropagation={() => openCopyModal('macros')} aria-label="Copy macros to another date">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </h3>
              <FoodTracker
                bind:foods
                on:totals={handleFoodTotals}
                on:change={handleFoodsChange}
              />
              <div class="grid grid-3">
                <MetricInput label="Protein" type="number" step="0.1" bind:value={protein} placeholder="g" />
                <MetricInput label="Fat" type="number" step="0.1" bind:value={fat} placeholder="g" />
                <MetricInput label="Carbs" type="number" step="0.1" bind:value={carbs} placeholder="g" />
              </div>
              <div class="calories-display">
                <div class="calories-label">Total Calories</div>
                <div class="calories-value">{totalCalories > 0 ? Math.round(totalCalories) : '—'}</div>
              </div>
              {#if (foodMacros.protein > 0 || foodMacros.fat > 0 || foodMacros.carbs > 0)}
                <div class="food-macros-summary">
                  <div class="summary-label">From Foods:</div>
                  <div class="summary-values">
                    <span class="summary-macro protein">P: {foodMacros.protein.toFixed(1)}g</span>
                    <span class="summary-macro fat">F: {foodMacros.fat.toFixed(1)}g</span>
                    <span class="summary-macro carbs">C: {foodMacros.carbs.toFixed(1)}g</span>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <div class="card">
            <div class="form-section">
              <h3 class="section-header">
                <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                Strava Activities
              </h3>
              <StravaActivities 
                bind:activities={stravaActivities} 
                on:activitiesChanged={(e) => {
                  stravaActivities = e.detail;
                  // Auto-save is triggered by reactive statement watching stravaActivities
                }} 
              />
            </div>
          </div>
        </div>
      </div>
      
      <div class="status-messages">
        {#if error}
          <div class="error-message">{error}</div>
        {/if}
        
        {#if success}
          <div class="success-message">Changes saved automatically</div>
        {/if}
        
        {#if saving}
          <div class="saving-indicator">Saving...</div>
        {/if}
      </div>
  {/if}
</div>

<!-- Copy To Modal -->
{#if showCopyModal}
  <div class="copy-modal" on:click|self={closeCopyModal}>
    <div class="copy-modal-content" on:click|stopPropagation>
      <div class="copy-header">
        <h3>Copy {copyCategory === 'photo' ? 'Photo' : copyCategory === 'body' ? 'Body Composition' : copyCategory === 'sleep' ? 'Sleep & Activity' : copyCategory === 'workout' ? 'Workout' : 'Macros'} to Another Date</h3>
        <button type="button" class="close-btn" on:click={closeCopyModal}>×</button>
      </div>
      <div class="copy-body">
        <div class="form-field">
          <label>Select Target Date</label>
          <input 
            type="date" 
            bind:value={copyTargetDate}
            min={startDate}
            max={getDateFromDayNumber(totalDays)}
          />
          {#if copyTargetDate && !isDateInRange(copyTargetDate)}
            <div class="error-text">Date must be within the program range (Day 1 to Day {totalDays})</div>
          {/if}
          {#if copyTargetDate === selectedDate}
            <div class="error-text">Cannot copy to the same date</div>
          {/if}
        </div>
      </div>
      <div class="copy-actions">
        <button type="button" class="cancel-btn" on:click={closeCopyModal}>Cancel</button>
        <button 
          type="button" 
          class="copy-btn" 
          on:click={executeCopy}
          disabled={!copyTargetDate || !isDateInRange(copyTargetDate) || copyTargetDate === selectedDate || saving}
        >
          {saving ? 'Copying...' : 'Copy'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Graph Modal -->
{#if showGraphModal}
  <div class="graph-modal" on:click|self={closeGraphModal}>
    <div class="graph-modal-content" on:click|stopPropagation>
      <GraphView 
        category={graphCategory} 
        on:close={closeGraphModal}
      />
    </div>
  </div>
{/if}

<style>
  .daily-log-form {
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }
  
  .loading {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);
  }
  
  .form-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    width: 100%;
    max-width: 100%;
  }
  
  @media (min-width: 768px) {
    .form-layout {
      grid-template-columns: 320px 1fr;
      align-items: start;
      gap: var(--spacing-lg);
    }
  }
  
  @media (min-width: 1024px) {
    .form-layout {
      grid-template-columns: 340px 1fr;
      gap: var(--spacing-lg);
    }
  }
  
  .left-column {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
  }
  
  .right-column {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
  }
  
  .photo-card {
    flex-shrink: 0;
    position: relative;
  }
  
  .photo-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border);
  }
  
  .photo-card .section-with-copy {
    position: relative;
  }
  
  .form-section {
    margin-bottom: 0;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }
  
  .form-section:last-child {
    margin-bottom: 0;
  }
  
  .form-section h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
  }

  .section-header-wrapper {
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-xs);
    border-bottom: 2px solid var(--border);
  }
  
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    color: var(--text-primary);
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: var(--spacing-xs);
    position: relative;
  }
  
  .section-with-copy {
    position: relative;
  }
  
  .header-actions {
    display: flex;
    gap: var(--spacing-xs);
    align-items: center;
    flex-shrink: 0;
  }
  
  .header-actions .graph-icon-btn,
  .header-actions .copy-icon-btn {
    position: static;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
  }
  
  .graph-icon-btn {
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--border-radius-sm);
    padding: var(--spacing-xs);
    cursor: pointer;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: all 0.2s ease;
    width: 28px;
    height: 28px;
    pointer-events: auto;
    position: absolute;
    top: var(--spacing-xs);
    right: var(--spacing-xs);
  }
  
  .graph-icon-btn:hover {
    background: rgba(15, 23, 42, 0.9);
    color: var(--primary-color);
    transform: translateY(-1px);
  }
  
  .graph-icon-btn svg {
    width: 14px;
    height: 14px;
  }
  
  .section-header .graph-icon-btn {
    position: static;
  }
  
  .copy-icon-btn {
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--border-radius-sm);
    padding: var(--spacing-xs);
    cursor: pointer;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: all 0.2s ease;
    width: 28px;
    height: 28px;
    pointer-events: auto;
    position: absolute;
    top: var(--spacing-xs);
    right: var(--spacing-xs);
  }
  
  
  .copy-icon-btn:hover {
    background: rgba(15, 23, 42, 0.9);
    color: var(--primary-color);
    transform: translateY(-1px);
  }
  
  .copy-icon-btn svg {
    width: 14px;
    height: 14px;
  }
  
  .section-header .copy-icon-btn,
  .section-header .graph-icon-btn {
    position: static;
  }
  
  .graph-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: var(--spacing-md);
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .graph-modal-content {
    width: 100%;
    max-width: 95vw;
    max-height: 95vh;
    overflow: hidden;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  
  .section-header .header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  
  .total-volume-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-xs);
  }
  
  .total-volume {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
    white-space: nowrap;
  }
  
  .muscle-groups-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    align-items: center;
    justify-content: flex-end;
  }
  
  .muscle-pill {
    display: inline-block;
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 1px 4px;
    border: 1px solid;
    border-radius: 3px;
  }

  .section-icon {
    color: var(--primary-color);
    flex-shrink: 0;
    width: 18px;
    height: 18px;
  }

  .steps-input-wrapper {
    position: relative;
  }

  .input-icon {
    position: absolute;
    left: var(--spacing-md);
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
    z-index: 1;
  }

  .steps-input-wrapper :global(.metric-input) :global(input) {
    padding-left: calc(var(--spacing-md) + 24px);
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }
  
  .date-input-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .today-pill {
    display: inline-block;
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 6px;
    border: 1px solid var(--primary-color);
    border-radius: 4px;
    color: var(--primary-color);
    background-color: rgba(59, 130, 246, 0.15);
    align-self: flex-start;
    margin-top: -4px;
  }

  .grid {
    display: grid;
    gap: var(--spacing-md);
  }

  .grid-2 {
    grid-template-columns: 1fr 1fr;
  }

  .grid-3 {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .food-macros-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
    margin-top: var(--spacing-sm);
  }
  
  .summary-label {
    color: var(--text-secondary);
    font-weight: 600;
  }
  
  .summary-values {
    display: flex;
    gap: var(--spacing-md);
  }
  
  .summary-macro {
    font-weight: 600;
  }
  
  .summary-macro.protein {
    color: #3b82f6;
  }
  
  .summary-macro.fat {
    color: #ef4444;
  }
  
  .summary-macro.carbs {
    color: #10b981;
  }
  
  .calories-display {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
    border: 1px solid var(--border-light);
    border-radius: var(--border-radius-sm);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .calories-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .calories-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--primary-color);
    text-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
  }

  @media (max-width: 600px) {
    .grid-3 {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 400px) {
    .grid-2, .grid-3 {
      grid-template-columns: 1fr;
    }
  }
  
  .saving-indicator {
    background-color: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: var(--primary-color);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-sm);
    margin-bottom: var(--spacing-md);
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  
  .saving-indicator::before {
    content: '';
    width: 12px;
    height: 12px;
    border: 2px solid var(--primary-color);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-message {
    background-color: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    padding: var(--spacing-md);
    border-radius: var(--border-radius-sm);
    margin-bottom: var(--spacing-md);
  }
  
  .success-message {
    background-color: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #6ee7b7;
    padding: var(--spacing-md);
    border-radius: var(--border-radius-sm);
    margin-bottom: var(--spacing-md);
  }
  
  /* Copy Modal - Prominent and Centered */
  .copy-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: var(--spacing-md);
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .copy-modal-content {
    background: var(--surface-elevated);
    border-radius: 12px;
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 2px solid var(--primary-color);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    transform-origin: center;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .copy-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 2px solid var(--border);
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
  }
  
  .copy-header h3 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  
  .copy-header h3::before {
    content: '📋';
    font-size: 1.6rem;
  }
  
  .copy-modal .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s;
  }
  
  .copy-modal .close-btn:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
  }
  
  .copy-body {
    padding: var(--spacing-xl);
    background: var(--surface);
  }
  
  .copy-body .form-field {
    margin-bottom: var(--spacing-md);
  }
  
  .copy-body label {
    display: block;
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 1rem;
  }
  
  .copy-body input[type="date"] {
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    border: 2px solid var(--border);
    border-radius: 8px;
    background-color: var(--surface-elevated);
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .copy-body input[type="date"]:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
  }
  
  .error-text {
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm);
    background-color: rgba(239, 68, 68, 0.1);
    border-radius: 6px;
    border-left: 3px solid #ef4444;
  }
  
  .copy-actions {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    border-top: 2px solid var(--border);
    justify-content: flex-end;
    background: var(--surface-elevated);
  }
  
  .copy-actions .cancel-btn {
    padding: var(--spacing-md) var(--spacing-xl);
    background-color: var(--surface);
    color: var(--text-primary);
    border: 2px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  .copy-actions .cancel-btn:hover {
    background-color: var(--surface-elevated);
    border-color: var(--text-secondary);
  }
  
  .copy-btn {
    padding: var(--spacing-md) var(--spacing-xl);
    background: linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 1rem;
    transition: all 0.2s;
    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
  }
  
  .copy-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--primary-hover) 0%, #1e40af 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
  }
  
  .copy-btn:active:not(:disabled) {
    transform: translateY(0);
  }
  
  .copy-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  @media (max-width: 640px) {
    .copy-modal-content {
      max-width: 95%;
      margin: var(--spacing-md);
    }
    
    .copy-header h3 {
      font-size: 1.1rem;
    }
    
    .copy-body {
      padding: var(--spacing-lg);
    }
  }

  /* Mobile: larger interactive fonts (dev evaluation) */
  @media (max-width: 767px) {
    .form-section h3,
    .section-header {
      font-size: 1.125rem;
    }
  }
</style>
