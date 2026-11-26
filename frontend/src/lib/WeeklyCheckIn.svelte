<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { getWeeklySummary, getSettings } from './api.js';
  
  const dispatch = createEventDispatcher();
  
  let loading = true;
  let error = null;
  let summary = null;
  let settings = null;
  
  onMount(async () => {
    await loadData();
  });
  
  async function loadData() {
    try {
      loading = true;
      error = null;
      [summary, settings] = await Promise.all([
        getWeeklySummary(),
        getSettings(),
      ]);
    } catch (err) {
      console.error('Error loading weekly summary:', err);
      error = err.message || 'Failed to load weekly summary';
    } finally {
      loading = false;
    }
  }
  
  function handleClose() {
    dispatch('close');
  }
  
  // Format numbers
  function formatNumber(n, decimals = 1) {
    if (n === null || n === undefined) return '—';
    return Number(n).toFixed(decimals);
  }
  
  // Calculate program phase
  $: programPhase = (() => {
    if (!settings?.ramp_start_date && !settings?.program_start_date) return null;
    
    const today = new Date();
    const rampStart = settings.ramp_start_date ? new Date(settings.ramp_start_date) : null;
    const programStart = settings.program_start_date ? new Date(settings.program_start_date) : null;
    
    if (rampStart && today < rampStart) {
      const daysUntil = Math.ceil((rampStart - today) / (1000 * 60 * 60 * 24));
      return { phase: 'pre-ramp', label: `${daysUntil} days until ramp week` };
    }
    
    if (rampStart && programStart && today >= rampStart && today < programStart) {
      const daysIn = Math.floor((today - rampStart) / (1000 * 60 * 60 * 24)) + 1;
      return { phase: 'ramp', label: `Ramp Week - Day ${daysIn} (50-60% effort)` };
    }
    
    if (programStart && today >= programStart) {
      const daysSince = Math.floor((today - programStart) / (1000 * 60 * 60 * 24));
      const blockWeeks = settings.block_duration_weeks || 4;
      const blockDays = blockWeeks * 7;
      const blockNumber = Math.floor(daysSince / blockDays) + 1;
      const dayInBlock = (daysSince % blockDays) + 1;
      const weekInBlock = Math.floor((dayInBlock - 1) / 7) + 1;
      return { 
        phase: 'full', 
        label: `Block ${blockNumber} - Week ${weekInBlock}`,
        blockNumber,
        weekInBlock,
      };
    }
    
    return null;
  })();
</script>

