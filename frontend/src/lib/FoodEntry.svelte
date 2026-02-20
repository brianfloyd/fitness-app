<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { calculateMacros, getAvailableUnits, calculateMacrosForCustom, getAvailableUnitsForCustom } from './utils/foodConversions.js';

  export let food = null; // { fdcId?, customFoodId?, name, amount, unit, foodData?, customFood?, protein, fat, carbs, calories }
  export let entryId = ''; // unique key for this log entry (for expand tracking)

  const dispatch = createEventDispatcher();

  let amount = food?.amount || 100;
  let unit = food?.unit || 'g';
  let availableUnits = ['g', 'oz'];
  let lastFoodId = null;
  let updateTimeout = null;
  let lastSyncedAmount = null;
  let lastSyncedUnit = null;
  let expanded = false;

  $: isCustom = food?.customFoodId != null;

  onDestroy(() => {
    if (updateTimeout) clearTimeout(updateTimeout);
  });

  $: if (food && (food.fdcId !== lastFoodId || (isCustom && food.customFoodId !== lastFoodId))) {
    lastFoodId = isCustom ? food.customFoodId : food.fdcId;
    availableUnits = isCustom && food.customFood
      ? getAvailableUnitsForCustom(food.customFood)
      : (food.foodData ? getAvailableUnits(food.foodData) : ['g', 'oz']);
    amount = food.amount ?? (food.customFood ? food.customFood.serving_size : 100);
    unit = food.unit || (food.customFood ? food.customFood.serving_unit : 'g') || availableUnits[0] || 'g';
    lastSyncedAmount = amount;
    lastSyncedUnit = unit;
  }

  $: if (food && (food.fdcId === lastFoodId || (isCustom && food.customFoodId === lastFoodId))) {
    const amountDiff = food.amount !== undefined && Math.abs((food.amount || 0) - (lastSyncedAmount || 0)) > 0.001;
    const unitDiff = food.unit !== undefined && food.unit && food.unit !== lastSyncedUnit;
    if (amountDiff || unitDiff) {
      if (amountDiff) { amount = food.amount; lastSyncedAmount = amount; }
      if (unitDiff) { unit = food.unit; lastSyncedUnit = unit; }
    }
  }

  function dispatchUpdate() {
    if (!food || (isCustom ? food.customFoodId !== lastFoodId : food.fdcId !== lastFoodId)) return;
    if (updateTimeout) { clearTimeout(updateTimeout); updateTimeout = null; }
    updateTimeout = setTimeout(() => {
      try {
        const numAmount = parseFloat(amount) || 0;
        const macros = isCustom && food.customFood
          ? calculateMacrosForCustom(food.customFood, numAmount, unit)
          : (food.foodData ? calculateMacros(food.foodData, numAmount, unit) : { protein: 0, fat: 0, carbs: 0, calories: 0 });
        const updatedFood = { ...food, amount: numAmount, unit: unit, protein: macros.protein, fat: macros.fat, carbs: macros.carbs, calories: macros.calories };
        lastSyncedAmount = numAmount;
        lastSyncedUnit = unit;
        dispatch('update', updatedFood);
      } catch (e) {
        console.error('Error calculating macros:', e);
      } finally {
        updateTimeout = null;
      }
    }, 150);
  }

  function handleAmountInput() { dispatchUpdate(); }
  function handleUnitChange() { dispatchUpdate(); }

  function handleRemove(e) {
    e?.stopPropagation?.();
    if (!food) return;
    const payload = { entryId };
    if (food.customFoodId != null) payload.customFoodId = food.customFoodId;
    if (food.fdcId != null) payload.fdcId = food.fdcId;
    dispatch('remove', payload);
  }

  function toggleExpand(e) {
    if (e?.target?.closest?.('.remove-btn')) return;
    expanded = !expanded;
  }

  $: currentMacros = (() => {
    if (!food) return { protein: 0, fat: 0, carbs: 0, calories: 0 };
    if (isCustom && food.customFood) return calculateMacrosForCustom(food.customFood, amount, unit);
    if (food.foodData) return calculateMacros(food.foodData, amount, unit);
    return { protein: food.protein || 0, fat: food.fat || 0, carbs: food.carbs || 0, calories: food.calories || 0 };
  })();

  $: summary = (() => {
    const c = Math.round(currentMacros.calories);
    return `${c} cal`;
  })();
</script>

