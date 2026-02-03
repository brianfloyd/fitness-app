<script>
  import { createEventDispatcher } from 'svelte';

  export let activities = []; // Array of { id, link, name, distance, time, type }

  const dispatch = createEventDispatcher();

  let inputValue = '';
  let isProcessing = false;
  let error = null;

  async function handlePaste(event) {
    const pastedText = event.clipboardData.getData('text');
    if (pastedText && pastedText.includes('strava')) {
      // Auto-trigger on paste if it looks like a Strava link
      setTimeout(() => {
        if (inputValue.includes('strava')) {
          handleAdd();
        }
      }, 100);
    }
  }

  async function handleAdd() {
    const link = inputValue.trim();
    if (!link) return;

    if (!link.includes('strava')) {
      error = 'Please enter a valid Strava link';
      return;
    }

    // Check if activity already exists
    if (activities.some(a => a.link === link || a.id === extractIdFromLink(link))) {
      error = 'This activity has already been added';
      inputValue = '';
      return;
    }

    isProcessing = true;
    error = null;

    try {
      const response = await fetch('/api/strava/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to parse Strava link (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          // Response might not be JSON, try text
          try {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText;
          } catch (e2) {
            // Ignore
          }
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Invalid response from server. Please try again.');
      }
      
      if (data.success && data.activity) {
        // Add the parsed activity
        const newActivities = [...activities, data.activity];
        dispatch('activitiesChanged', newActivities);
        inputValue = '';
        error = null;
      } else {
        throw new Error('Failed to parse activity');
      }
    } catch (err) {
      console.error('Error parsing Strava link:', err);
      error = err.message || 'Failed to parse Strava link. Please try again.';
    } finally {
      isProcessing = false;
    }
  }

  function handleRemove(index) {
    const newActivities = activities.filter((_, i) => i !== index);
    dispatch('activitiesChanged', newActivities);
  }

  function extractIdFromLink(link) {
    const match = link.match(/activities\/(\d+)/i);
    return match ? match[1] : null;
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  }
</script>

<div class="strava-activities">
  <label>Strava Activities</label>
  
  <!-- Add Activity Input -->
  <div class="add-activity">
    <input
      type="text"
      placeholder="Paste Strava link here..."
      bind:value={inputValue}
      on:paste={handlePaste}
      on:keydown={handleKeydown}
      disabled={isProcessing}
    />
    <button 
      type="button" 
      on:click={handleAdd}
      disabled={isProcessing || !inputValue.trim()}
      class="add-btn"
    >
      {isProcessing ? 'Parsing...' : 'Add'}
    </button>
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <!-- Activities List -->
  {#if activities.length > 0}
    <div class="activities-list">
      {#each activities as activity, index}
        <div class="activity-item">
          <div class="activity-info">
            <div class="activity-name">
              <a href={activity.link} target="_blank" rel="noopener noreferrer">
                {activity.name}
              </a>
            </div>
            <div class="activity-details">
              {#if activity.distance}
                <span class="detail">
                  <strong>Distance:</strong> {activity.distance}
                </span>
              {/if}
              {#if activity.time}
                <span class="detail">
                  <strong>Time:</strong> {activity.time}
                </span>
              {/if}
              {#if activity.type && activity.type !== 'activity'}
                <span class="detail">
                  <strong>Type:</strong> {activity.type}
                </span>
              {/if}
            </div>
          </div>
          <button 
            type="button" 
            class="remove-btn"
            on:click={() => handleRemove(index)}
            title="Remove activity"
          >
            ×
          </button>
        </div>
      {/each}
    </div>
  {:else}
    <div class="no-activities">No activities added yet</div>
  {/if}
</div>

<style>
  .strava-activities {
    margin-bottom: var(--spacing-md);
  }

  .strava-activities label {
    display: block;
    margin-bottom: var(--spacing-xs);
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .add-activity {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .add-activity input {
    flex: 1;
    padding: var(--spacing-sm);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    background-color: var(--input-background);
    color: var(--text-primary);
    font-size: 1rem;
  }

  .add-activity input:focus {
    border-color: var(--primary-color);
    outline: none;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  }

  .add-activity input:disabled {
    background-color: var(--input-readonly-background);
    cursor: not-allowed;
  }

  .add-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-size: 0.9rem;
    white-space: nowrap;
    transition: background-color 0.2s;
  }

  .add-btn:hover:not(:disabled) {
    background-color: var(--primary-dark);
  }

  .add-btn:disabled {
    background-color: var(--button-disabled);
    cursor: not-allowed;
  }

  .error-message {
    background-color: #fee2e2;
    color: #991b1b;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
    margin-bottom: var(--spacing-sm);
  }

  .activities-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .activity-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: var(--spacing-sm);
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    gap: var(--spacing-sm);
  }

  .activity-info {
    flex: 1;
    min-width: 0;
  }

  .activity-name {
    margin-bottom: var(--spacing-xs);
  }

  .activity-name a {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 500;
    word-break: break-all;
  }

  .activity-name a:hover {
    text-decoration: underline;
  }

  .activity-details {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .activity-details .detail {
    white-space: nowrap;
  }

  .activity-details strong {
    color: var(--text-primary);
    margin-right: 0.25rem;
  }

  .remove-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .remove-btn:hover {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .no-activities {
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-style: italic;
    padding: var(--spacing-sm);
    text-align: center;
  }
</style>
