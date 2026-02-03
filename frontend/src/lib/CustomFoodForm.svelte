<script>
  import { createEventDispatcher } from 'svelte';
  import { createCustomFood, checkCustomFoodDuplicates } from './api.js';

  const dispatch = createEventDispatcher();

  export let initialName = '';
  export let visible = true;

  let name = typeof initialName === 'string' ? initialName : '';
  let brand = '';
  let barcode = '';
  let servingSize = '100';
  let servingUnit = 'g';
  let calories = '';
  let protein = '';
  let fat = '';
  let carbs = '';
  let submitting = false;
  let error = null;
  let duplicateMatches = [];
  let showDuplicatePrompt = false;

  const servingUnits = ['g', 'oz'];

  function getPayload() {
    const n = (name || '').trim();
    const ss = parseFloat(servingSize);
    const cal = parseFloat(calories);
    return {
      name: n,
      brand: (brand || '').trim() || undefined,
      barcode: (barcode || '').trim() || undefined,
      serving_size: isNaN(ss) || ss <= 0 ? null : ss,
      serving_unit: servingUnit,
      calories: isNaN(cal) || cal < 0 ? null : cal,
      protein: protein !== '' && !isNaN(parseFloat(protein)) ? parseFloat(protein) : undefined,
      fat: fat !== '' && !isNaN(parseFloat(fat)) ? parseFloat(fat) : undefined,
      carbs: carbs !== '' && !isNaN(parseFloat(carbs)) ? parseFloat(carbs) : undefined,
    };
  }

  async function handleSubmit() {
    const n = (name || '').trim();
    if (!n) {
      error = 'Name is required';
      return;
    }
    const cal = parseFloat(calories);
    if (isNaN(cal) || cal < 0) {
      error = 'Calories is required and must be a non‑negative number';
      return;
    }
    const ss = parseFloat(servingSize);
    if (isNaN(ss) || ss <= 0) {
      error = 'Serving size is required and must be a positive number';
      return;
    }
    error = null;
    duplicateMatches = [];
    showDuplicatePrompt = false;
    submitting = true;
    try {
      const { matches } = await checkCustomFoodDuplicates({
        name: n,
        barcode: (barcode || '').trim() || undefined,
      });
      if (matches && matches.length > 0) {
        duplicateMatches = matches;
        showDuplicatePrompt = true;
        submitting = false;
        return;
      }
      await doCreate();
    } catch (e) {
      error = e.message || 'Failed to check duplicates';
    } finally {
      if (!showDuplicatePrompt) submitting = false;
    }
  }

  async function doCreate() {
    const p = getPayload();
    try {
      const created = await createCustomFood(p);
      showDuplicatePrompt = false;
      duplicateMatches = [];
      dispatch('created', created);
    } catch (e) {
      error = e.message || 'Failed to create custom food';
    } finally {
      submitting = false;
    }
  }

  function useExisting(m) {
    showDuplicatePrompt = false;
    duplicateMatches = [];
    const shape = {
      customFoodId: m.id ?? m.customFoodId,
      name: m.name,
      brand: m.brand ?? null,
      barcode: m.barcode ?? null,
      serving_size: m.serving_size ?? 100,
      serving_unit: m.serving_unit || 'g',
      calories: m.calories ?? 0,
      protein: m.protein ?? null,
      fat: m.fat ?? null,
      carbs: m.carbs ?? null,
      source: 'custom',
    };
    dispatch('created', shape);
  }

  function createAnyway() {
    showDuplicatePrompt = false;
    duplicateMatches = [];
    doCreate();
  }

  function cancelDuplicates() {
    showDuplicatePrompt = false;
    duplicateMatches = [];
  }

  function handleCancel() {
    showDuplicatePrompt = false;
    duplicateMatches = [];
    dispatch('cancel');
  }
</script>

