<script>
  import { createEventDispatcher } from 'svelte';
  
  export let exercise = null;
  export let substitutions = [];
  export let painLocation = '';
  export let painLevel = 0;
  
  const dispatch = createEventDispatcher();
  
  function handleSwap(newExerciseName) {
    dispatch('swap', { 
      originalExercise: exercise,
      newExerciseName,
    });
  }
  
  function handleClose() {
    dispatch('close');
  }
  
  function handleContinue() {
    dispatch('continue');
  }
</script>

{#if exercise}
<div class="pain-swap-modal" role="dialog" aria-modal="true" aria-labelledby="pain-swap-title" on:click|self={handleClose} on:keydown={(e) => e.key === 'Escape' && handleClose()}>
  <div class="modal-content">
    <div class="modal-header warning">
      <span class="warning-icon">⚠️</span>
      <h3 id="pain-swap-title">Pain Alert</h3>
    </div>
    
    <div class="modal-body">
      <p class="pain-info">
        You logged <strong>{painLocation} pain level {painLevel}/10</strong> during <strong>{exercise.name}</strong>.
      </p>
      
      {#if substitutions.length > 0}
        <p class="suggestion-intro">Consider swapping to a less aggravating exercise:</p>
        
        <div class="substitution-list">
          {#each substitutions as sub}
            <button class="swap-btn" on:click={() => handleSwap(sub)}>
              <span class="swap-icon">↻</span>
              <span class="swap-name">{sub}</span>
            </button>
          {/each}
        </div>
      {:else}
        <p class="no-subs">No specific substitutions available for this exercise.</p>
      {/if}
    </div>
    
    <div class="modal-footer">
      <button class="continue-btn" on:click={handleContinue}>
        Continue with {exercise.name}
      </button>
      <button class="close-btn" on:click={handleClose}>
        Dismiss
      </button>
    </div>
  </div>
</div>
{/if}

<style>
  .pain-swap-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--spacing-md);
  }
  
  .modal-content {
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    max-width: 400px;
    width: 100%;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border);
  }
  
  .modal-header.warning {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(249, 115, 22, 0.1));
  }
  
  .warning-icon {
    font-size: 1.5rem;
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: #ef4444;
  }
  
  .modal-body {
    padding: var(--spacing-md);
  }
  
  .pain-info {
    margin: 0 0 var(--spacing-md);
    color: var(--text-primary);
    line-height: 1.5;
  }
  
  .suggestion-intro {
    margin: 0 0 var(--spacing-sm);
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  
  .substitution-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .swap-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
  }
  
  .swap-btn:hover {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }
  
  .swap-icon {
    font-size: 1rem;
    opacity: 0.7;
  }
  
  .swap-name {
    font-weight: 500;
  }
  
  .no-subs {
    color: var(--text-muted);
    font-style: italic;
    font-size: 0.875rem;
  }
  
  .modal-footer {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    border-top: 1px solid var(--border);
    background: var(--surface-elevated);
  }
  
  .continue-btn, .close-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .continue-btn {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-secondary);
  }
  
  .continue-btn:hover {
    background: var(--surface-hover);
  }
  
  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.875rem;
  }
  
  .close-btn:hover {
    color: var(--text-primary);
  }
</style>
