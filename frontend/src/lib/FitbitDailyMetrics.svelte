<script>
  import { onMount } from 'svelte';
  import { getFitbitDailyMetrics } from './api.js';

  export let date = '';
  export let connected = false;

  let loading = false;
  let error = null;
  let data = null;

  async function load() {
    if (!date || !connected) {
      data = null;
      return;
    }
    loading = true;
    error = null;
    try {
      const res = await getFitbitDailyMetrics(date);
      if (res.connected && res.metrics) {
        data = res.metrics;
      } else {
        data = null;
      }
    } catch (e) {
      error = e.message || 'Failed to load Fitbit metrics';
      data = null;
    } finally {
      loading = false;
    }
  }

  $: if (date && connected) {
    load();
  } else {
    data = null;
  }
</script>

<div class="fitbit-metrics">
  <h3 class="section-header">
    <span class="device-icon">⌚</span>
    Fitbit Daily Metrics
  </h3>
  {#if !connected}
    <p class="help-text">Connect Fitbit in Settings to see your daily metrics.</p>
  {:else if loading}
    <p class="loading">Loading…</p>
  {:else if error}
    <p class="error-text">{error}</p>
  {:else if data}
    <div class="metrics-grid">
      <div class="metric-group">
        <h4>Activity</h4>
        <div class="metric-row"><span>Steps</span><span>{data.steps ?? '—'}</span></div>
        <div class="metric-row"><span>Distance</span><span>{data.distance != null ? `${data.distance} mi` : '—'}</span></div>
        <div class="metric-row"><span>Floors</span><span>{data.floors ?? '—'}</span></div>
        <div class="metric-row"><span>Calories Out</span><span>{data.caloriesOut ?? '—'}</span></div>
        <div class="metric-row"><span>Activity Calories</span><span>{data.activityCalories ?? '—'}</span></div>
      </div>
      <div class="metric-group">
        <h4>Active Minutes</h4>
        <div class="metric-row"><span>Sedentary</span><span>{data.sedentaryMinutes ?? '—'} min</span></div>
        <div class="metric-row"><span>Lightly Active</span><span>{data.lightlyActiveMinutes ?? '—'} min</span></div>
        <div class="metric-row"><span>Fairly Active</span><span>{data.fairlyActiveMinutes ?? '—'} min</span></div>
        <div class="metric-row"><span>Very Active</span><span>{data.veryActiveMinutes ?? '—'} min</span></div>
      </div>
      <div class="metric-group">
        <h4>Zone Minutes</h4>
        <div class="metric-row"><span>Total AZM</span><span>{data.activeZoneMinutes ?? '—'}</span></div>
        <div class="metric-row"><span>Fat Burn</span><span>{data.fatBurnMinutes ?? '—'} min</span></div>
        <div class="metric-row"><span>Cardio</span><span>{data.cardioMinutes ?? '—'} min</span></div>
        <div class="metric-row"><span>Peak</span><span>{data.peakMinutes ?? '—'} min</span></div>
      </div>
      <div class="metric-group">
        <h4>Sleep</h4>
        <div class="metric-row"><span>Total Asleep</span><span>{data.totalMinutesAsleep != null ? `${Math.floor(data.totalMinutesAsleep / 60)}h ${data.totalMinutesAsleep % 60}m` : '—'}</span></div>
        <div class="metric-row"><span>Time in Bed</span><span>{data.totalTimeInBed != null ? `${Math.floor(data.totalTimeInBed / 60)}h ${data.totalTimeInBed % 60}m` : '—'}</span></div>
        <div class="metric-row"><span>Efficiency</span><span>{data.sleepEfficiency != null ? `${data.sleepEfficiency}%` : '—'}</span></div>
        <div class="metric-row"><span>Deep</span><span>{data.deepMinutes ?? '—'} min</span></div>
        <div class="metric-row"><span>Light</span><span>{data.lightMinutes ?? '—'} min</span></div>
        <div class="metric-row"><span>REM</span><span>{data.remMinutes ?? '—'} min</span></div>
        <div class="metric-row"><span>Wake</span><span>{data.wakeMinutes ?? '—'} min</span></div>
      </div>
      <div class="metric-group">
        <h4>Heart & Goals</h4>
        <div class="metric-row"><span>Resting HR</span><span>{data.restingHeartRate ?? '—'} bpm</span></div>
        <div class="metric-row"><span>Step Goal</span><span>{data.goals?.steps ?? '—'}</span></div>
        <div class="metric-row"><span>Calorie Goal</span><span>{data.goals?.caloriesOut ?? '—'}</span></div>
        <div class="metric-row"><span>Active Min Goal</span><span>{data.goals?.activeMinutes ?? '—'} min</span></div>
      </div>
    </div>
  {:else}
    <p class="help-text">No data for this date.</p>
  {/if}
</div>

<style>
  .fitbit-metrics {
    margin-top: var(--spacing-md);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin: 0 0 var(--spacing-md);
    font-size: 1rem;
  }

  .device-icon {
    font-size: 1.25rem;
  }

  .help-text,
  .loading,
  .error-text {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .error-text {
    color: #fca5a5;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--spacing-lg);
  }

  .metric-group {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    padding: var(--spacing-md);
  }

  .metric-group h4 {
    margin: 0 0 var(--spacing-sm);
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--primary-color);
  }

  .metric-row {
    display: flex;
    justify-content: space-between;
    gap: var(--spacing-sm);
    font-size: 0.8125rem;
    padding: 2px 0;
  }

  .metric-row span:first-child {
    color: var(--text-muted);
  }

  .metric-row span:last-child {
    font-weight: 500;
  }
</style>