<div class="weekly-check-in">
  <div class="header">
    <h2>Weekly Check-In</h2>
    <button type="button" class="close-btn" on:click={handleClose}>×</button>
  </div>
  
  {#if loading}
    <div class="loading">Loading summary...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if summary}
    <div class="summary-content">
      {#if programPhase}
        <div class="phase-banner" class:ramp={programPhase.phase === 'ramp'}>
          <span class="phase-label">{programPhase.label}</span>
        </div>
      {/if}
      
      <div class="summary-grid">
        <!-- Body Composition -->
        <div class="summary-card body">
          <h3>Body Composition</h3>
          <div class="metrics">
            <div class="metric">
              <span class="metric-label">Weight Avg</span>
              <span class="metric-value">{formatNumber(summary.body?.weight_avg)} lbs</span>
            </div>
            <div class="metric">
              <span class="metric-label">Weight Trend</span>
              <span class="metric-value" class:positive={summary.body?.weight_trend < 0} class:negative={summary.body?.weight_trend > 0}>
                {summary.body?.weight_trend > 0 ? '+' : ''}{formatNumber(summary.body?.weight_trend)} lbs
              </span>
            </div>
            <div class="metric">
              <span class="metric-label">Latest Waist</span>
              <span class="metric-value">{formatNumber(summary.body?.waist_latest)}"</span>
            </div>
          </div>
        </div>
        
        <!-- Nutrition -->
        <div class="summary-card nutrition">
          <h3>Nutrition</h3>
          <div class="metrics">
            <div class="metric">
              <span class="metric-label">Avg Calories</span>
              <span class="metric-value">{summary.nutrition?.calories_avg || '—'} kcal</span>
              <span class="metric-target">Target: {summary.nutrition?.calorie_target?.min}-{summary.nutrition?.calorie_target?.max}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Avg Protein</span>
              <span class="metric-value">{summary.nutrition?.protein_avg || '—'}g</span>
              <span class="metric-target">Target: {summary.nutrition?.protein_target?.min}-{summary.nutrition?.protein_target?.max}g</span>
            </div>
            <div class="metric">
              <span class="metric-label">Days on Target</span>
              <span class="metric-value">{summary.nutrition?.days_on_target || 0} / {summary.period?.days_logged || 7}</span>
            </div>
          </div>
        </div>
        
        <!-- Training -->
        <div class="summary-card training">
          <h3>Training</h3>
          <div class="metrics">
            <div class="metric">
              <span class="metric-label">Total Volume</span>
              <span class="metric-value">{(summary.training?.total_volume_lbs || 0).toLocaleString()} lbs</span>
            </div>
            <div class="metric">
              <span class="metric-label">Workouts</span>
              <span class="metric-value">{summary.training?.workouts_count || 0}</span>
            </div>
            {#if summary.training?.pain_reports?.length > 0}
              <div class="pain-warning">
                <span class="warning-icon">⚠️</span>
                <span>{summary.training.pain_reports.length} pain report{summary.training.pain_reports.length > 1 ? 's' : ''}</span>
              </div>
            {/if}
          </div>
          
          {#if summary.training?.exercises_with_pain?.length > 0}
            <div class="pain-exercises">
              <h4>Exercises with Pain</h4>
              {#each summary.training.exercises_with_pain as ex}
                <div class="pain-exercise">
                  <span class="exercise-name">{ex.exercise}</span>
                  {#if ex.substitutions?.length > 0}
                    <span class="substitutions">Try: {ex.substitutions.join(', ')}</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
        
        <!-- Skating -->
        <div class="summary-card skating">
          <h3>Skateboard Training</h3>
          <div class="metrics">
            <div class="metric">
              <span class="metric-label">Total Distance</span>
              <span class="metric-value">{summary.skating?.total_miles || 0} mi</span>
            </div>
            <div class="metric">
              <span class="metric-label">Total Time</span>
              <span class="metric-value">{summary.skating?.total_minutes || 0} min</span>
            </div>
            <div class="metric">
              <span class="metric-label">Switch Practice</span>
              <span class="metric-value">{summary.skating?.switch_minutes || 0} min</span>
            </div>
            {#if summary.skating?.ultraskate_countdown_days !== null}
              <div class="countdown">
                <span class="countdown-label">Ultraskate</span>
                <span class="countdown-value">{summary.skating.ultraskate_countdown_days} days</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
      
      <div class="period-info">
        Week of {summary.period?.start} to {summary.period?.end} • {summary.period?.days_logged} days logged
      </div>
    </div>
  {/if}
</div>

<style>
  .weekly-check-in {
    background: var(--surface);
    border-radius: var(--border-radius);
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--surface);
    z-index: 10;
  }
  
  .header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
  }
  
  .close-btn {
    width: 36px;
    height: 36px;
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--border-radius-sm);
  }
  
  .close-btn:hover {
    background: var(--surface-elevated);
    color: var(--text-primary);
  }
  
  .loading, .error {
    padding: var(--spacing-xl);
    text-align: center;
    color: var(--text-secondary);
  }
  
  .error {
    color: #ef4444;
  }
  
  .summary-content {
    padding: var(--spacing-lg);
  }
  
  .phase-banner {
    padding: var(--spacing-md);
    background: linear-gradient(135deg, var(--primary-color), #6366f1);
    border-radius: var(--border-radius-sm);
    margin-bottom: var(--spacing-lg);
    text-align: center;
  }
  
  .phase-banner.ramp {
    background: linear-gradient(135deg, #f59e0b, #d97706);
  }
  
  .phase-label {
    color: white;
    font-weight: 700;
    font-size: 1.125rem;
  }
  
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
  
  @media (max-width: 600px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }
  }
  
  .summary-card {
    padding: var(--spacing-md);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
  }
  
  .summary-card h3 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border);
  }
  
  .metrics {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .metric {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }
  
  .metric-label {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  
  .metric-value {
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .metric-value.positive {
    color: #22c55e;
  }
  
  .metric-value.negative {
    color: #ef4444;
  }
  
  .metric-target {
    width: 100%;
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: right;
  }
  
  .pain-warning {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--border-radius-sm);
    color: #f87171;
    font-size: 0.875rem;
  }
  
  .pain-exercises {
    margin-top: var(--spacing-md);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border);
  }
  
  .pain-exercises h4 {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
  }
  
  .pain-exercise {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) 0;
  }
  
  .exercise-name {
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .substitutions {
    font-size: 0.75rem;
    color: var(--primary-color);
  }
  
  .countdown {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    background: var(--surface);
    border-radius: var(--border-radius-sm);
    margin-top: var(--spacing-sm);
  }
  
  .countdown-label {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  
  .countdown-value {
    font-weight: 700;
    color: var(--primary-color);
  }
  
  .period-info {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.75rem;
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border);
  }
</style>