{#if visible}
  <div class="custom-food-form" role="dialog" aria-labelledby="custom-food-title" aria-modal="true">
    <div class="form-header">
      <h3 id="custom-food-title">Add custom food</h3>
      <button type="button" class="close-btn" on:click={handleCancel} aria-label="Close">×</button>
    </div>

    {#if showDuplicatePrompt && duplicateMatches.length > 0}
      <div class="duplicate-prompt">
        <p class="duplicate-heading">Possible duplicates</p>
        <p class="duplicate-hint">A similar custom food already exists. Use one below or create anyway.</p>
        <ul class="duplicate-list">
          {#each duplicateMatches as m}
            <li>
              <span class="dup-name">{m.name}{#if m.brand} ({m.brand}){/if}</span>
              {#if m.barcode}<span class="dup-barcode">UPC: {m.barcode}</span>{/if}
              <button type="button" class="btn use-btn" on:click={() => useExisting(m)}>Use this</button>
            </li>
          {/each}
        </ul>
        <div class="duplicate-actions">
          <button type="button" class="btn secondary" on:click={cancelDuplicates}>Back to form</button>
          <button type="button" class="btn primary" on:click={createAnyway} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create anyway'}
          </button>
        </div>
      </div>
    {:else}
      <form on:submit|preventDefault={handleSubmit} class="form-body">
        <div class="field">
          <label for="cf-name">Name *</label>
          <input id="cf-name" type="text" bind:value={name} placeholder="e.g. Homemade smoothie" required />
        </div>
        <div class="field">
          <label for="cf-brand">Brand (optional)</label>
          <input id="cf-brand" type="text" bind:value={brand} placeholder="e.g. My Kitchen" />
        </div>
        <div class="field">
          <label for="cf-barcode">Barcode / UPC (optional)</label>
          <input id="cf-barcode" type="text" bind:value={barcode} placeholder="e.g. 012000161789" inputmode="numeric" />
        </div>
        <div class="field serving-def">
          <label for="cf-serving-size">1 serving =</label>
          <div class="row">
            <input id="cf-serving-size" type="number" bind:value={servingSize} min="0.1" step="0.1" placeholder="100" required aria-describedby="cf-serving-hint" />
            <select id="cf-serving-unit" bind:value={servingUnit} aria-label="Serving unit (g or oz)">
              {#each servingUnits as u}
                <option value={u}>{u}</option>
              {/each}
            </select>
          </div>
          <span id="cf-serving-hint" class="serving-hint">e.g. 8 oz or 240 g</span>
        </div>
        <div class="field">
          <label for="cf-calories">Calories per serving *</label>
          <input id="cf-calories" type="number" bind:value={calories} min="0" step="1" placeholder="e.g. 150" required />
        </div>
        <div class="row">
          <div class="field">
            <label for="cf-protein">Protein (g, optional)</label>
            <input id="cf-protein" type="number" bind:value={protein} min="0" step="0.1" placeholder="—" />
          </div>
          <div class="field">
            <label for="cf-fat">Fat (g, optional)</label>
            <input id="cf-fat" type="number" bind:value={fat} min="0" step="0.1" placeholder="—" />
          </div>
          <div class="field">
            <label for="cf-carbs">Carbs (g, optional)</label>
            <input id="cf-carbs" type="number" bind:value={carbs} min="0" step="0.1" placeholder="—" />
          </div>
        </div>
        {#if error}
          <div class="error">{error}</div>
        {/if}
        <div class="actions">
          <button type="button" class="btn secondary" on:click={handleCancel}>Cancel</button>
          <button type="submit" class="btn primary" disabled={submitting}>
            {submitting ? 'Checking…' : 'Create & add'}
          </button>
        </div>
      </form>
    {/if}
  </div>
{/if}

<style>
  .custom-food-form {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
  }
  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
  }
  .form-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius-sm);
  }
  .close-btn:hover {
    color: var(--text-primary);
    background: var(--surface);
  }
  .form-body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  .field label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .field input,
  .field select {
    padding: var(--spacing-sm);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    background: var(--surface);
    color: var(--text-primary);
    font-size: 1rem;
  }
  .field input:focus,
  .field select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  .field.serving-def label {
    margin-bottom: var(--spacing-xs);
  }
  .serving-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: var(--spacing-md);
    align-items: center;
  }
  .duplicate-prompt {
    padding: var(--spacing-sm) 0;
  }
  .duplicate-heading {
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--spacing-xs);
  }
  .duplicate-hint {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-md);
  }
  .duplicate-list {
    list-style: none;
    margin: 0 0 var(--spacing-md);
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  .duplicate-list li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
  }
  .dup-name {
    flex: 1;
    min-width: 120px;
    font-weight: 500;
  }
  .dup-barcode {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
  .use-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.8125rem;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: var(--border-radius-sm);
    cursor: pointer;
  }
  .use-btn:hover {
    filter: brightness(1.1);
  }
  .duplicate-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  .error {
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    padding: var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
  }
  .actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    margin-top: var(--spacing-sm);
  }
  .btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
  }
  .btn.primary {
    background: var(--primary-color);
    color: white;
  }
  .btn.primary:hover:not(:disabled) {
    background: var(--primary-hover);
  }
  .btn.primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn.secondary {
    background: var(--surface);
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }
  .btn.secondary:hover {
    background: var(--surface-elevated);
    color: var(--text-primary);
  }
</style>