{#if food}
  <div class="food-entry" class:expanded role="button" tabindex="0" on:click={toggleExpand} on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), toggleExpand(e)) : null}>
    <!-- Compact row -->
    <div class="compact-row">
      <span class="compact-name" title={food.name}>{food.name}</span>
      <span class="compact-summary">{summary}</span>
      <span class="expand-icon" aria-hidden="true">{expanded ? '▼' : '▶'}</span>
      <button type="button" class="remove-btn" on:click={(e) => { e.stopPropagation(); handleRemove(e); }} title="Remove food" aria-label="Remove {food.name}">×</button>
    </div>

    <!-- Expanded detail -->
    {#if expanded}
      <div class="detail" on:click|stopPropagation role="presentation">
        {#if food.brand}
          <div class="food-brand">{food.brand}</div>
        {/if}
        <div class="food-amount-unit">
          <input
            type="number"
            class="amount-input"
            bind:value={amount}
            on:input={handleAmountInput}
            on:click|stopPropagation
            step="0.1"
            min="0"
            placeholder="Amount"
          />
          <select class="unit-select" bind:value={unit} on:change={handleUnitChange} on:click|stopPropagation>
            {#each availableUnits as u}
              <option value={u}>{u}</option>
            {/each}
          </select>
        </div>
        <div class="food-macros">
          <div class="macro-item"><span class="macro-label">Protein:</span> <span class="macro-value protein">{currentMacros.protein.toFixed(1)}g</span></div>
          <div class="macro-item"><span class="macro-label">Fat:</span> <span class="macro-value fat">{currentMacros.fat.toFixed(1)}g</span></div>
          <div class="macro-item"><span class="macro-label">Carbs:</span> <span class="macro-value carbs">{currentMacros.carbs.toFixed(1)}g</span></div>
          <div class="macro-item"><span class="macro-label">Calories:</span> <span class="macro-value calories">{Math.round(currentMacros.calories)}</span></div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .food-entry {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
  }

  .food-entry:hover {
    background-color: var(--surface-elevated);
    border-color: var(--border-light);
  }

  .food-entry:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--primary-color);
  }

  .compact-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: 6px 8px;
    min-height: 36px;
  }

  .compact-name {
    flex: 1 1 auto;
    min-width: 0;
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .compact-summary {
    flex: 0 0 auto;
    font-size: 0.75rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .expand-icon {
    flex: 0 0 auto;
    font-size: 0.6rem;
    color: var(--text-muted);
  }

  .remove-btn {
    flex: 0 0 auto;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    padding: 2px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s, color 0.2s;
  }

  .remove-btn:hover {
    background-color: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  .detail {
    padding: 6px 8px 8px;
    border-top: 1px solid var(--border);
    cursor: default;
  }

  .food-brand {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-sm);
  }

  .food-amount-unit {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .amount-input {
    flex: 2;
    min-width: 80px;
    padding: var(--spacing-sm);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    background-color: var(--input-background);
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .amount-input:focus {
    border-color: var(--primary-color);
    outline: none;
  }

  .unit-select {
    flex: 0 0 auto;
    min-width: 56px;
    padding: var(--spacing-sm);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    background-color: var(--input-background);
    color: var(--text-primary);
    font-size: 0.85rem;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
  }

  .unit-select:focus {
    border-color: var(--primary-color);
    outline: none;
  }

  .food-macros {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-xs);
    font-size: 0.8rem;
  }

  .macro-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .macro-label {
    color: var(--text-secondary);
  }

  .macro-value {
    font-weight: 600;
  }

  .macro-value.protein { color: #3b82f6; }
  .macro-value.fat { color: #ef4444; }
  .macro-value.carbs { color: #10b981; }
  .macro-value.calories { color: var(--text-primary); }

  @media (max-width: 480px) {
    .compact-row {
      min-height: 40px;
      padding: 8px 10px;
    }
    .compact-name { font-size: 0.85rem; }
    .compact-summary { font-size: 0.8rem; }
    .remove-btn { width: 26px; height: 26px; }
  }

  /* Mobile: larger interactive fonts (dev evaluation) */
  @media (max-width: 767px) {
    .compact-name {
      font-size: 1rem;
    }
    .compact-summary {
      font-size: 0.9375rem;
    }
    .expand-icon {
      font-size: 0.75rem;
    }
    .food-brand {
      font-size: 0.9375rem;
    }
    .amount-input,
    .unit-select {
      font-size: 1.125rem;
      padding: var(--spacing-md);
      min-height: 2.75rem;
    }
    .food-macros {
      font-size: 0.9375rem;
    }
  }
</style>
