<script>
  export let currentCalories = 0;
  export let calorieMin = 2100;
  export let calorieMax = 2200;
  export let currentProtein = 0;
  export let proteinMin = 160;
  export let proteinMax = 175;
  
  function getStatus(current, min, max) {
    if (current < min * 0.9) return 'low';
    if (current > max * 1.1) return 'high';
    if (current >= min && current <= max) return 'on-target';
    return 'close';
  }
  
  $: calorieStatus = getStatus(currentCalories, calorieMin, calorieMax);
  $: proteinStatus = getStatus(currentProtein, proteinMin, proteinMax);
  $: caloriePercent = Math.min(100, (currentCalories / calorieMax) * 100);
  $: proteinPercent = Math.min(100, (currentProtein / proteinMax) * 100);
  
  $: showProgress = currentCalories > 0 || currentProtein > 0;
</script>

{#if showProgress}
<div class="nutrition-progress">
  <div class="progress-row">
    <span class="progress-label">Cal</span>
    <div class="progress-bar-container">
      <div 
        class="progress-bar {calorieStatus}"
        style="width: {caloriePercent}%"
      ></div>
      <div 
        class="target-zone"
        style="left: {(calorieMin / calorieMax) * 100}%; width: {((calorieMax - calorieMin) / calorieMax) * 100}%"
      ></div>
    </div>
    <span class="progress-value {calorieStatus}">{Math.round(currentCalories)}/{calorieMin}-{calorieMax}</span>
  </div>
  
  <div class="progress-row">
    <span class="progress-label">Protein</span>
    <div class="progress-bar-container">
      <div 
        class="progress-bar {proteinStatus}"
        style="width: {proteinPercent}%"
      ></div>
      <div 
        class="target-zone"
        style="left: {(proteinMin / proteinMax) * 100}%; width: {((proteinMax - proteinMin) / proteinMax) * 100}%"
      ></div>
    </div>
    <span class="progress-value {proteinStatus}">{Math.round(currentProtein)}g/{proteinMin}-{proteinMax}</span>
  </div>
</div>
{/if}

<style>
  .nutrition-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px dashed var(--border);
  }
  
  .progress-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  
  .progress-label {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 40px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  
  .progress-bar-container {
    flex: 1;
    height: 8px;
    background: var(--surface-elevated);
    border-radius: 4px;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  
  .progress-bar {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  
  .progress-bar.low {
    background: linear-gradient(90deg, #ef4444, #f87171);
  }
  
  .progress-bar.close {
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
  }
  
  .progress-bar.on-target {
    background: linear-gradient(90deg, #22c55e, #4ade80);
  }
  
  .progress-bar.high {
    background: linear-gradient(90deg, #ef4444, #dc2626);
  }
  
  .target-zone {
    position: absolute;
    top: 0;
    height: 100%;
    border-left: 2px solid rgba(34, 197, 94, 0.5);
    border-right: 2px solid rgba(34, 197, 94, 0.5);
    pointer-events: none;
  }
  
  .progress-value {
    font-size: 0.6875rem;
    font-weight: 600;
    min-width: 90px;
    text-align: right;
  }
  
  .progress-value.low {
    color: #f87171;
  }
  
  .progress-value.close {
    color: #fbbf24;
  }
  
  .progress-value.on-target {
    color: #4ade80;
  }
  
  .progress-value.high {
    color: #ef4444;
  }
</style>
