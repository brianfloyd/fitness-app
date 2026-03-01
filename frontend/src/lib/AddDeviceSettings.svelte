<script>
  import { onMount } from 'svelte';
  import { getFitbitAuthUrl, getFitbitStatus } from './api.js';

  let fitbitConnected = false;
  let fitbitLoading = false;
  let fitbitError = null;

  async function connectFitbit() {
    fitbitError = null;
    fitbitLoading = true;
    try {
      const { url } = await getFitbitAuthUrl();
      if (url) window.location.href = url;
      else fitbitError = 'Fitbit is not configured. See setup guide.';
    } catch (err) {
      fitbitError = err.message || 'Failed to start Fitbit connection';
    } finally {
      fitbitLoading = false;
    }
  }

  async function checkFitbitStatus() {
    try {
      const data = await getFitbitStatus();
      fitbitConnected = data.connected || false;
    } catch {
      fitbitConnected = false;
    }
  }

  onMount(() => {
    checkFitbitStatus();
  });
</script>

<div class="add-device-settings">
  <p class="section-desc">Connect wearable devices to sync activity data into your fitness log.</p>

  <div class="device-list">
    <div class="device-card">
      <div class="device-info">
        <div class="device-icon">⌚</div>
        <div>
          <h3>Fitbit</h3>
          <p>Sync steps, sleep, heart rate, and activity from your Fitbit device.</p>
        </div>
      </div>
      <div class="device-actions">
        {#if fitbitConnected}
          <span class="connected-badge">Connected</span>
        {:else}
          <button
            type="button"
            class="connect-btn"
            on:click={connectFitbit}
            disabled={fitbitLoading}
          >
            {fitbitLoading ? 'Connecting...' : 'Connect'}
          </button>
        {/if}
      </div>
    </div>
  </div>

  {#if fitbitError}
    <div class="error-message">{fitbitError}</div>
  {/if}

  <p class="help-text">
    After connecting, Fitbit data (steps, sleep) will sync to your daily log.
    Configure Fitbit in backend <code>.env</code> – see <strong>docs/FITBIT-SETUP.md</strong> for full instructions.
  </p>
</div>

<style>
  .add-device-settings {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .section-desc {
    color: var(--text-secondary);
    font-size: 0.9375rem;
    margin: 0;
  }

  .device-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .device-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    flex-wrap: wrap;
    gap: var(--spacing-md);
  }

  .device-info {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    flex: 1;
    min-width: 0;
  }

  .device-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .device-info h3 {
    margin: 0 0 var(--spacing-xs);
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .device-info p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .device-actions {
    flex-shrink: 0;
  }

  .connect-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .connect-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .connect-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .connected-badge {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
    font-weight: 600;
  }

  .error-message {
    background: #fee2e2;
    color: #991b1b;
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
    font-size: 0.875rem;
  }

  .help-text {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .help-text code {
    font-size: 0.8em;
  }
</style>
