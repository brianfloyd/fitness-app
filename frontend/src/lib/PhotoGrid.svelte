<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { getPhotoUrl } from './api.js';
  
  const dispatch = createEventDispatcher();
  
  export let logs = []; // Array of log objects with date and photo_mime_type
  export let progressionMode = false;
  export let progressionDelay = 1000; // milliseconds
  
  let selectedPhoto = null;
  let showPhotoModal = false;
  
  // Progression mode state
  let currentProgressionIndex = 0;
  let progressionInterval = null;
  let isProgressionEnded = false;
  
  function openPhotoModal(log) {
    selectedPhoto = log;
    showPhotoModal = true;
  }
  
  function closePhotoModal() {
    showPhotoModal = false;
    selectedPhoto = null;
  }
  
  // Filter and sort logs that have photos (chronologically by date)
  $: photosWithData = logs
    .filter(log => log.photo_mime_type)
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });
  
  // Get current photo in progression mode
  $: currentProgressionPhoto = photosWithData.length > 0 && progressionMode 
    ? photosWithData[currentProgressionIndex] 
    : null;
  
  // Handle progression mode
  $: if (progressionMode && photosWithData.length > 0 && !isProgressionEnded) {
    // Reset when entering progression mode (only if not already ended)
    if (!progressionInterval) {
      currentProgressionIndex = 0;
      isProgressionEnded = false;
      startProgression();
    }
  } else if (!progressionMode) {
    stopProgression();
  }
  
  // Restart progression when delay changes (if already in progression mode and not ended)
  $: if (progressionMode && progressionInterval && photosWithData.length > 0 && !isProgressionEnded) {
    startProgression();
  }
  
  function startProgression() {
    stopProgression(); // Clear any existing interval
    
    if (photosWithData.length === 0) return;
    
    // Start from first photo
    currentProgressionIndex = 0;
    isProgressionEnded = false;
    
    // Set up interval to advance photos
    progressionInterval = setInterval(() => {
      if (currentProgressionIndex < photosWithData.length - 1) {
        currentProgressionIndex++;
      } else {
        // Reached the end
        stopProgression();
        isProgressionEnded = true;
      }
    }, progressionDelay);
  }
  
  function stopProgression() {
    if (progressionInterval) {
      clearInterval(progressionInterval);
      progressionInterval = null;
    }
  }
  
  function handleProgressionEnd() {
    stopProgression();
    dispatch('progressionEnd');
  }
  
  function restartProgression() {
    stopProgression(); // Ensure any existing interval is cleared
    currentProgressionIndex = 0;
    isProgressionEnded = false;
    // Small delay to ensure state is updated before starting
    setTimeout(() => {
      startProgression();
    }, 50);
  }
  
  onDestroy(() => {
    stopProgression();
  });
</script>

