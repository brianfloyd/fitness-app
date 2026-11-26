<script>
  import { createEventDispatcher } from 'svelte';
  
  export let sessions = []; // Array of { id, session_type, distance_miles, duration_minutes, switch_foot_minutes, weak_side_comfort, notes }
  
  const dispatch = createEventDispatcher();
  
  const SESSION_TYPES = [
    { value: 'ldp', label: 'LDP (Long Distance Push)' },
    { value: 'scogging', label: 'Scogging' },
    { value: 'freestyle', label: 'Freestyle/Practice' },
    { value: 'long_session', label: 'Long Session (2+ hours)' },
    { value: 'switch_practice', label: 'Switch-Foot Practice' },
  ];
  
  let showAddForm = false;
  let newSession = {
    session_type: 'ldp',
    distance_miles: '',
    duration_minutes: '',
    switch_foot_minutes: '',
    weak_side_comfort: 5,
    notes: '',
  };
  
  function addSession() {
    if (!newSession.session_type) return;
    
    const session = {
      id: Date.now() + Math.random(),
      session_type: newSession.session_type,
      distance_miles: parseFloat(newSession.distance_miles) || 0,
      duration_minutes: parseInt(newSession.duration_minutes) || 0,
      switch_foot_minutes: parseInt(newSession.switch_foot_minutes) || 0,
      weak_side_comfort: parseInt(newSession.weak_side_comfort) || 5,
      notes: newSession.notes || '',
    };
    
    const updated = [...sessions, session];
    sessions = updated;
    dispatch('sessionsChanged', updated);
    
    // Reset form
    newSession = {
      session_type: 'ldp',
      distance_miles: '',
      duration_minutes: '',
      switch_foot_minutes: '',
      weak_side_comfort: 5,
      notes: '',
    };
    showAddForm = false;
  }
  
  function removeSession(sessionId) {
    const updated = sessions.filter(s => s.id !== sessionId);
    sessions = updated;
    dispatch('sessionsChanged', updated);
  }
  
  function getSessionTypeLabel(type) {
    return SESSION_TYPES.find(t => t.value === type)?.label || type;
  }
  
  // Calculate totals
  $: totalMiles = sessions.reduce((sum, s) => sum + (parseFloat(s.distance_miles) || 0), 0);
  $: totalMinutes = sessions.reduce((sum, s) => sum + (parseInt(s.duration_minutes) || 0), 0);
  $: totalSwitchMinutes = sessions.reduce((sum, s) => sum + (parseInt(s.switch_foot_minutes) || 0), 0);
</script>

