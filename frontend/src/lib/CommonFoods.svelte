<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { getCommonFoods, toggleFavorite, removeCommonFood } from './utils/foodStorage.js';
  import PortionAdjustmentModal from './PortionAdjustmentModal.svelte';
  import { calculateMacros, getAvailableUnits } from './utils/foodConversions.js';
  
  const dispatch = createEventDispatcher();
  
  export let commonFoods = [];
  export let showAll = false;
  
  let selectedFood = null;
  let showPortionModal = false;
  let carouselContainer = null;
  let showLeftArrow = false;
  let showRightArrow = false;
  
  // Track amount/unit per food for macro calculation
  let foodAmounts = {}; // { fdcId: { amount, unit } }
  
  // Initialize amounts from last used values
  function initializeAmounts() {
    if (commonFoods.length === 0) return;
    
    const updatedAmounts = {};
    commonFoods.forEach(food => {
      // Always initialize with lastAmount/lastUnit or defaults
      const amount = (food.lastAmount != null && !isNaN(Number(food.lastAmount))) ? Number(food.lastAmount) : 100;
      const unit = food.lastUnit || 'g';
      updatedAmounts[food.fdcId] = {
        amount: amount,
        unit: unit
      };
    });
    foodAmounts = updatedAmounts;
  }
  
  // Initialize on mount and when commonFoods changes
  onMount(() => {
    initializeAmounts();
    
    // Update arrow visibility on window resize
    const handleResize = () => {
      updateArrowVisibility();
    };
    
    // Check arrow visibility after mount - use multiple checks to catch layout completion
    const checkVisibility = () => {
      updateArrowVisibility();
    };
    
    // Schedule multiple checks to ensure we catch when layout is complete
    setTimeout(checkVisibility, 50);
    setTimeout(checkVisibility, 150);
    setTimeout(checkVisibility, 300);
    setTimeout(checkVisibility, 500);
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
  
  // Set up scroll listener when container is available
  let scrollHandler = null;
  
  $: if (carouselContainer && !scrollHandler) {
    scrollHandler = () => updateArrowVisibility();
    carouselContainer.addEventListener('scroll', scrollHandler);
    // Initial check with multiple attempts for reliable detection
    updateArrowVisibility();
    setTimeout(updateArrowVisibility, 50);
  }
  
  // Cleanup scroll listener on destroy
  onDestroy(() => {
    if (carouselContainer && scrollHandler) {
      carouselContainer.removeEventListener('scroll', scrollHandler);
    }
  });
  
  $: if (commonFoods.length > 0) {
    initializeAmounts();
  }
  
  // Helper to get display amount (always returns a valid number)
  function getDisplayAmount(food) {
    const stored = foodAmounts[food.fdcId];
    if (stored && stored.amount != null && !isNaN(stored.amount) && stored.amount > 0) {
      return stored.amount;
    }
    const last = food.lastAmount;
    if (last != null && !isNaN(Number(last)) && Number(last) > 0) {
      return Number(last);
    }
    return 100;
  }
  
  // Calculate macros for a food
  function getFoodMacros(food) {
    if (!food.foodData) return { protein: 0, fat: 0, carbs: 0, calories: 0 };
    
    const amount = foodAmounts[food.fdcId]?.amount ?? food.lastAmount ?? 100;
    const unit = foodAmounts[food.fdcId]?.unit ?? food.lastUnit ?? 'g';
    return calculateMacros(food.foodData, amount, unit);
  }
  
  // Get available units for a food
  function getFoodUnits(food) {
    if (!food.foodData) return ['g', 'oz'];
    return getAvailableUnits(food.foodData);
  }
  
  // Handle amount/unit change
  function handleAmountChange(fdcId, amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return;
    
    if (!foodAmounts[fdcId]) {
      foodAmounts[fdcId] = { amount: 100, unit: 'g' };
    }
    foodAmounts[fdcId].amount = numAmount;
    foodAmounts = { ...foodAmounts }; // Trigger reactivity
  }
  
  function handleUnitChange(fdcId, unit) {
    if (!foodAmounts[fdcId]) {
      foodAmounts[fdcId] = { amount: 100, unit: 'g' };
    }
    foodAmounts[fdcId].unit = unit;
    foodAmounts = { ...foodAmounts }; // Trigger reactivity
  }
  
  // Sort foods: favorites first, then by usage count
  $: sortedFoods = [...commonFoods].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return (b.usageCount || 0) - (a.usageCount || 0);
  });
  
  // Limit display
  $: displayedFoods = showAll ? sortedFoods : sortedFoods.slice(0, 6);
  
  function handleQuickAdd(food) {
    // Use current amount/unit from the card, or fall back to last used
    const amount = foodAmounts[food.fdcId]?.amount ?? food.lastAmount ?? 100;
    const unit = foodAmounts[food.fdcId]?.unit ?? food.lastUnit ?? 'g';
    
    // Calculate macros for current amount/unit
    const macros = calculateMacros(food.foodData, amount, unit);
    
    // Create food entry directly (bypass modal for quick add)
    const foodEntry = {
      id: `${food.fdcId}-${Date.now()}-${Math.random()}`,
      fdcId: food.fdcId,
      name: food.name,
      brand: food.brand || null,
      amount: amount,
      unit: unit,
      foodData: food.foodData,
      protein: macros.protein,
      fat: macros.fat,
      carbs: macros.carbs,
      calories: macros.calories,
    };
    
    dispatch('foodAdded', foodEntry);
  }
  
  function handleFavoriteToggle(fdcId, event) {
    event.stopPropagation();
    const updated = toggleFavorite(fdcId);
    dispatch('update', updated);
  }
  
  function handleRemove(fdcId, event) {
    event.stopPropagation();
    if (confirm('Remove this food from common foods?')) {
      const updated = removeCommonFood(fdcId);
      dispatch('update', updated);
    }
  }
  
  function handleAddFromModal(event) {
    dispatch('foodAdded', event.detail);
    showPortionModal = false;
    selectedFood = null;
  }
  
  function handleCloseModal() {
    showPortionModal = false;
    selectedFood = null;
  }
  
  // Check scroll position to show/hide arrows
  function updateArrowVisibility() {
    if (!carouselContainer) {
      showLeftArrow = false;
      showRightArrow = false;
      return;
    }
    
    // Use requestAnimationFrame to ensure accurate measurements after render
    requestAnimationFrame(() => {
      if (!carouselContainer) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = carouselContainer;
      const canScroll = scrollWidth > clientWidth + 1; // +1 to handle rounding
      
      // Show left arrow if scrolled more than 5px from the start
      showLeftArrow = canScroll && scrollLeft > 5;
      
      // Show right arrow if there's more than 5px remaining to scroll
      showRightArrow = canScroll && (scrollWidth - clientWidth - scrollLeft) > 5;
    });
  }
  
  // Scroll carousel left
  function scrollLeft() {
    if (!carouselContainer) return;
    const cardWidth = 200 + parseInt(getComputedStyle(document.documentElement).getPropertyValue('--spacing-sm') || '8', 10);
    carouselContainer.scrollBy({ left: -cardWidth * 2, behavior: 'smooth' });
    // Update visibility after scroll animation
    setTimeout(updateArrowVisibility, 100);
    setTimeout(updateArrowVisibility, 350);
  }
  
  // Scroll carousel right
  function scrollRight() {
    if (!carouselContainer) return;
    const cardWidth = 200 + parseInt(getComputedStyle(document.documentElement).getPropertyValue('--spacing-sm') || '8', 10);
    carouselContainer.scrollBy({ left: cardWidth * 2, behavior: 'smooth' });
    // Update visibility after scroll animation
    setTimeout(updateArrowVisibility, 100);
    setTimeout(updateArrowVisibility, 350);
  }
  
  // Update arrow visibility when foods change or container is ready
  $: if (displayedFoods && carouselContainer) {
    // Multiple checks to handle various rendering timings
    updateArrowVisibility();
    setTimeout(updateArrowVisibility, 100);
    setTimeout(updateArrowVisibility, 300);
  }
