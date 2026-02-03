<script>
  import { createEventDispatcher } from 'svelte';
  import { calculateMacros, getAvailableUnits } from './utils/foodConversions.js';
  
  export let foodData = null; // USDA food data object
  export let defaultAmount = 100;
  export let defaultUnit = 'g';
  export let isOpen = false;
  
  const dispatch = createEventDispatcher();
  
  let amount = defaultAmount;
  let unit = defaultUnit;
  let availableUnits = ['g', 'oz'];
  let calculatedMacros = { protein: 0, fat: 0, carbs: 0, calories: 0 };
  let lastFoodDataId = null;
  let lastIsOpen = false;
  
  // Update available units when foodData changes (only once per food)
  $: if (foodData && foodData.fdcId !== lastFoodDataId) {
    lastFoodDataId = foodData.fdcId;
    availableUnits = getAvailableUnits(foodData);
  }
  
  // Watch for modal opening to reset values
  $: if (isOpen && !lastIsOpen) {
    lastIsOpen = true;
    // Initialize values when modal opens
    initializeValues();
  } else if (!isOpen) {
    lastIsOpen = false;
  }
  
  function initializeValues() {
    if (!foodData) return;
    amount = defaultAmount;
    const newUnit = defaultUnit;
    const units = availableUnits.length > 0 ? availableUnits : ['g', 'oz'];
    if (!units.includes(newUnit)) {
      unit = units[0] || 'g';
    } else {
      unit = newUnit;
    }
  }
  
  // Calculate macros when amount or unit changes
  $: if (foodData && foodData.fdcId === lastFoodDataId && amount && unit) {
    calculatedMacros = calculateMacros(foodData, parseFloat(amount) || 0, unit);
  }
  
  function handleAdd() {
    if (!foodData || !amount || amount <= 0) return;
    
    dispatch('add', {
      fdcId: foodData.fdcId,
      name: foodData.description || foodData.brandOwner || 'Unknown Food',
      brand: foodData.brandOwner || null,
      amount: parseFloat(amount),
      unit: unit,
      foodData: foodData,
      protein: calculatedMacros.protein,
      fat: calculatedMacros.fat,
      carbs: calculatedMacros.carbs,
      calories: calculatedMacros.calories,
    });
    
    handleClose();
  }
  
  function handleClose() {
    dispatch('close');
  }
  
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      handleClose();
    } else if (event.key === 'Enter' && event.ctrlKey) {
      handleAdd();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && foodData}
  <div class="modal-overlay" on:click|self={handleClose}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>{foodData.description || foodData.brandOwner || 'Add Food'}</h3>
        {#if foodData.brandOwner && foodData.description !== foodData.brandOwner}
          <div class="food-brand">{foodData.brandOwner}</div>
        {/if}
        <button type="button" class="close-btn" on:click={handleClose}>×</button>
      </div>
      
      <div class="modal-body">
        <div class="amount-unit-inputs">
          <div class="input-group">
            <label>Amount</label>
            <input
              type="number"
              class="amount-input"
              bind:value={amount}
              step="0.1"
              min="0"
              placeholder="Amount"
            />
          </div>
          
          <div class="input-group">
            <label>Unit</label>
            <select class="unit-select" bind:value={unit}>
              {#each availableUnits as u}
                <option value={u}>{u}</option>
              {/each}
            </select>
          </div>
        </div>
        
        <div class="macro-preview">
          <div class="macro-preview-title">Macros Preview</div>
          <div class="macro-preview-grid">
            <div class="macro-preview-item">
              <span class="macro-label">Protein:</span>
              <span class="macro-value protein">{calculatedMacros.protein.toFixed(1)}g</span>
            </div>
            <div class="macro-preview-item">
              <span class="macro-label">Fat:</span>
              <span class="macro-value fat">{calculatedMacros.fat.toFixed(1)}g</span>
            </div>
            <div class="macro-preview-item">
              <span class="macro-label">Carbs:</span>
              <span class="macro-value carbs">{calculatedMacros.carbs.toFixed(1)}g</span>
            </div>
            <div class="macro-preview-item">
              <span class="macro-label">Calories:</span>
              <span class="macro-value calories">{calculatedMacros.calories}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="cancel-btn" on:click={handleClose}>Cancel</button>
        <button type="button" class="add-btn" on:click={handleAdd} disabled={!amount || amount <= 0}>
          Add Food
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: var(--spacing-md);
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .modal-content {
    background: var(--surface-elevated);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    animation: slideUp 0.2s ease-out;
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .modal-header {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-lg);
    border-bottom: 2px solid var(--border);
    position: relative;
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  
  .food-brand {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .close-btn {
    position: absolute;
    top: var(--spacing-md);
    right: var(--spacing-md);
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius-sm);
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
  }
  
  .modal-body {
    padding: var(--spacing-lg);
  }
  
  .amount-unit-inputs {
    display: grid;
    grid-template-columns: 3fr 1fr;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .input-group label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
  }
  
  .amount-input {
    padding: var(--spacing-sm);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    background-color: var(--input-background);
    color: var(--text-primary);
    font-size: 1rem;
    min-width: 0;
  }
  
  .unit-select {
    padding: var(--spacing-sm);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    background-color: var(--input-background);
    color: var(--text-primary);
    font-size: 0.875rem;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    min-width: 0;
  }
  
  .amount-input:focus,
  .unit-select:focus {
    border-color: var(--primary-color);
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  
  .unit-select option {
    background-color: var(--surface);
    color: var(--text-primary);
    padding: var(--spacing-sm);
  }
  
  /* Ensure options are visible in dropdown */
  .unit-select option:checked,
  .unit-select option:hover,
  .unit-select option:focus {
    background-color: var(--surface-elevated);
    color: var(--text-primary);
  }
  
  .macro-preview {
    padding: var(--spacing-md);
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
  }
  
  .macro-preview-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-sm);
  }
  
  .macro-preview-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
  }
  
  .macro-preview-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .macro-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .macro-value {
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  .macro-value.protein {
    color: #3b82f6;
  }
  
  .macro-value.fat {
    color: #ef4444;
  }
  
  .macro-value.carbs {
    color: #10b981;
  }
  
  .macro-value.calories {
    color: var(--text-primary);
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
    padding: var(--spacing-lg);
    border-top: 2px solid var(--border);
  }
  
  .cancel-btn,
  .add-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    border: none;
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-btn {
    background-color: var(--surface);
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }
  
  .cancel-btn:hover {
    background-color: var(--surface-elevated);
    color: var(--text-primary);
  }
  
  .add-btn {
    background-color: var(--primary-color);
    color: white;
  }
  
  .add-btn:hover:not(:disabled) {
    background-color: var(--primary-dark);
  }
  
  .add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
