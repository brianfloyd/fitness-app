<script>
  export let dayNumber = 1;
  export let totalDays = 84;
  export let onPrevious = () => {};
  export let onNext = () => {};
  
  $: progress = (dayNumber / totalDays) * 100;
  $: percentage = progress.toFixed(1);
  $: daysRemaining = totalDays - dayNumber;
  $: showPrevious = dayNumber > 1;
  $: showNext = dayNumber < totalDays;
  
  function handlePrevious() {
    if (showPrevious) {
      onPrevious();
    }
  }
  
  function handleNext() {
    if (showNext) {
      onNext();
    }
  }
</script>

<div class="day-counter">
  <div class="day-display">
    {#if showPrevious}
      <button class="nav-arrow" on:click={handlePrevious} aria-label="Previous day">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
    {:else}
      <span class="nav-arrow-placeholder"></span>
    {/if}
    <h2>Day {dayNumber} of {totalDays}</h2>
    {#if showNext}
      <button class="nav-arrow" on:click={handleNext} aria-label="Next day">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    {:else}
      <span class="nav-arrow-placeholder"></span>
    {/if}
  </div>
  <div class="progress-container">
    <div class="progress-bar">
      <div class="progress-fill" style="width: {progress}%"></div>
    </div>
    <span class="progress-percentage">{percentage}%</span>
    <span class="days-remaining">{daysRemaining} left</span>
  </div>
</div>

<style>
  .day-counter {
    margin-bottom: var(--spacing-xl);
    padding: var(--spacing-lg);
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
  }
  
  .day-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
  }
  
  .day-display h2 {
    font-size: 1.75rem;
    font-weight: 800;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: var(--spacing-sm);
    text-align: center;
    margin: 0;
    flex: 0 0 auto;
    letter-spacing: -0.02em;
  }
  
  .nav-arrow,
  .nav-arrow-placeholder {
    width: 36px;
    height: 36px;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .nav-arrow {
    background-color: var(--surface);
    border: 2px solid var(--border);
    border-radius: 50%;
    cursor: pointer;
    color: var(--primary-color);
    padding: 0;
    transition: all 0.2s ease;
    margin-bottom: var(--spacing-sm);
    box-shadow: var(--shadow-sm);
  }
  
  .nav-arrow:hover {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
    transform: scale(1.1);
    box-shadow: var(--shadow);
  }
  
  .nav-arrow:active {
    transform: scale(0.95);
  }
  
  .nav-arrow svg {
    width: 20px;
    height: 20px;
  }
  
  .nav-arrow-placeholder {
    visibility: hidden;
  }
  
  .progress-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-top: var(--spacing-sm);
  }
  
  .progress-bar {
    flex: 1;
    height: 10px;
    background-color: var(--surface-elevated);
    border-radius: var(--border-radius-sm);
    overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    transition: width 0.3s ease;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
  }
  
  .progress-percentage {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 50px;
    text-align: right;
    flex-shrink: 0;
  }

  .days-remaining {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted, var(--text-secondary));
    flex-shrink: 0;
    white-space: nowrap;
  }
  
  @media (min-width: 768px) {
    .day-display h2 {
      font-size: 2.25rem;
    }
  }
</style>