</script>

{#if commonFoods.length > 0}
  <div class="common-foods">
    <div class="common-foods-header">
      <h4 class="common-foods-title">Recent Foods ({commonFoods.length})</h4>
    </div>
    
    <div class="carousel-wrapper">
      <button
        type="button"
        class="carousel-arrow carousel-arrow-left"
        class:disabled={!showLeftArrow}
        on:click={scrollLeft}
        aria-label="Scroll left"
        disabled={!showLeftArrow}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      
      <div 
        class="common-foods-grid"
        bind:this={carouselContainer}
        on:scroll={updateArrowVisibility}
      >
        {#each displayedFoods as food (food.fdcId)}
        {@const baseUnit = food.lastUnit || 'g'}
        {@const storedData = foodAmounts[food.fdcId]}
        {@const finalUnit = storedData?.unit ?? baseUnit}
        {@const macros = getFoodMacros(food)}
        {@const availableUnits = getFoodUnits(food)}
        {@const displayAmount = getDisplayAmount(food)}
        <div class="common-food-card">
          <div class="common-food-info">
            <div class="common-food-name">{food.name}</div>
            {#if food.brand}
              <div class="common-food-brand">{food.brand}</div>
            {/if}
            
            <div class="common-food-serving">
              <div class="serving-inputs">
                <input
                  type="number"
                  class="serving-amount"
                  value={displayAmount}
                  on:input={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0) {
                      handleAmountChange(food.fdcId, val);
                    }
                  }}
                  on:click|stopPropagation
                  step="0.1"
                  min="0"
                  placeholder="Amount"
                />
                <select
                  class="serving-unit"
                  value={finalUnit}
                  on:change={(e) => handleUnitChange(food.fdcId, e.target.value)}
                  on:click|stopPropagation
                >
                  {#each availableUnits as u}
                    <option value={u}>{u}</option>
                  {/each}
                </select>
              </div>
            </div>
            
            <div class="common-food-macros">
              <div class="macro-row">
                <span class="macro-label">P:</span>
                <span class="macro-value protein">{macros.protein.toFixed(1)}g</span>
              </div>
              <div class="macro-row">
                <span class="macro-label">F:</span>
                <span class="macro-value fat">{macros.fat.toFixed(1)}g</span>
              </div>
              <div class="macro-row">
                <span class="macro-label">C:</span>
                <span class="macro-value carbs">{macros.carbs.toFixed(1)}g</span>
              </div>
              <div class="macro-row">
                <span class="macro-label">Cal:</span>
                <span class="macro-value calories">{macros.calories}</span>
              </div>
            </div>
          </div>
          
          <div class="common-food-actions">
            <button
              type="button"
              class="add-btn"
              on:click|stopPropagation={() => handleQuickAdd(food)}
              title="Add to log"
            >
              Add
            </button>
            <button
              type="button"
              class="favorite-btn"
              class:favorited={food.isFavorite}
              on:click|stopPropagation={(e) => handleFavoriteToggle(food.fdcId, e)}
              title={food.isFavorite ? 'Unfavorite' : 'Favorite'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={food.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
            <button
              type="button"
              class="remove-btn"
              on:click|stopPropagation={(e) => handleRemove(food.fdcId, e)}
              title="Remove from common foods"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      {/each}
      </div>
      
      <button
        type="button"
        class="carousel-arrow carousel-arrow-right"
        class:disabled={!showRightArrow}
        on:click={scrollRight}
        aria-label="Scroll right"
        disabled={!showRightArrow}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  </div>
{/if}

{#if selectedFood && selectedFood.foodData}
  <PortionAdjustmentModal
    foodData={selectedFood.foodData}
    defaultAmount={selectedFood.lastAmount || 100}
    defaultUnit={selectedFood.lastUnit || 'g'}
    isOpen={showPortionModal}
    on:add={handleAddFromModal}
    on:close={handleCloseModal}
  />
{/if}

<style>
  .common-foods {
    margin-bottom: var(--spacing-lg);
    position: relative;
    overflow: visible;
  }
  
  .common-foods-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }
  
  .common-foods-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .carousel-wrapper {
    display: flex;
    align-items: center;
    width: 100%;
    gap: var(--spacing-sm);
  }
  
  .common-foods-grid {
    display: flex;
    gap: var(--spacing-sm);
    overflow-x: auto;
    overflow-y: hidden;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    padding: var(--spacing-xs) 0;
    flex: 1;
    min-width: 0; /* Allow shrinking */
    /* Show scrollbar on mobile for better UX */
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  
  .common-foods-grid::-webkit-scrollbar {
    height: 6px;
  }
  
  .common-foods-grid::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .common-foods-grid::-webkit-scrollbar-thumb {
    background-color: var(--border);
    border-radius: 3px;
  }
  
  .common-foods-grid::-webkit-scrollbar-thumb:hover {
    background-color: var(--text-secondary);
  }
  
  .carousel-arrow {
    flex: 0 0 auto;
    width: 40px;
    height: 40px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--surface-elevated);
    border: 2px solid var(--border);
    border-radius: 50%;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }
  
  .carousel-arrow:hover:not(:disabled) {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  
  .carousel-arrow:active:not(:disabled) {
    transform: scale(0.95);
  }
  
  .carousel-arrow:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background-color: var(--surface);
    border-color: var(--border);
  }
  
  .carousel-arrow:disabled svg {
    opacity: 0.6;
    color: var(--text-secondary);
  }
  
  @media (max-width: 768px) {
    .carousel-arrow {
      width: 36px;
      height: 36px;
      min-width: 36px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    }
    
    .carousel-arrow svg {
      width: 18px;
      height: 18px;
    }
    
    .common-foods-grid {
      padding: var(--spacing-xs) 0;
    }
    
    /* Make scrollbar more visible on mobile */
    .common-foods-grid {
      scrollbar-width: auto;
      scrollbar-color: var(--text-secondary) transparent;
    }
    
    .common-foods-grid::-webkit-scrollbar {
      height: 8px;
    }
    
    .common-foods-grid::-webkit-scrollbar-thumb {
      background-color: var(--text-secondary);
    }
  }
  
  .common-food-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: var(--spacing-sm);
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    transition: all 0.2s;
    position: relative;
    flex: 0 0 auto;
    min-width: 200px;
    max-width: 200px;
  }
  
  @media (max-width: 768px) {
    .common-food-card {
      min-width: 150px;
      max-width: 150px;
    }
  }
  
  .common-food-card:hover {
    background-color: var(--surface-elevated);
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }
  
  .common-food-info {
    flex: 1;
    margin-bottom: var(--spacing-xs);
  }
  
  .common-food-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
    margin-bottom: var(--spacing-xs);
    word-break: break-word;
  }
  
  .common-food-brand {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
  }
  
  .common-food-serving {
    margin: var(--spacing-xs) 0;
  }
  
  .serving-inputs {
    display: flex;
    gap: var(--spacing-xs);
    align-items: center;
  }
  
  .serving-amount {
    flex: 2;
    min-width: 80px;
    padding: var(--spacing-xs);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    background-color: var(--input-background);
    color: var(--text-primary);
    font-size: 0.75rem;
  }
  
  .serving-amount:focus {
    border-color: var(--primary-color);
    outline: none;
  }
  
  .serving-unit {
    flex: 0 0 auto;
    min-width: 50px;
    width: auto;
    padding: var(--spacing-xs);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    background-color: var(--input-background);
    color: var(--text-primary);
    font-size: 0.75rem;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
  }
  
  .serving-unit:focus {
    border-color: var(--primary-color);
    outline: none;
  }
  
  .serving-unit option {
    background-color: var(--surface);
    color: var(--text-primary);
  }
  
  .common-food-macros {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
    padding-top: var(--spacing-xs);
    border-top: 1px solid var(--border);
    font-size: 0.7rem;
  }
  
  .macro-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-xs);
  }
  
  .macro-label {
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  .macro-value {
    font-weight: 600;
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
  
  .common-food-actions {
    display: flex;
    gap: var(--spacing-xs);
    justify-content: flex-end;
    align-items: center;
    margin-top: var(--spacing-xs);
    padding-top: var(--spacing-xs);
    border-top: 1px solid var(--border);
  }
  
  .add-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-right: auto;
  }
  
  .add-btn:hover {
    background-color: var(--primary-hover);
  }
  
  .favorite-btn,
  .remove-btn {
    padding: var(--spacing-xs);
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius-sm);
    transition: all 0.2s;
  }
  
  .favorite-btn:hover {
    color: #f59e0b;
    background-color: rgba(245, 158, 11, 0.1);
  }
  
  .favorite-btn.favorited {
    color: #f59e0b;
  }
  
  .remove-btn:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
  }
</style>