<div class="skate-training">
  <div class="skate-header">
    <h4>
      <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 12h8M12 8v8"/>
      </svg>
      Skateboard Training
    </h4>
    {#if sessions.length > 0}
      <div class="totals">
        <span class="total-badge">{totalMiles.toFixed(1)} mi</span>
        <span class="total-badge">{totalMinutes} min</span>
        {#if totalSwitchMinutes > 0}
          <span class="total-badge switch">🔄 {totalSwitchMinutes} min switch</span>
        {/if}
      </div>
    {/if}
  </div>
  
  {#if sessions.length > 0}
    <div class="sessions-list">
      {#each sessions as session (session.id)}
        <div class="session-card">
          <div class="session-type">{getSessionTypeLabel(session.session_type)}</div>
          <div class="session-stats">
            {#if session.distance_miles > 0}
              <span>{session.distance_miles} mi</span>
            {/if}
            {#if session.duration_minutes > 0}
              <span>{session.duration_minutes} min</span>
            {/if}
            {#if session.switch_foot_minutes > 0}
              <span class="switch-stat">🔄 {session.switch_foot_minutes} min</span>
            {/if}
            {#if session.weak_side_comfort}
              <span class="comfort-stat" title="Weak-side comfort">
                {session.weak_side_comfort}/10
              </span>
            {/if}
          </div>
          {#if session.notes}
            <div class="session-notes">{session.notes}</div>
          {/if}
          <button type="button" class="remove-btn" on:click={() => removeSession(session.id)} aria-label="Remove session">×</button>
        </div>
      {/each}
    </div>
  {/if}
  
  {#if showAddForm}
    <div class="add-form">
      <div class="form-row">
        <div class="form-field">
          <label for="skate-session-type">Session Type</label>
          <select id="skate-session-type" bind:value={newSession.session_type}>
            {#each SESSION_TYPES as type}
              <option value={type.value}>{type.label}</option>
            {/each}
          </select>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-field">
          <label for="skate-distance">Distance (miles)</label>
          <input id="skate-distance" type="number" step="0.1" min="0" bind:value={newSession.distance_miles} placeholder="0.0" />
        </div>
        <div class="form-field">
          <label for="skate-duration">Duration (min)</label>
          <input id="skate-duration" type="number" step="1" min="0" bind:value={newSession.duration_minutes} placeholder="0" />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-field">
          <label for="skate-switch">Switch-Foot (min)</label>
          <input id="skate-switch" type="number" step="1" min="0" bind:value={newSession.switch_foot_minutes} placeholder="0" />
        </div>
        <div class="form-field">
          <label for="skate-comfort">Weak-Side Comfort</label>
          <div class="comfort-input">
            <input id="skate-comfort" type="range" min="1" max="10" bind:value={newSession.weak_side_comfort} />
            <span class="comfort-value">{newSession.weak_side_comfort}/10</span>
          </div>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-field full-width">
          <label for="skate-notes">Notes</label>
          <input id="skate-notes" type="text" bind:value={newSession.notes} placeholder="Session notes..." />
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" class="cancel-btn" on:click={() => showAddForm = false}>Cancel</button>
        <button type="button" class="add-btn" on:click={addSession}>Add Session</button>
      </div>
    </div>
  {:else}
    <button type="button" class="add-session-btn" on:click={() => showAddForm = true}>
      + Add Skate Session
    </button>
  {/if}
</div>

<style>
  .skate-training {
    margin-bottom: var(--spacing-md);
  }
  
  .skate-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }
  
  .skate-header h4 {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .section-icon {
    color: var(--primary-color);
  }
  
  .totals {
    display: flex;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
  }
  
  .total-badge {
    padding: 2px 8px;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
  }
  
  .total-badge.switch {
    color: var(--primary-color);
    border-color: var(--primary-color);
  }
  
  .sessions-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }
  
  .session-card {
    position: relative;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
  }
  
  .session-type {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
  }
  
  .session-stats {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .switch-stat {
    color: var(--primary-color);
  }
  
  .comfort-stat {
    padding: 1px 6px;
    background: var(--surface);
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
  }
  
  .session-notes {
    margin-top: var(--spacing-xs);
    font-size: 0.8125rem;
    color: var(--text-muted);
    font-style: italic;
  }
  
  .remove-btn {
    position: absolute;
    top: var(--spacing-xs);
    right: var(--spacing-xs);
    width: 24px;
    height: 24px;
    padding: 0;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.25rem;
    cursor: pointer;
    border-radius: var(--border-radius-sm);
  }
  
  .remove-btn:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
  
  .add-form {
    padding: var(--spacing-md);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }
  
  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .form-field.full-width {
    grid-column: 1 / -1;
  }
  
  .form-field label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }
  
  .form-field input,
  .form-field select {
    padding: var(--spacing-sm);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    color: var(--text-primary);
    font-size: 0.875rem;
  }
  
  .comfort-input {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  
  .comfort-input input[type="range"] {
    flex: 1;
    accent-color: var(--primary-color);
  }
  
  .comfort-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    min-width: 40px;
  }
  
  .form-actions {
    display: flex;
    gap: var(--spacing-sm);
    justify-content: flex-end;
  }
  
  .cancel-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    border-radius: var(--border-radius-sm);
    cursor: pointer;
  }
  
  .add-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--primary-color);
    border: none;
    color: white;
    border-radius: var(--border-radius-sm);
    font-weight: 600;
    cursor: pointer;
  }
  
  .add-session-btn {
    width: 100%;
    padding: var(--spacing-md);
    background: transparent;
    border: 2px dashed var(--border);
    color: var(--text-secondary);
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .add-session-btn:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
  
  @media (max-width: 480px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
