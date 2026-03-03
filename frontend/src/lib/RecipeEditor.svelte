<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { searchFoods, searchFoodsByBarcode, getFoodDetails, createOrUpdateRecipe, deleteRecipe as apiDeleteRecipe } from './api.js';
  import { calculateMacrosForCustom } from './utils/foodConversions.js';
  import { RECIPE_UNITS } from './utils/recipeTypes.js';
  import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
  import AddFromBarcodeModal from './AddFromBarcodeModal.svelte';

  export let visible = false;
  export let recipe = null; // optional, for edit mode

  const dispatch = createEventDispatcher();

  let name = '';
  let brand = '';
  let servings = 1;
  let ingredients = []; // { key, name, amount, unit, ingredient_json, food_id?, calories, protein, fat, carbs (computed) }
  let searchQuery = '';
  let searchResults = [];
  let isSearching = false;
  let saving = false;
  let deleting = false;
  let error = null;
  let activeSection = 'details'; // 'details' | 'ingredients' | 'portion'
  let targetProteinPerServing = 54;
  let portionHelperResult = null; // { servings, totalProtein, totalMassG?, perServingG? }
  let prevVisible = false;
  let pendingAddByIndex = {}; // { [index]: { amount, unit } } for search result rows

  // Barcode scan state (for "Search foods to add")
  let barcodeQuery = '';
  let showCameraModal = false;
  let showAddFromBarcodeModal = false;
  let scanning = false;
  let videoElement = null;
  let canvasElement = null;
  let videoStream = null;
  let barcodeDetector = null;
  let zxingReader = null;
  let scanInterval = null;
  let streamMonitorInterval = null;
  let hasBarcodeDetector = false;
  let useZXing = false;
  let getUserMediaFn = null;

  // Sync form when modal *just* opened (visible false -> true). Use recipe prop (may arrive with or after visible).
  $: openTransition = visible && !prevVisible;
  $: if (openTransition) {
    if (recipe) {
      name = recipe.name ?? recipe.recipe_name ?? '';
      brand = recipe.brand ?? '';
      servings = recipe.servings ?? 1;
      ingredients = (recipe.ingredients || []).map((ing, i) => {
        const j = ing.ingredient_json ?? {};
        const amt = parseFloat(ing.amount) || 0;
        const u = ing.unit || 'g';
        const macros = computeIngredientMacros(j, amt, u);
        return {
          key: `ing-${ing.id ?? i}-${Date.now()}`,
          id: ing.id,
          food_id: ing.food_id,
          name: j.name || 'Ingredient',
          amount: amt,
          unit: u,
          ingredient_json: j,
          ...macros,
        };
      });
    } else {
      name = '';
      brand = '';
      servings = 1;
      ingredients = [];
    }
  }
  // When visible and recipe prop updates (e.g. loaded after modal opened), repopulate form so name/details appear.
  $: if (visible && recipe && recipe.id != null && (name === '' || name === undefined) && (recipe.name != null || recipe.recipe_name != null)) {
    name = recipe.name ?? recipe.recipe_name ?? '';
    brand = recipe.brand ?? '';
    servings = recipe.servings ?? 1;
    ingredients = (recipe.ingredients || []).map((ing, i) => {
      const j = ing.ingredient_json ?? {};
      const amt = parseFloat(ing.amount) || 0;
      const u = ing.unit || 'g';
      const macros = computeIngredientMacros(j, amt, u);
      return {
        key: `ing-${ing.id ?? i}-${Date.now()}`,
        id: ing.id,
        food_id: ing.food_id,
        name: j.name || 'Ingredient',
        amount: amt,
        unit: u,
        ingredient_json: j,
        ...macros,
      };
    });
  }
  $: prevVisible = visible;

  function computeIngredientMacros(ingredientJson, amount, unit) {
    if (!ingredientJson || ingredientJson.calories == null) return { calories: 0, protein: 0, fat: 0, carbs: 0 };
    const customFood = {
      serving_size: ingredientJson.serving_size ?? 100,
      serving_unit: ingredientJson.serving_unit || 'g',
      calories: ingredientJson.calories ?? 0,
      protein: ingredientJson.protein ?? 0,
      fat: ingredientJson.fat ?? 0,
      carbs: ingredientJson.carbs ?? 0,
    };
    return calculateMacrosForCustom(customFood, amount, unit);
  }

  $: totalMacros = ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + (ing.calories ?? 0),
      protein: acc.protein + (ing.protein ?? 0),
      fat: acc.fat + (ing.fat ?? 0),
      carbs: acc.carbs + (ing.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  $: totalMassG = ingredients.reduce((sum, ing) => {
    const j = ing.ingredient_json || {};
    const servG = toGrams(j.serving_size ?? 100, j.serving_unit || 'g');
    const amountG = toGrams(ing.amount, ing.unit, j.serving_size, j.serving_unit);
    if (servG <= 0) return sum;
    return sum + amountG;
  }, 0);

  function toGrams(amount, unit, servingSize, servingUnit) {
    const n = parseFloat(amount) || 0;
    const u = (unit || 'g').toLowerCase().trim();
    if (u === 'g' || u === 'gram' || u === 'grams') return n;
    if (u === 'oz' || u === 'ounce' || u === 'ounces') return n * 28.3495;
    if (u === 'serving' || u === 'servings') {
      const servG = toGrams(servingSize || 100, servingUnit || 'g', null, null);
      return n * servG;
    }
    if (u === 'cup' || u === 'cups') return n * 240;
    if (u === 'tbsp') return n * 15;
    if (u === 'tsp') return n * 5;
    return n;
  }

  let searchTimeout = null;
  $: if (searchQuery && searchQuery.length >= 2) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => doSearch(), 400);
  }

  async function doSearch() {
    if (!searchQuery || searchQuery.length < 2) {
      searchResults = [];
      return;
    }
    try {
      isSearching = true;
      const res = await searchFoods(searchQuery, { pageSize: 15 });
      searchResults = res.foods || [];
    } catch (e) {
      searchResults = [];
      error = e.message || 'Search failed';
    } finally {
      isSearching = false;
    }
  }

  function defaultAmountUnit(food) {
    const amount = food.servingSize ?? food.serving_size ?? 100;
    const unit = (food.servingSizeUnit || food.serving_unit || 'g').trim().toLowerCase();
    return { amount: typeof amount === 'number' ? amount : parseFloat(amount) || 100, unit: RECIPE_UNITS.includes(unit) ? unit : 'g' };
  }

  /** Build ingredient_json from a search result food so we can compute macros for a given amount/unit. */
  function searchFoodToIngredientJson(food) {
    const isCustom = food.customFoodId != null || food.source === 'custom';
    if (isCustom) {
      const serv = food.serving_size ?? food.servingSize ?? 100;
      const su = (food.serving_unit || food.servingSizeUnit || 'g').trim();
      return {
        serving_size: typeof serv === 'number' ? serv : parseFloat(serv) || 100,
        serving_unit: RECIPE_UNITS.includes(su) ? su : 'g',
        calories: food.calories ?? 0,
        protein: food.protein ?? 0,
        fat: food.fat ?? 0,
        carbs: food.carbs ?? 0,
      };
    }
    let cal = 0, prot = 0, fatVal = 0, carb = 0;
    (food.foodNutrients || []).forEach((n) => {
      const id = n.nutrient?.id ?? n.nutrientId;
      const v = n.amount ?? n.value ?? 0;
      if (id === 1008) cal = v;
      else if (id === 1003) prot = v;
      else if (id === 1004) fatVal = v;
      else if (id === 1005) carb = v;
    });
    const serv = food.servingSize != null ? food.servingSize : 100;
    const mult = serv / 100;
    return {
      serving_size: serv,
      serving_unit: (food.servingSizeUnit || 'g').trim(),
      calories: Math.round(cal * mult),
      protein: Math.round(prot * mult * 10) / 10,
      fat: Math.round(fatVal * mult * 10) / 10,
      carbs: Math.round(carb * mult * 10) / 10,
    };
  }

  /** P/C/F for the current serving size (amount + unit) of a search result row. */
  function getSearchResultMacros(food, amount, unit) {
    const json = searchFoodToIngredientJson(food);
    return computeIngredientMacros(json, amount, unit);
  }
  function getPending(index) {
    const food = searchResults[index];
    if (!food) return { amount: 100, unit: 'g' };
    const def = defaultAmountUnit(food);
    const p = pendingAddByIndex[index];
    return p ? { amount: p.amount ?? def.amount, unit: RECIPE_UNITS.includes(p.unit) ? p.unit : def.unit } : def;
  }
  function setPending(index, field, value) {
    const food = searchResults[index];
    const def = food ? defaultAmountUnit(food) : { amount: 100, unit: 'g' };
    const prev = pendingAddByIndex[index] || def;
    pendingAddByIndex = { ...pendingAddByIndex, [index]: { ...prev, [field]: value } };
  }
  async function addIngredient(food, amountOverride, unitOverride) {
    const isCustom = food.customFoodId != null || food.source === 'custom';
    let ingredient_json;
    let food_id = null;
    let displayName = food.name || food.description || 'Unknown';
    if (isCustom) {
      food_id = food.customFoodId ?? food.id;
      ingredient_json = {
        name: displayName,
        serving_size: food.serving_size ?? food.servingSize ?? 100,
        serving_unit: (food.serving_unit || food.servingSizeUnit || 'g').trim(),
        calories: food.calories ?? 0,
        protein: food.protein ?? 0,
        fat: food.fat ?? 0,
        carbs: food.carbs ?? 0,
      };
    } else {
      try {
        const full = await getFoodDetails(food.fdcId, 'full');
        displayName = full.description || full.brandOwner || 'Unknown';
        let cal = 0, prot = 0, fatVal = 0, carb = 0;
        (full.foodNutrients || []).forEach((n) => {
          const id = n.nutrient?.id ?? n.nutrientId;
          const v = n.amount ?? n.value ?? 0;
          if (id === 1008) cal = v;
          else if (id === 1003) prot = v;
          else if (id === 1004) fatVal = v;
          else if (id === 1005) carb = v;
        });
        const serv = full.servingSize != null ? full.servingSize : 100;
        const mult = serv / 100;
        ingredient_json = {
          name: displayName,
          serving_size: serv,
          serving_unit: (full.servingSizeUnit || 'g').trim(),
          calories: Math.round(cal * mult),
          protein: Math.round(prot * mult * 10) / 10,
          fat: Math.round(fatVal * mult * 10) / 10,
          carbs: Math.round(carb * mult * 10) / 10,
        };
      } catch (e) {
        error = 'Could not load food details';
        return;
      }
    }
    const defaultAmount = ingredient_json.serving_size || 1;
    const defaultUnit = RECIPE_UNITS.includes((ingredient_json.serving_unit || 'g').trim().toLowerCase()) ? (ingredient_json.serving_unit || 'g').trim().toLowerCase() : 'g';
    const parsed = amountOverride != null ? parseFloat(amountOverride) : NaN;
    const amount = (parsed != null && !isNaN(parsed) && parsed > 0) ? parsed : defaultAmount;
    const unit = unitOverride && RECIPE_UNITS.includes(unitOverride) ? unitOverride : defaultUnit;
    const macros = computeIngredientMacros(ingredient_json, amount, unit);
    ingredients = [
      ...ingredients,
      {
        key: `ing-${Date.now()}-${Math.random()}`,
        food_id,
        name: displayName,
        amount,
        unit,
        ingredient_json,
        ...macros,
      },
    ];
    searchQuery = '';
    searchResults = [];
    pendingAddByIndex = {};
  }

  function updateIngredient(key, field, value) {
    ingredients = ingredients.map((ing) => {
      if (ing.key !== key) return ing;
      const next = { ...ing, [field]: value };
      if (field === 'amount' || field === 'unit') {
        const macros = computeIngredientMacros(next.ingredient_json, next.amount, next.unit);
        return { ...next, ...macros };
      }
      return next;
    });
  }

  function removeIngredient(key) {
    ingredients = ingredients.filter((ing) => ing.key !== key);
  }

  function runPortionHelper() {
    const totalProtein = totalMacros.protein || 0;
    if (totalProtein <= 0 || !targetProteinPerServing || targetProteinPerServing <= 0) {
      portionHelperResult = null;
      return;
    }
    const s = Math.max(1, Math.round(totalProtein / targetProteinPerServing));
    const perServingG = totalMassG > 0 ? Math.round(totalMassG / s) : null;
    portionHelperResult = {
      servings: s,
      totalProtein: Math.round(totalProtein * 10) / 10,
      totalMassG: totalMassG > 0 ? Math.round(totalMassG) : null,
      perServingG,
    };
  }

  function applyPortionHelper() {
    if (portionHelperResult && portionHelperResult.servings >= 1) {
      servings = portionHelperResult.servings;
      portionHelperResult = null;
    }
  }

  async function save() {
    const n = (name || '').trim();
    if (!n) {
      error = 'Recipe name is required';
      return;
    }
    const serv = parseFloat(servings);
    if (isNaN(serv) || serv <= 0) {
      error = 'Servings must be a positive number';
      return;
    }
    const payload = {
      name: n,
      brand: (brand || '').trim() || undefined,
      servings: serv,
      ingredients: ingredients.map((ing) => ({
        food_id: ing.food_id || undefined,
        amount: ing.amount,
        unit: ing.unit,
        ingredient_json: ing.ingredient_json,
      })),
    };
    if (recipe && recipe.id) payload.id = recipe.id;
    try {
      saving = true;
      error = null;
      const saved = await createOrUpdateRecipe(payload);
      dispatch('saved', saved);
      dispatch('close');
    } catch (e) {
      error = e.message || 'Failed to save recipe';
    } finally {
      saving = false;
    }
  }

  function close() {
    dispatch('close');
  }

  async function deleteRecipeConfirm() {
    if (!recipe?.id) return;
    if (!confirm('Delete this recipe? This cannot be undone.')) return;
    try {
      deleting = true;
      error = null;
      await apiDeleteRecipe(recipe.id);
      dispatch('deleted', { id: recipe.id });
      dispatch('close');
    } catch (e) {
      error = e.message || 'Failed to delete recipe';
    } finally {
      deleting = false;
    }
  }

  // --- Barcode: search by barcode and add to recipe, or show "add food" modal if not found ---
  async function handleBarcodeSearchForRecipe() {
    const gtin = (barcodeQuery || '').trim();
    if (gtin.length < 8) {
      error = 'Please enter or scan a valid barcode (at least 8 digits).';
      return;
    }
    try {
      isSearching = true;
      error = null;
      const results = await searchFoodsByBarcode(gtin);
      const foods = results.foods || [];
      if (foods.length > 0) {
        const food = foods[0];
        const { amount, unit } = defaultAmountUnit(food);
        await addIngredient(food, amount, unit);
        barcodeQuery = '';
      } else {
        showAddFromBarcodeModal = true;
      }
    } catch (err) {
      console.error('Barcode search error:', err);
      error = err.message || 'Failed to search by barcode.';
    } finally {
      isSearching = false;
    }
  }

  function handleAddFromBarcodeCreated(event) {
    const created = event.detail;
    const asFood = {
      customFoodId: created.customFoodId ?? created.id,
      name: created.name,
      brand: created.brand ?? null,
      serving_size: created.serving_size ?? 100,
      servingSize: created.serving_size ?? 100,
      serving_unit: created.serving_unit || 'g',
      servingSizeUnit: created.serving_unit || 'g',
      calories: created.calories ?? 0,
      protein: created.protein ?? 0,
      fat: created.fat ?? 0,
      carbs: created.carbs ?? 0,
      source: 'custom',
    };
    addIngredient(asFood);
    barcodeQuery = '';
    showAddFromBarcodeModal = false;
  }

  function handleAddFromBarcodeCancel() {
    showAddFromBarcodeModal = false;
    barcodeQuery = '';
  }

  function handleCameraButtonClick() {
    if (barcodeQuery && barcodeQuery.length >= 8) {
      handleBarcodeSearchForRecipe();
    } else {
      startCameraScan();
    }
  }

  function createZXingReader() {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
    ]);
    return new BrowserMultiFormatReader(hints, 200);
  }

  function stopCamera() {
    scanning = false;
    showCameraModal = false;
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
    if (streamMonitorInterval) {
      clearInterval(streamMonitorInterval);
      streamMonitorInterval = null;
    }
    if (zxingReader) {
      try {
        zxingReader.stopContinuousDecode();
        zxingReader.reset();
      } catch (e) {}
    }
    if (videoStream) {
      videoStream.getTracks().forEach((t) => t.stop());
      videoStream = null;
    }
    if (videoElement) videoElement.srcObject = null;
  }

  async function startCameraScan() {
    if (!hasBarcodeDetector && !useZXing) {
      error = 'Barcode scanning is not supported in this browser. Enter barcode manually in search.';
      return;
    }
    if (!getUserMediaFn) {
      if (navigator?.mediaDevices?.getUserMedia) getUserMediaFn = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      else if (navigator?.getUserMedia) {
        getUserMediaFn = (c) => new Promise((res, rej) => navigator.getUserMedia(c, res, rej));
      }
    }
    if (!getUserMediaFn) {
      error = 'Camera not available. Enter barcode manually in search.';
      return;
    }
    try {
      showCameraModal = true;
      scanning = true;
      let retries = 0;
      while (!videoElement && retries < 15) {
        await new Promise((r) => setTimeout(r, 100));
        retries++;
      }
      if (!videoElement) {
        error = 'Camera element not ready.';
        stopCamera();
        return;
      }
      if (useZXing && zxingReader) {
        videoElement.setAttribute('playsinline', 'true');
        videoElement.muted = true;
        videoElement.playsInline = true;
        await zxingReader.decodeFromConstraints(
          { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoElement,
          (result, err) => {
            if (result) {
              const v = result.getText();
              if (v && v.length >= 8) {
                stopCamera();
                barcodeQuery = v;
                handleBarcodeSearchForRecipe();
              }
            }
          }
        );
        if (videoElement.srcObject instanceof MediaStream) videoStream = videoElement.srcObject;
      } else if (hasBarcodeDetector && barcodeDetector) {
        const stream = await getUserMediaFn({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        videoStream = stream;
        videoElement.srcObject = stream;
        await videoElement.play();
        scanInterval = setInterval(async () => {
          if (!videoElement || !barcodeDetector || !scanning) return;
          try {
            const barcodes = await barcodeDetector.detect(videoElement);
            if (barcodes?.length > 0 && barcodes[0].rawValue?.length >= 8) {
              stopCamera();
              barcodeQuery = barcodes[0].rawValue;
              await handleBarcodeSearchForRecipe();
            }
          } catch (e) {}
        }, 250);
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') error = 'Camera permission denied.';
      else if (err.name === 'NotFoundError') error = 'No camera found.';
      else error = err.message || 'Camera error.';
      stopCamera();
    }
  }

  onMount(() => {
    if (typeof navigator !== 'undefined') {
      if (navigator.mediaDevices?.getUserMedia) getUserMediaFn = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      else if (navigator.getUserMedia) {
        getUserMediaFn = (c) => new Promise((res, rej) => navigator.getUserMedia(c, res, rej));
      }
    }
    if ('BarcodeDetector' in window) {
      hasBarcodeDetector = true;
      try {
        barcodeDetector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        });
      } catch (e) {
        hasBarcodeDetector = false;
        useZXing = true;
        zxingReader = createZXingReader();
      }
    } else {
      useZXing = true;
      zxingReader = createZXingReader();
    }
  });

  onDestroy(() => {
    stopCamera();
  });
</script>

{#if visible}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
  <div
    class="recipe-editor-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="recipe-editor-title"
    tabindex="-1"
    on:click|self={close}
    on:keydown={(e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } }}
  >
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div class="recipe-editor-modal" role="document" on:click|stopPropagation on:keydown|stopPropagation>
      <div class="recipe-editor-header">
        <h2 id="recipe-editor-title">{recipe ? 'Edit recipe' : 'New recipe'}</h2>
        <button type="button" class="close-btn" on:click={close} aria-label="Close">×</button>
      </div>

      <div class="recipe-editor-tabs">
        <button type="button" class:active={activeSection === 'details'} on:click={() => (activeSection = 'details')}>Details</button>
        <button type="button" class:active={activeSection === 'ingredients'} on:click={() => (activeSection = 'ingredients')}>Ingredients</button>
        <button type="button" class:active={activeSection === 'portion'} on:click={() => (activeSection = 'portion')}>Portion helper</button>
      </div>

      {#if activeSection === 'details'}
        <div class="recipe-editor-section">
          <label for="recipe-name">Name *</label>
          <input id="recipe-name" type="text" bind:value={name} placeholder="e.g. Chicken Burrito" />
          <label for="recipe-brand">Brand (optional)</label>
          <input id="recipe-brand" type="text" bind:value={brand} placeholder="Optional" />
          <label for="recipe-servings">Servings *</label>
          <input id="recipe-servings" type="number" min="0.5" step="0.5" bind:value={servings} />
        </div>
      {:else if activeSection === 'ingredients'}
        <div class="recipe-editor-section">
          <p class="section-hint">Search and add foods; adjust amount and unit per ingredient.</p>
          <div class="ingredient-search">
            <input type="text" placeholder="Search foods to add..." bind:value={searchQuery} />
            <button
              type="button"
              class="barcode-btn"
              on:click={handleCameraButtonClick}
              disabled={isSearching || scanning}
              title="Scan barcode with camera"
              aria-label="Scan barcode"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <line x1="15" y1="3" x2="15" y2="21"></line>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
              </svg>
            </button>
            {#if isSearching}<span class="searching">Searching...</span>{/if}
          </div>
          {#if searchResults.length > 0}
            <div class="ingredient-search-results">
              <p class="section-hint">Set amount and unit, then click &quot;Add to recipe&quot; for each food. Add all ingredients, then save the recipe.</p>
              {#each searchResults as food, i}
                {@const pending = getPending(i)}
                {@const macros = getSearchResultMacros(food, pending.amount, pending.unit)}
                <div class="ingredient-result-row">
                  <span class="ingredient-result-name">{food.description || food.name || food.brandOwner || 'Unknown'}</span>
                  <span class="ingredient-result-pcf">
                    <span class="pcf-cal">{Math.round(macros.calories ?? 0)} cal</span>
                    <span class="pcf-sep">·</span>
                    <span class="pcf-p">P {(macros.protein ?? 0).toFixed(1)}g</span>
                    <span class="pcf-sep">·</span>
                    <span class="pcf-f">F {(macros.fat ?? 0).toFixed(1)}g</span>
                    <span class="pcf-sep">·</span>
                    <span class="pcf-c">C {(macros.carbs ?? 0).toFixed(1)}g</span>
                  </span>
                  <div class="ingredient-result-add">
                    <input type="number" min="0" step="any" value={pending.amount} on:input={(e) => setPending(i, 'amount', e.currentTarget.value)} on:change={(e) => setPending(i, 'amount', e.currentTarget.value)} />
                    <select value={pending.unit} on:change={(e) => setPending(i, 'unit', e.currentTarget.value)}>
                      {#each RECIPE_UNITS as u}
                        <option value={u}>{u}</option>
                      {/each}
                    </select>
                    <button type="button" class="add-to-recipe-btn" on:click={() => { const p = getPending(i); addIngredient(food, p.amount, p.unit); }}>Add to recipe</button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
          <div class="ingredients-list">
            <div class="ingredients-list-header">Ingredients · Subtotal: {Math.round(totalMacros.calories)} cal, P {Math.round(totalMacros.protein * 10) / 10}g</div>
            {#each ingredients as ing (ing.key)}
              {@const safeUnit = RECIPE_UNITS.includes(ing.unit) ? ing.unit : 'g'}
              <div class="ingredient-card">
                <div class="ingredient-card-info">
                  <div class="ingredient-card-header">
                    <span class="ingredient-name" title={ing.name}>{ing.name}</span>
                    <button type="button" class="remove-ingredient-btn" on:click={() => removeIngredient(ing.key)} aria-label="Remove">×</button>
                  </div>
                  <div class="ingredient-card-macros">
                    <span class="macro-cal">{Math.round(ing.calories ?? 0)} cal</span>
                    <span class="macro-sep">·</span>
                    <span class="macro-p">P {(ing.protein ?? 0).toFixed(1)}g</span>
                    <span class="macro-sep">·</span>
                    <span class="macro-f">F {(ing.fat ?? 0).toFixed(1)}g</span>
                    <span class="macro-sep">·</span>
                    <span class="macro-c">C {(ing.carbs ?? 0).toFixed(1)}g</span>
                  </div>
                  <div class="ingredient-card-amount">
                    <input type="number" min="0" step="any" value={ing.amount} on:input={(e) => { const v = e.currentTarget.value; const num = parseFloat(v); if (v !== '' && !isNaN(num) && num >= 0) updateIngredient(ing.key, 'amount', num); }} />
                    <select class="unit-select" value={safeUnit} on:change={(e) => updateIngredient(ing.key, 'unit', e.currentTarget.value)}>
                      {#each RECIPE_UNITS as u}
                        <option value={u}>{u}</option>
                      {/each}
                    </select>
                  </div>
                </div>
              </div>
            {/each}
            {#if ingredients.length === 0}
              <p class="no-ingredients">No ingredients yet. Search above to add foods.</p>
            {/if}
          </div>
        </div>
      {:else if activeSection === 'portion'}
        <div class="recipe-editor-section">
          <p class="section-hint">Target protein per serving (g); we'll suggest how many servings to divide the recipe into.</p>
          <label for="target-protein">Target protein per serving (g)</label>
          <input id="target-protein" type="number" min="1" step="1" bind:value={targetProteinPerServing} />
          <button type="button" class="portion-helper-btn" on:click={runPortionHelper}>Calculate</button>
          {#if portionHelperResult}
            <div class="portion-helper-result">
              <p>Total protein: {portionHelperResult.totalProtein}g → <strong>{portionHelperResult.servings} servings</strong> of ~{Math.round(portionHelperResult.totalProtein / portionHelperResult.servings)}g protein each.</p>
              {#if portionHelperResult.perServingG != null}
                <p>Divide into {portionHelperResult.servings} equal portions of ~{portionHelperResult.perServingG}g each.</p>
              {/if}
              <button type="button" class="apply-portion-btn" on:click={applyPortionHelper}>Apply to recipe</button>
            </div>
          {/if}
        </div>
      {/if}

      {#if error}
        <div class="recipe-editor-error">{error}</div>
      {/if}

      <div class="recipe-editor-footer">
        {#if recipe?.id}
          <button type="button" class="delete-recipe-btn" on:click={deleteRecipeConfirm} disabled={saving || deleting} title="Delete this recipe">{deleting ? 'Deleting...' : 'Delete recipe'}</button>
        {/if}
        <div class="recipe-editor-footer-actions">
          <button type="button" class="cancel-btn" on:click={close}>Cancel</button>
          <button type="button" class="save-btn" on:click={save} disabled={saving}>{saving ? 'Saving...' : 'Save recipe'}</button>
        </div>
      </div>
    </div>
  </div>

  <AddFromBarcodeModal
    barcode={barcodeQuery}
    visible={showAddFromBarcodeModal}
    on:created={handleAddFromBarcodeCreated}
    on:cancel={handleAddFromBarcodeCancel}
  />

  {#if showCameraModal}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div
      class="camera-modal-overlay"
      role="button"
      tabindex="0"
      on:click|self={stopCamera}
      on:keydown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stopCamera(); } }}
      aria-label="Close camera scanner"
    >
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <div class="camera-modal-content" role="dialog" aria-modal="true" aria-labelledby="recipe-camera-title" on:click|stopPropagation on:keydown|stopPropagation>
        <div class="camera-modal-header">
          <h3 id="recipe-camera-title">Scan barcode</h3>
          <button type="button" class="close-camera-btn" on:click={stopCamera}>×</button>
        </div>
        <div class="camera-container">
          <canvas bind:this={canvasElement} class="decode-canvas"></canvas>
          <video bind:this={videoElement} class="camera-video" autoplay playsinline muted></video>
          {#if scanning}
            <div class="scanning-overlay">
              <div class="scan-line"></div>
              <p class="scan-instructions">Hold barcode steady in frame</p>
            </div>
          {/if}
        </div>
        <div class="camera-modal-footer">
          <button type="button" class="cancel-camera-btn" on:click={stopCamera}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .recipe-editor-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--spacing-md);
  }
  .recipe-editor-modal {
    background: var(--surface-elevated, #1e293b);
    border-radius: var(--border-radius, 8px);
    max-width: 520px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }
  .recipe-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border, #334155);
  }
  .recipe-editor-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-primary, #f1f5f9);
  }
  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary, #94a3b8);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
  }
  .recipe-editor-tabs {
    display: flex;
    gap: 4px;
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--border, #334155);
  }
  .recipe-editor-tabs button {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    border: none;
    color: var(--text-secondary, #94a3b8);
    cursor: pointer;
    border-radius: var(--border-radius-sm, 4px);
    font-size: 0.875rem;
  }
  .recipe-editor-tabs button.active {
    background: var(--primary-color, #3b82f6);
    color: white;
  }
  .recipe-editor-section {
    padding: var(--spacing-md);
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  .recipe-editor-section label {
    display: block;
    margin-top: var(--spacing-sm);
    margin-bottom: 4px;
    font-size: 0.875rem;
    color: var(--text-secondary, #94a3b8);
  }
  .recipe-editor-section input[type='text'],
  .recipe-editor-section input[type='number'] {
    width: 100%;
    padding: var(--spacing-sm);
    border: 1px solid var(--border, #334155);
    border-radius: var(--border-radius, 6px);
    background: var(--input-background, #0f172a);
    color: var(--text-primary, #f1f5f9);
    font-size: 1rem;
  }
  .section-hint {
    margin: 0 0 var(--spacing-sm);
    font-size: 0.8125rem;
    color: var(--text-secondary, #94a3b8);
  }
  .ingredient-search {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }
  .ingredient-search input {
    flex: 1;
  }
  .searching {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  .ingredient-search-results {
    max-height: 320px;
    overflow-y: auto;
    margin-bottom: var(--spacing-md);
    border: 1px solid var(--border, #334155);
    border-radius: var(--border-radius, 6px);
  }
  .ingredient-result-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--border, #334155);
    color: var(--text-primary, #f1f5f9);
    text-align: left;
    font-size: 0.875rem;
  }
  .ingredient-result-row:last-child {
    border-bottom: none;
  }
  .ingredient-result-name {
    font-weight: 500;
  }
  .ingredient-result-pcf {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 0.8125rem;
    font-weight: 600;
    margin-top: 4px;
  }
  .ingredient-result-pcf .pcf-sep {
    color: var(--border, #475569);
    margin: 0 1px;
    font-weight: 400;
  }
  .ingredient-result-pcf .pcf-cal { color: var(--text-secondary, #94a3b8); }
  .ingredient-result-pcf .pcf-p { color: #3b82f6; }
  .ingredient-result-pcf .pcf-f { color: #f59e0b; }
  .ingredient-result-pcf .pcf-c { color: #10b981; }
  .ingredient-result-add {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
    width: 100%;
  }
  .ingredient-result-add input[type='number'] {
    width: 70px;
    padding: 4px 6px;
    font-size: 0.875rem;
  }
  .ingredient-result-add select {
    padding: 4px 6px;
    font-size: 0.875rem;
    background: var(--input-background, #0f172a);
    color: var(--text-primary, #f1f5f9);
    border: 1px solid var(--border, #334155);
    border-radius: var(--border-radius-sm, 4px);
    min-width: 80px;
  }
  .add-to-recipe-btn {
    padding: 4px 10px;
    font-size: 0.8125rem;
    background: var(--primary-color, #3b82f6);
    color: white;
    border: none;
    border-radius: var(--border-radius-sm, 4px);
    cursor: pointer;
  }
  .add-to-recipe-btn:hover {
    opacity: 0.9;
  }
  .ingredients-list-header {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-sm);
  }
  .ingredients-list {
    margin-top: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  /* Added ingredients: card style with colored left margin (match added-foods look) */
  .ingredient-card {
    display: flex;
    align-items: stretch;
    background: rgba(16, 185, 129, 0.06);
    border: 1px solid var(--border, #334155);
    border-left: 3px solid #10b981;
    border-radius: var(--border-radius, 6px);
    padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-md);
    font-size: 0.875rem;
  }
  .ingredient-card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ingredient-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-xs);
  }
  .ingredient-name {
    font-weight: 500;
    color: var(--text-primary, #f1f5f9);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .ingredient-card-macros {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    font-size: 0.75rem;
    color: var(--text-secondary, #94a3b8);
  }
  .ingredient-card-macros .macro-cal { font-weight: 600; color: var(--text-secondary); }
  .ingredient-card-macros .macro-sep { color: var(--border); margin: 0 1px; }
  .ingredient-card-macros .macro-p { color: #3b82f6; }
  .ingredient-card-macros .macro-f { color: #f59e0b; }
  .ingredient-card-macros .macro-c { color: #10b981; }
  .ingredient-card-amount {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
  .ingredient-card-amount input[type='number'] {
    width: 72px;
    padding: 4px 6px;
    font-size: 0.875rem;
    background: var(--input-background, #0f172a);
    color: var(--text-primary, #f1f5f9);
    border: 1px solid var(--border, #334155);
    border-radius: var(--border-radius-sm, 4px);
  }
  .unit-select {
    min-width: 72px;
    padding: 4px 6px;
    font-size: 0.875rem;
    background: var(--input-background, #0f172a);
    color: var(--text-primary, #f1f5f9);
    border: 1px solid var(--border, #334155);
    border-radius: var(--border-radius-sm, 4px);
  }
  .remove-ingredient-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    font-size: 1.1rem;
    line-height: 1;
    flex-shrink: 0;
  }
  .remove-ingredient-btn:hover {
    color: #ef4444;
  }
  .barcode-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm);
    background: var(--surface-hover, #334155);
    border: 1px solid var(--border, #334155);
    border-radius: var(--border-radius-sm, 4px);
    color: var(--text-primary, #f1f5f9);
    cursor: pointer;
    transition: background 0.2s;
  }
  .barcode-btn:hover:not(:disabled) {
    background: var(--primary-color, #3b82f6);
    color: white;
  }
  .barcode-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .no-ingredients {
    margin: var(--spacing-md) 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  .portion-helper-btn {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--primary-color, #3b82f6);
    color: white;
    border: none;
    border-radius: var(--border-radius, 6px);
    cursor: pointer;
    font-size: 0.875rem;
  }
  .portion-helper-result {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--surface-hover, #334155);
    border-radius: var(--border-radius, 6px);
    font-size: 0.875rem;
  }
  .portion-helper-result p {
    margin: 0 0 var(--spacing-xs);
  }
  .apply-portion-btn {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--primary-color, #3b82f6);
    color: white;
    border: none;
    border-radius: var(--border-radius-sm, 4px);
    cursor: pointer;
    font-size: 0.8125rem;
  }
  .recipe-editor-error {
    padding: var(--spacing-sm) var(--spacing-md);
    margin: 0 var(--spacing-md);
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border-radius: var(--border-radius-sm, 4px);
    font-size: 0.875rem;
  }
  .recipe-editor-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-top: 1px solid var(--border, #334155);
  }
  .recipe-editor-footer-actions {
    display: flex;
    gap: var(--spacing-sm);
  }
  .delete-recipe-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: transparent;
    border: 1px solid #dc2626;
    color: #f87171;
    border-radius: var(--border-radius, 6px);
    cursor: pointer;
    font-size: 0.875rem;
  }
  .delete-recipe-btn:hover:not(:disabled) {
    background: rgba(220, 38, 38, 0.15);
    color: #fca5a5;
  }
  .delete-recipe-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .cancel-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: transparent;
    border: 1px solid var(--border, #334155);
    color: var(--text-primary, #f1f5f9);
    border-radius: var(--border-radius, 6px);
    cursor: pointer;
    font-size: 0.875rem;
  }
  .save-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--primary-color, #3b82f6);
    color: white;
    border: none;
    border-radius: var(--border-radius, 6px);
    cursor: pointer;
    font-size: 0.875rem;
  }
  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  /* Camera modal (same pattern as FoodSearch) */
  .camera-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: var(--spacing-md);
  }
  .camera-modal-content {
    background: var(--surface-elevated, #1e293b);
    border-radius: var(--border-radius, 8px);
    max-width: 100%;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  }
  .camera-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--border, #334155);
  }
  .camera-modal-header h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-primary, #f1f5f9);
  }
  .close-camera-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
  }
  .camera-container {
    position: relative;
    width: 100%;
    max-width: 400px;
    aspect-ratio: 4/3;
    background: #000;
  }
  .camera-video,
  .decode-canvas {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .decode-canvas { display: none; }
  .scanning-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
  }
  .scan-line {
    width: 80%;
    height: 2px;
    background: #10b981;
    animation: scan-pulse 1.5s ease-in-out infinite;
  }
  @keyframes scan-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .scan-instructions {
    margin: var(--spacing-sm) 0 0;
    color: white;
    font-size: 0.875rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  .camera-modal-footer {
    padding: var(--spacing-sm) var(--spacing-md);
    border-top: 1px solid var(--border, #334155);
  }
  .cancel-camera-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    font-size: 0.875rem;
  }
  @media (max-width: 480px) {
    .ingredient-card-amount input[type='number'] { width: 60px; }
    .unit-select { min-width: 60px; }
  }
</style>
