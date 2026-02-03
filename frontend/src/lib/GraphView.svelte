<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { getRecentLogs, getSettings } from './api.js';
  import PhotoGrid from './PhotoGrid.svelte';
  
  const dispatch = createEventDispatcher();
  
  export let category = 'photo'; // 'photo', 'body', 'sleep', 'workout', 'macros'
  
  let logs = [];
  let loading = true;
  let error = null;
  
  // Photo progression state
  let progressionMode = false;
  let progressionDelay = 500; // milliseconds
  
  // Comparison mode state
  let comparisonMode = 'all'; // 'all', 'first-last', 'first-middle-last', 'custom'
  let customDays = [1, 3, 8, 15, 65, 85]; // Example custom days
  let showCustomDayEditor = false;
  let customDayInput = '';
  
  // Settings for date range
  let settings = null;
  
  const categoryTitles = {
    photo: 'Photo Progression',
    body: 'Body Composition',
    sleep: 'Sleep & Activity',
    workout: 'Workout Volume',
    macros: 'Nutrition Tracking',
  };
  
  onMount(async () => {
    try {
      loading = true;
      error = null;
      
      // Load settings and logs
      settings = await getSettings();
      logs = await getRecentLogs(100); // Get more logs for graphs
      
    } catch (err) {
      console.error('Error loading graph data:', err);
      error = 'Failed to load data';
    } finally {
      loading = false;
    }
  });
  
  function handleClose() {
    progressionMode = false;
    dispatch('close');
  }
  
  function startProgression() {
    progressionMode = true;
  }
  
  function handleProgressionEnd() {
    progressionMode = false;
  }
  
  // Reset progression only when the user changes comparison mode (not when progressionMode changes)
  let prevComparisonMode = comparisonMode;
  $: if (prevComparisonMode !== comparisonMode) {
    prevComparisonMode = comparisonMode;
    if (progressionMode) {
      progressionMode = false;
    }
  } else {
    prevComparisonMode = comparisonMode;
  }
  
  function addCustomDay() {
    const day = parseInt(customDayInput);
    if (!isNaN(day) && day > 0 && !customDays.includes(day)) {
      customDays = [...customDays, day].sort((a, b) => a - b);
      customDayInput = '';
    }
  }
  
  function removeCustomDay(day) {
    customDays = customDays.filter(d => d !== day);
  }
  
  function handleCustomDayKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCustomDay();
    }
  }
  
  // Filter logs with relevant data for each category
  $: allFilteredLogs = logs.filter(log => {
    switch (category) {
      case 'photo':
        return log.photo_mime_type;
      case 'body':
        return log.weight || log.fat_percent;
      case 'sleep':
        return log.sleep_time || log.sleep_score || log.steps;
      case 'workout':
        return log.workout;
      case 'macros':
        return log.protein || log.fat || log.carbs;
      default:
        return true;
    }
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculate day numbers for photos (relative to start date)
  $: photoLogsWithDays = allFilteredLogs.map(log => {
    if (!settings || !settings.start_date) return { ...log, dayNumber: null };
    
    const startParts = settings.start_date.split('-');
    const logParts = log.date.split('-');
    const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
    const logDate = new Date(parseInt(logParts[0]), parseInt(logParts[1]) - 1, parseInt(logParts[2]));
    start.setHours(0, 0, 0, 0);
    logDate.setHours(0, 0, 0, 0);
    const diffTime = logDate - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const dayNumber = diffDays + 1; // Day 1 = start date
    
    return { ...log, dayNumber };
  }).filter(log => log.dayNumber !== null);
  
  // Get comparison logs based on selected mode
  $: filteredLogs = (() => {
    if (category !== 'photo' || comparisonMode === 'all') {
      return allFilteredLogs;
    }
    
    if (photoLogsWithDays.length === 0) return [];
    
    if (comparisonMode === 'first-last') {
      const first = photoLogsWithDays[0];
      const last = photoLogsWithDays[photoLogsWithDays.length - 1];
      return first && last ? [first, last] : [];
    }
    
    if (comparisonMode === 'first-middle-last') {
      const first = photoLogsWithDays[0];
      const last = photoLogsWithDays[photoLogsWithDays.length - 1];
      const middleIndex = Math.floor(photoLogsWithDays.length / 2);
      const middle = photoLogsWithDays[middleIndex];
      const result = [first];
      if (middle && middle !== first) result.push(middle);
      if (last && last !== first && last !== middle) result.push(last);
      return result;
    }
    
    if (comparisonMode === 'custom') {
      // Filter logs that match custom day numbers
      return photoLogsWithDays.filter(log => 
        customDays.includes(log.dayNumber)
      ).sort((a, b) => a.dayNumber - b.dayNumber);
    }
    
    return allFilteredLogs;
  })();
  
  // Calculate workout volume from JSON
  function getWorkoutVolume(workout) {
    if (!workout) return 0;
    try {
      const exercises = JSON.parse(workout);
      if (!Array.isArray(exercises)) return 0;
      return exercises.reduce((total, ex) => {
        if (!ex.sets || !Array.isArray(ex.sets)) return total;
        return total + ex.sets.reduce((setTotal, set) => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseFloat(set.reps) || 0;
          return setTotal + (weight * reps);
        }, 0);
      }, 0);
    } catch (e) {
      return 0;
    }
  }
  
  // Format sleep time for display
  function formatSleepTime(sleepTime) {
    if (!sleepTime) return null;
    const parts = sleepTime.split(':');
    if (parts.length < 2) return null;
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    return hours + (minutes / 60);
  }
</script>

<div class="graph-view">
  <div class="graph-header">
    <h2 class="graph-title">{categoryTitles[category] || 'Data View'}</h2>
    <button type="button" class="close-btn" on:click={handleClose}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
  
  <div class="graph-content">
    {#if loading}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading data...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <p>{error}</p>
        <button type="button" on:click={handleClose}>Close</button>
      </div>
    {:else if category === 'photo'}
      <!-- Photo Progression View -->
      <div class="photo-view">
        {#if !progressionMode}
          <div class="progression-controls">
            <!-- Comparison Mode Selection -->
            <div class="comparison-mode-section">
              <label for="comparison-mode" class="section-label">Compare Mode:</label>
              <select 
                id="comparison-mode"
                bind:value={comparisonMode}
                class="comparison-select"
              >
                <option value="all">All Photos ({allFilteredLogs.length})</option>
                <option value="first-last">First & Last (2)</option>
                <option value="first-middle-last">First, Middle & Last (3)</option>
                <option value="custom">Custom Days ({customDays.length})</option>
              </select>
              {#if comparisonMode !== 'all' && filteredLogs.length > 0}
                <span class="comparison-count">Showing {filteredLogs.length} photo{filteredLogs.length !== 1 ? 's' : ''}</span>
              {/if}
            </div>
            
            <!-- Custom Days Editor -->
            {#if comparisonMode === 'custom'}
              <div class="custom-days-section">
                <div class="custom-days-header">
                  <span class="section-label">Selected Days:</span>
                  <button 
                    type="button"
                    class="toggle-editor-btn"
                    on:click={() => showCustomDayEditor = !showCustomDayEditor}
                  >
                    {showCustomDayEditor ? 'Hide' : 'Edit'} Days
                  </button>
                </div>
                
                {#if showCustomDayEditor}
                  <div class="custom-day-editor">
                    <div class="add-day-input">
                      <input
                        type="number"
                        placeholder="Enter day number"
                        bind:value={customDayInput}
                        on:keydown={handleCustomDayKeydown}
                        min="1"
                      />
                      <button 
                        type="button"
                        class="add-day-btn"
                        on:click={addCustomDay}
                        disabled={!customDayInput || isNaN(parseInt(customDayInput))}
                      >
                        Add Day
                      </button>
                    </div>
                    <div class="custom-days-list">
                      {#each customDays as day}
                        <span class="day-chip">
                          Day {day}
                          <button 
                            type="button"
                            class="remove-day-btn"
                            on:click={() => removeCustomDay(day)}
                            aria-label="Remove day {day}"
                          >
                            ×
                          </button>
                        </span>
                      {/each}
                      {#if customDays.length === 0}
                        <span class="no-days-message">No days selected. Add days above.</span>
                      {/if}
                    </div>
                    {#if photoLogsWithDays.length > 0}
                      <div class="available-days-hint">
                        Available days: {photoLogsWithDays.map(l => l.dayNumber).join(', ')}
                      </div>
                    {/if}
                  </div>
                {:else}
                  <div class="custom-days-preview">
                    {#if customDays.length > 0}
                      <span class="days-count">{customDays.length} day{customDays.length !== 1 ? 's' : ''} selected</span>
                      <span class="days-list">Days: {customDays.join(', ')}</span>
                    {:else}
                      <span class="no-days-message">No days selected</span>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
            
            <!-- Speed Control -->
            <div class="control-row">
              <label for="delay-slider">Speed:</label>
              <input 
                id="delay-slider"
                type="range" 
                min="200" 
                max="2000" 
                step="100"
                bind:value={progressionDelay}
              />
              <span class="delay-label">{(progressionDelay / 1000).toFixed(1)}s</span>
            </div>
            
            <!-- Start Button -->
            <button 
              type="button" 
              class="start-progression-btn"
              on:click={startProgression}
              disabled={filteredLogs.length === 0}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Start Progression ({filteredLogs.length} photo{filteredLogs.length !== 1 ? 's' : ''})
            </button>
          </div>
        {/if}
        
        <PhotoGrid 
          logs={filteredLogs} 
          {progressionMode}
          {progressionDelay}
          on:progressionEnd={handleProgressionEnd}
        />
      </div>
    {:else if category === 'body'}
      <!-- Body Composition Graph -->
      <div class="data-graph">
        {#if filteredLogs.length === 0}
          <div class="empty-state">No body composition data available</div>
        {:else}
          <div class="data-table">
            <div class="table-header">
              <span>Date</span>
              <span>Weight (lbs)</span>
              <span>Fat %</span>
            </div>
            {#each filteredLogs.slice().reverse() as log}
              <div class="table-row">
                <span>{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span class="value">{log.weight || '—'}</span>
                <span class="value">{log.fat_percent || '—'}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if category === 'sleep'}
      <!-- Sleep & Activity Graph -->
      <div class="data-graph">
        {#if filteredLogs.length === 0}
          <div class="empty-state">No sleep & activity data available</div>
        {:else}
          <div class="data-table">
            <div class="table-header">
              <span>Date</span>
              <span>Sleep Time</span>
              <span>Score</span>
              <span>Steps</span>
            </div>
            {#each filteredLogs.slice().reverse() as log}
              <div class="table-row">
                <span>{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span class="value">{log.sleep_time || '—'}</span>
                <span class="value">{log.sleep_score || '—'}</span>
                <span class="value">{log.steps ? Number(log.steps).toLocaleString() : '—'}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if category === 'workout'}
      <!-- Workout Volume Graph -->
      <div class="data-graph">
        {#if filteredLogs.length === 0}
          <div class="empty-state">No workout data available</div>
        {:else}
          <div class="data-table">
            <div class="table-header">
              <span>Date</span>
              <span>Total Volume (lbs)</span>
            </div>
            {#each filteredLogs.slice().reverse() as log}
              {@const volume = getWorkoutVolume(log.workout)}
              <div class="table-row">
                <span>{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span class="value highlight">{volume > 0 ? volume.toLocaleString() : '—'}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if category === 'macros'}
      <!-- Nutrition Graph -->
      <div class="data-graph">
        {#if filteredLogs.length === 0}
          <div class="empty-state">No nutrition data available</div>
        {:else}
          <div class="data-table macros-table">
            <div class="table-header">
              <span>Date</span>
              <span class="protein">Protein</span>
              <span class="fat">Fat</span>
              <span class="carbs">Carbs</span>
              <span>Calories</span>
            </div>
            {#each filteredLogs.slice().reverse() as log}
              {@const p = parseFloat(log.protein) || 0}
              {@const f = parseFloat(log.fat) || 0}
              {@const c = parseFloat(log.carbs) || 0}
              {@const calories = (p * 4) + (f * 9) + (c * 4)}
              <div class="table-row">
                <span>{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span class="value protein">{log.protein || '—'}</span>
                <span class="value fat">{log.fat || '—'}</span>
                <span class="value carbs">{log.carbs || '—'}</span>
                <span class="value">{calories > 0 ? Math.round(calories) : '—'}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .graph-view {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .graph-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    flex-shrink: 0;
  }
  
  .graph-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  
  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--border-radius-sm);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    color: var(--text-primary);
    background-color: var(--surface-elevated);
  }
  
  .graph-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg);
  }
  
  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);
    text-align: center;
    min-height: 200px;
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: var(--spacing-md);
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .photo-view {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }
  
  .progression-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--surface-elevated);
    border-radius: var(--border-radius-sm);
    border: 1px solid var(--border);
    width: 100%;
  }
  
  .comparison-mode-section {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
    width: 100%;
    padding: var(--spacing-sm);
    background-color: var(--surface);
    border-radius: var(--border-radius-sm);
    border: 1px solid var(--border);
  }
  
  .comparison-count {
    font-size: 0.75rem;
    color: var(--primary-color);
    font-weight: 600;
    margin-left: auto;
  }
  
  .section-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0;
    text-transform: none;
    white-space: nowrap;
  }
  
  .comparison-select {
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--surface-elevated);
    border: 2px solid var(--border);
    border-radius: var(--border-radius-sm);
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 200px;
    flex: 1;
  }
  
  .comparison-select:hover {
    border-color: var(--primary-color);
  }
  
  .comparison-select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .custom-days-section {
    width: 100%;
    padding: var(--spacing-sm);
    background-color: var(--surface);
    border-radius: var(--border-radius-sm);
    border: 1px solid var(--border);
  }
  
  .custom-days-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }
  
  .toggle-editor-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    color: var(--text-primary);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .toggle-editor-btn:hover {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
  
  .custom-day-editor {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .add-day-input {
    display: flex;
    gap: var(--spacing-xs);
  }
  
  .add-day-input input {
    flex: 1;
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    color: var(--text-primary);
    font-size: 0.875rem;
  }
  
  .add-day-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--primary-color);
    border: 1px solid var(--primary-color);
    border-radius: var(--border-radius-sm);
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  
  .add-day-btn:hover:not(:disabled) {
    background-color: var(--primary-hover);
    border-color: var(--primary-hover);
  }
  
  .add-day-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .custom-days-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    min-height: 32px;
    align-items: center;
  }
  
  .day-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--primary-color);
    color: white;
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .remove-day-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }
  
  .remove-day-btn:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
  
  .custom-days-preview {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .days-count {
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .days-list {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }
  
  .no-days-message {
    color: var(--text-muted);
    font-style: italic;
    font-size: 0.75rem;
  }
  
  .available-days-hint {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-style: italic;
    margin-top: var(--spacing-xs);
  }
  
  .control-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }
  
  .control-row label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0;
    text-transform: none;
  }
  
  .control-row input[type="range"] {
    width: 120px;
    accent-color: var(--primary-color);
  }
  
  .delay-label {
    font-size: 0.875rem;
    color: var(--text-primary);
    font-weight: 600;
    min-width: 40px;
  }
  
  .start-progression-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-lg);
    background: linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%);
    color: white;
    border: none;
    border-radius: var(--border-radius-sm);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
  }
  
  .start-progression-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  }
  
  .start-progression-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  .data-graph {
    width: 100%;
  }
  
  .data-table {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    overflow: hidden;
  }
  
  .table-header {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--surface-elevated);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border);
  }
  
  .data-table.macros-table .table-header,
  .data-table.macros-table .table-row {
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  }
  
  .table-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.875rem;
    border-bottom: 1px solid var(--border);
    transition: background-color 0.2s;
  }
  
  .table-row:last-child {
    border-bottom: none;
  }
  
  .table-row:hover {
    background-color: var(--surface-elevated);
  }
  
  .table-row .value {
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .table-row .value.highlight {
    color: var(--primary-color);
  }
  
  .table-row .value.protein,
  .table-header .protein {
    color: #3b82f6;
  }
  
  .table-row .value.fat,
  .table-header .fat {
    color: #ef4444;
  }
  
  .table-row .value.carbs,
  .table-header .carbs {
    color: #10b981;
  }
  
  /* Sleep table has 4 columns */
  .data-graph:has(.table-header span:nth-child(4)) .table-header,
  .data-graph:has(.table-row span:nth-child(4)) .table-row {
    grid-template-columns: 1fr 1fr 1fr 1fr;
  }
  
  /* Workout table has 2 columns */
  .data-graph:has(.table-header span:nth-child(2):last-child) .table-header,
  .data-graph:has(.table-row span:nth-child(2):last-child) .table-row {
    grid-template-columns: 1fr 1fr;
  }
  
  @media (max-width: 768px) {
    .graph-header {
      padding: var(--spacing-md);
    }
    
    .graph-title {
      font-size: 1.25rem;
    }
    
    .graph-content {
      padding: var(--spacing-md);
    }
    
    .progression-controls {
      padding: var(--spacing-sm);
    }
    
    .comparison-mode-section {
      flex-direction: column;
      align-items: stretch;
    }
    
    .comparison-select {
      width: 100%;
    }
    
    .control-row {
      justify-content: space-between;
      width: 100%;
    }
    
    .start-progression-btn {
      width: 100%;
      justify-content: center;
    }
    
    .custom-days-section {
      padding: var(--spacing-xs);
    }
    
    .table-header,
    .table-row {
      font-size: 0.75rem;
      padding: var(--spacing-xs) var(--spacing-sm);
    }
  }
</style>