<div class="photo-grid-container">
  {#if photosWithData.length === 0}
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      <p>No photos available for this date range</p>
    </div>
  {:else if progressionMode}
    <!-- Progression Mode View -->
    <div class="progression-view">
      {#if currentProgressionPhoto}
        <div class="progression-photo-container">
          <div class="progression-main-content">
            <img 
              src={getPhotoUrl(currentProgressionPhoto.date)} 
              alt="Progress photo for {new Date(currentProgressionPhoto.date).toLocaleDateString()}"
              class="progression-photo"
            />
            <div class="progression-info">
              <div class="progression-date">
                {new Date(currentProgressionPhoto.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div class="progression-counter">
                Photo {currentProgressionIndex + 1} of {photosWithData.length}
              </div>
              {#if currentProgressionPhoto.weight || currentProgressionPhoto.fat_percent}
                <div class="progression-metrics mobile-metrics">
                  {#if currentProgressionPhoto.weight}
                    <span class="metric-item">
                      <span class="metric-label">Weight:</span>
                      <span class="metric-value">{currentProgressionPhoto.weight} lbs</span>
                    </span>
                  {/if}
                  {#if currentProgressionPhoto.fat_percent}
                    <span class="metric-item">
                      <span class="metric-label">Body Fat:</span>
                      <span class="metric-value">{currentProgressionPhoto.fat_percent}%</span>
                    </span>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
          <!-- Always render desktop metrics container to reserve space -->
          <div class="progression-metrics desktop-metrics">
            {#if currentProgressionPhoto.weight || currentProgressionPhoto.fat_percent}
              {#if currentProgressionPhoto.weight}
                <div class="metric-item">
                  <span class="metric-label">Weight</span>
                  <span class="metric-value">{currentProgressionPhoto.weight} lbs</span>
                </div>
              {/if}
              {#if currentProgressionPhoto.fat_percent}
                <div class="metric-item">
                  <span class="metric-label">Body Fat</span>
                  <span class="metric-value">{currentProgressionPhoto.fat_percent}%</span>
                </div>
              {/if}
            {:else}
              <!-- Empty spacer to maintain layout -->
              <div class="metric-item" style="visibility: hidden;">
                <span class="metric-label">Weight</span>
                <span class="metric-value">— lbs</span>
              </div>
              <div class="metric-item" style="visibility: hidden;">
                <span class="metric-label">Body Fat</span>
                <span class="metric-value">—%</span>
              </div>
            {/if}
          </div>
          {#if isProgressionEnded}
            <div class="progression-restart-container">
              <button 
                type="button" 
                class="progression-restart-btn"
                on:click={restartProgression}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Restart Progression
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <!-- Thumbnail Grid View -->
    <div class="photo-grid">
      {#each photosWithData as log}
        <button 
          type="button"
          class="photo-item" 
          on:click={() => openPhotoModal(log)}
          aria-label="View progress photo for {new Date(log.date).toLocaleDateString()}"
        >
          <img 
            src={getPhotoUrl(log.date)} 
            alt="Progress photo for {new Date(log.date).toLocaleDateString()}"
            loading="lazy"
          />
          <div class="photo-date-label">
            {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

{#if showPhotoModal && selectedPhoto}
  <div class="photo-modal" on:click|self={closePhotoModal}>
    <div class="photo-modal-content" on:click|stopPropagation>
      <button type="button" class="close-btn" on:click={closePhotoModal}>×</button>
      <img 
        src={getPhotoUrl(selectedPhoto.date)} 
        alt="Progress photo for {new Date(selectedPhoto.date).toLocaleDateString()}"
      />
      <div class="photo-modal-date">
        {new Date(selectedPhoto.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  </div>
{/if}

<style>
  .photo-grid-container {
    width: 100%;
  }
  
  .empty-state {
    padding: var(--spacing-xl);
    text-align: center;
    color: var(--text-secondary);
  }
  
  .empty-state svg {
    color: var(--text-muted);
    margin-bottom: var(--spacing-md);
    opacity: 0.5;
  }
  
  .empty-state p {
    margin: 0;
    font-size: 0.875rem;
  }
  
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
  }
  
  @media (max-width: 768px) {
    .photo-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-sm);
    }
  }
  
  @media (max-width: 480px) {
    .photo-grid {
      grid-template-columns: 1fr;
    }
  }
  
  .photo-item {
    position: relative;
    cursor: pointer;
    border-radius: var(--border-radius);
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--border);
    transition: all 0.2s ease;
    aspect-ratio: 3/4;
    padding: 0;
    border: 1px solid var(--border);
    background: none;
  }
  
  .photo-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary-color);
  }
  
  .photo-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  
  .photo-date-label {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
    color: white;
    padding: var(--spacing-sm);
    font-size: 0.75rem;
    font-weight: 600;
    text-align: center;
  }
  
  .photo-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: var(--spacing-md);
  }
  
  .photo-modal-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .photo-modal-content img {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    border-radius: var(--border-radius);
  }
  
  .photo-modal .close-btn {
    position: absolute;
    top: -40px;
    right: 0;
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    color: white;
    cursor: pointer;
    padding: var(--spacing-xs);
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius-sm);
    transition: all 0.2s;
  }
  
  .photo-modal .close-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .photo-modal-date {
    margin-top: var(--spacing-md);
    color: white;
    font-size: 1rem;
    font-weight: 600;
    text-align: center;
  }
  
  .progression-view {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 500px;
  }
  
  .progression-photo-container {
    position: relative;
    width: 100%;
    max-width: 1200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }
  
  @media (min-width: 768px) {
    .progression-photo-container {
      flex-direction: row;
      align-items: flex-start;
      gap: var(--spacing-xl);
    }
  }
  
  .progression-main-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    flex: 1;
    min-width: 0; /* Prevent flex shrinking issues */
    /* Ensure stable positioning */
    position: relative;
  }
  
  @media (min-width: 768px) {
    .progression-main-content {
      width: 600px;
      flex: 0 0 600px; /* Fixed width, don't grow or shrink */
    }
  }
  
  .progression-photo {
    width: 100%;
    max-width: 600px;
    max-height: 70vh;
    object-fit: contain;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    background: var(--surface);
    /* Fixed dimensions to prevent shifting */
    min-width: 300px;
    min-height: 400px;
    display: block;
  }
  
  @media (min-width: 768px) {
    .progression-photo {
      width: 600px;
      height: auto;
      min-width: 600px;
      max-width: 600px;
    }
  }
  
  .progression-info {
    text-align: center;
    color: var(--text-primary);
    width: 100%;
    /* Reserve space to prevent layout shifts */
    min-height: 120px;
  }
  
  .progression-date {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: var(--spacing-xs);
    color: var(--text-primary);
    min-height: 1.5rem;
  }
  
  .progression-counter {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
    min-height: 1.25rem;
  }
  
  .progression-metrics {
    display: flex;
    gap: var(--spacing-lg);
    justify-content: center;
    margin-top: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--border);
    /* Reserve space to prevent layout shifts */
    min-height: 60px;
  }
  
  .progression-metrics.mobile-metrics {
    display: flex;
  }
  
  .progression-metrics.desktop-metrics {
    display: none;
  }
  
  @media (min-width: 768px) {
    .progression-metrics.mobile-metrics {
      display: none;
    }
    
    .progression-metrics.desktop-metrics {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
      justify-content: flex-start;
      margin-top: 0;
      padding-top: 0;
      border-top: none;
      border-left: 1px solid var(--border);
      padding-left: var(--spacing-xl);
      /* Reserve fixed space to prevent layout shifts */
      min-width: 200px;
      max-width: 200px;
      width: 200px;
      flex-shrink: 0;
      /* Reserve space even when empty */
      min-height: 120px;
    }
  }
  
  .metric-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
  }
  
  @media (min-width: 768px) {
    .metric-item {
      align-items: flex-start;
    }
  }
  
  .metric-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .metric-value {
    font-size: 1.125rem;
    color: var(--primary-color);
    font-weight: 700;
  }
  
  @media (min-width: 768px) {
    .metric-value {
      font-size: 1.5rem;
    }
  }
  
  .progression-restart-container {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-md);
    /* Reserve space to prevent layout shifts */
    min-height: 50px;
  }
  
  @media (min-width: 768px) {
    .progression-restart-container {
      position: absolute;
      top: 0;
      right: 0;
      width: auto;
      margin-top: 0;
      margin-left: 0;
      min-height: auto;
    }
  }
  
  .progression-restart-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-xl);
    border: 2px solid var(--primary-color);
    border-radius: var(--border-radius-sm);
    background: linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%);
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
  }
  
  .progression-restart-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  }
  
  .progression-restart-btn svg {
    width: 20px;
    height: 20px;
  }
</style>
