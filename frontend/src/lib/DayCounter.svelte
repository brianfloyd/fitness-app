<script>
  export let dayNumber = 1;
  export let totalDays = 84;
  export let displayDate = ''; // Optional: show date in compact form (e.g. "Jan 15, 2025")
  export let onPrevious = () => {};
  export let onNext = () => {};
  export let volume = 0;    // Workout volume (lbs)
  export let calories = 0;
  export let protein = 0;   // grams
  export let steps = 0;
  export let zoneMinutes = 0;
  export let caloriesExpended = null; // Fitbit calories out; only shown when calories (consumed) > 0

  function compactNum(n) {
    const num = Number(n) || 0;
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num ? String(Math.round(num)) : '';
  }

  $: volStr = volume > 0 ? compactNum(volume) : '';
  $: calStr = (() => {
    const consumed = Number(calories) || 0;
    if (consumed <= 0) return '';
    const exp = caloriesExpended != null ? Math.round(Number(caloriesExpended)) : null;
    if (exp != null) return `${Math.round(consumed)}/${exp}`;
    return compactNum(consumed) + ' cal';
  })();
  $: proStr = protein > 0 ? compactNum(protein) : '';
  $: stpStr = steps > 0 ? compactNum(steps) : '';
  $: zmStr = zoneMinutes > 0 ? String(zoneMinutes) + ' zm' : '';
  $: hasStats = volStr || calStr || proStr || stpStr || zmStr;

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
    <div class="day-title-block">
      <h2>Day {dayNumber} of {totalDays}</h2>
      {#if displayDate}
        <span class="display-date">{displayDate}</span>
      {/if}
    </div>
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
  {#if hasStats}
    <div class="day-stats">
      {#if volStr}<span class="stat">vol {volStr}</span>{/if}
      {#if calStr}<span class="stat">{calStr}</span>{/if}
      {#if proStr}<span class="stat">{proStr}g P</span>{/if}
      {#if zmStr}<span class="stat">{zmStr}</span>{/if}
      {#if stpStr}<span class="stat">{stpStr} stp</span>{/if}
    </div>
  {/if}
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
  
  .day-title-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .display-date {
    font-size: 0.875rem;
    color: var(--text-muted, var(--text-secondary));
    font-weight: 500;
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

  .day-stats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5em 0.75em;
    margin-top: var(--spacing-xs);
    font-size: 0.65rem;
    color: var(--text-muted, var(--text-secondary));
  }

  .day-stats .stat {
    white-space: nowrap;
  }
  
  @media (min-width: 768px) {
    .day-display h2 {
      font-size: 2.25rem;
    }
  }
</style>
