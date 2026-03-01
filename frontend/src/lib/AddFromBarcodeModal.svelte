<script>
  import { createEventDispatcher } from 'svelte';
  import { createCustomFood, checkCustomFoodDuplicates } from './api.js';
  import { parseNutritionLabel } from './utils/parseNutritionLabel.js';
  import { createWorker } from 'tesseract.js';
  import CustomFoodForm from './CustomFoodForm.svelte';

  const dispatch = createEventDispatcher();

  export let barcode = '';
  export let visible = false;

  let step = 1; // 1=add?, 2=how?, 3a=ocr form, 3b=manual form
  let mode = null; // 'camera' | 'manual'
  let ocrParsed = null;
  let ocrRawText = '';
  let ocrError = null;
  let ocrLoading = false;

  let name = '';
  let brand = '';
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

  const fileInputId = 'add-from-barcode-file';

  function reset() {
    step = 1;
    mode = null;
    ocrParsed = null;
    ocrRawText = '';
    ocrError = null;
    ocrLoading = false;
    name = '';
    brand = '';
    servingSize = '100';
    servingUnit = 'g';
    calories = '';
    protein = '';
    fat = '';
    carbs = '';
    submitting = false;
    error = null;
    duplicateMatches = [];
    showDuplicatePrompt = false;
  }

  function handleNo() {
    reset();
    dispatch('cancel');
  }

  function handleYes() {
    step = 2;
  }

  function chooseCamera() {
    mode = 'camera';
    step = 3;
    ocrError = null;
    document.getElementById(fileInputId)?.click();
  }

  function chooseManual() {
    mode = 'manual';
    step = 3;
  }

  function prepareImage(img, mode) {
    const targetWidth = 2000;
    const scale = Math.max(1, targetWidth / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    if (mode === 'grayscale') {
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        d[i] = d[i + 1] = d[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (mode === 'binarize') {
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < d.length; i += 4) {
        const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        d[i] = d[i + 1] = d[i + 2] = gray;
        histogram[gray]++;
      }
      const totalPixels = w * h;
      let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * histogram[i];
      let sumB = 0, wB = 0, wF = 0, maxVar = 0, threshold = 128;
      for (let i = 0; i < 256; i++) {
        wB += histogram[i];
        if (wB === 0) continue;
        wF = totalPixels - wB;
        if (wF === 0) break;
        sumB += i * histogram[i];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const v = wB * wF * (mB - mF) * (mB - mF);
        if (v > maxVar) { maxVar = v; threshold = i; }
      }
      for (let i = 0; i < d.length; i += 4) {
        const bw = d[i] < threshold ? 0 : 255;
        d[i] = d[i + 1] = d[i + 2] = bw;
      }
      ctx.putImageData(imgData, 0, 0);
      console.log('[OCR] Otsu threshold:', threshold);
    }
    return canvas;
  }

  async function runOcrPass(worker, canvas) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const { data: { text } } = await worker.recognize(blob);
    return text || '';
  }

  async function handleFileChange(e) {
    const file = e.target?.files?.[0];
    e.target.value = '';
    if (!file) return;

    ocrLoading = true;
    ocrError = null;
    ocrParsed = null;
    ocrRawText = '';

    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Failed to load image'));
        i.src = URL.createObjectURL(file);
      });

      const worker = await createWorker('eng');
      await worker.setParameters({ tessedit_pageseg_mode: '6' });

      // Pass 1: raw upscaled image (no processing — best for large bold text like Calories)
      const rawCanvas = prepareImage(img, 'raw');
      const text0 = await runOcrPass(worker, rawCanvas);
      console.log('[OCR] pass 1 (raw):', text0);
      const parsed0 = parseNutritionLabel(text0);

      // Pass 2: grayscale (good for medium text)
      let text1 = '';
      let parsed1 = null;
      const need1 = parsed0.calories == null || parsed0.protein == null ||
                    parsed0.fat == null || parsed0.carbs == null;
      if (need1) {
        const grayCanvas = prepareImage(img, 'grayscale');
        text1 = await runOcrPass(worker, grayCanvas);
        console.log('[OCR] pass 2 (grayscale):', text1);
        parsed1 = parseNutritionLabel(text1);
      }

      // Pass 3: binarized (good for fine print / low-contrast)
      let text2 = '';
      let parsed2 = null;
      const need2 = (parsed0.calories ?? parsed1?.calories) == null ||
                    (parsed0.protein ?? parsed1?.protein) == null ||
                    (parsed0.fat ?? parsed1?.fat) == null ||
                    (parsed0.carbs ?? parsed1?.carbs) == null;
      if (need2) {
        const binCanvas = prepareImage(img, 'binarize');
        text2 = await runOcrPass(worker, binCanvas);
        console.log('[OCR] pass 3 (binarized):', text2);
        parsed2 = parseNutritionLabel(text2);
      }

      await worker.terminate();
      URL.revokeObjectURL(img.src);

      // Merge: first non-null wins across all passes
      const merged = {
        calories: parsed0.calories ?? parsed1?.calories ?? parsed2?.calories ?? null,
        protein: parsed0.protein ?? parsed1?.protein ?? parsed2?.protein ?? null,
        fat: parsed0.fat ?? parsed1?.fat ?? parsed2?.fat ?? null,
        carbs: parsed0.carbs ?? parsed1?.carbs ?? parsed2?.carbs ?? null,
        servingSize: parsed0.servingSize ?? parsed1?.servingSize ?? parsed2?.servingSize ?? 100,
        servingUnit: parsed0.servingUnit || parsed1?.servingUnit || parsed2?.servingUnit || 'g',
      };

      ocrRawText = text0 + (text1 ? '\n--- pass 2 ---\n' + text1 : '') + (text2 ? '\n--- pass 3 ---\n' + text2 : '');
      ocrParsed = merged;
      servingSize = String(merged.servingSize ?? 100);
      servingUnit = merged.servingUnit || 'g';
      if (merged.calories != null) calories = String(merged.calories);
      if (merged.protein != null) protein = String(merged.protein);
      if (merged.fat != null) fat = String(merged.fat);
      if (merged.carbs != null) carbs = String(merged.carbs);
    } catch (err) {
      console.error('[OCR] error:', err);
      ocrError = err.message || 'OCR failed. Please enter values manually.';
    } finally {
      ocrLoading = false;
    }
  }

  function getPayload() {
    return {
      name: (name || '').trim(),
      brand: (brand || '').trim() || undefined,
      barcode: (barcode || '').trim() || undefined,
      serving_size: parseFloat(servingSize) || 100,
      serving_unit: servingUnit,
      calories: parseFloat(calories) ?? 0,
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
      error = 'Calories is required';
      return;
    }
    const ss = parseFloat(servingSize);
    if (isNaN(ss) || ss <= 0) {
      error = 'Serving size is required';
      return;
    }

    error = null;
    showDuplicatePrompt = false;
    duplicateMatches = [];
    submitting = true;

    try {
      const { matches } = await checkCustomFoodDuplicates({ name: n, barcode: (barcode || '').trim() });
      if (matches?.length > 0) {
        duplicateMatches = matches;
        showDuplicatePrompt = true;
        submitting = false;
        return;
      }
      await doCreate();
    } catch (e) {
      error = e.message || 'Failed to create';
    } finally {
      if (!showDuplicatePrompt) submitting = false;
    }
  }

  async function doCreate() {
    const p = getPayload();
    try {
      const created = await createCustomFood(p, { universal: true });
      showDuplicatePrompt = false;
      duplicateMatches = [];
      reset();
      dispatch('created', created);
    } catch (e) {
      error = e.message || 'Failed to create';
    } finally {
      submitting = false;
    }
  }

  function useExisting(m) {
    showDuplicatePrompt = false;
    duplicateMatches = [];
    reset();
    dispatch('created', {
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
    });
  }

  function createAnyway() {
    showDuplicatePrompt = false;
    duplicateMatches = [];
    doCreate();
  }

  function backToForm() {
    showDuplicatePrompt = false;
    duplicateMatches = [];
  }

  function back() {
    if (step === 2) {
      step = 1;
      mode = null;
    } else if (step === 3) {
      step = 2;
      mode = null;
      ocrParsed = null;
      ocrRawText = '';
      ocrError = null;
    }
  }
</script>

<input
  id={fileInputId}
  type="file"
  accept="image/*"
  capture="environment"
  on:change={handleFileChange}
  style="display: none"
  aria-hidden="true"
/>

{#if visible}
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-barcode-title">
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="add-barcode-title">Barcode not found</h3>
        <button type="button" class="close-btn" on:click={handleNo} aria-label="Close">×</button>
      </div>

      {#if step === 1}
        <div class="modal-body">
          <p>Add this barcode (UPC {barcode}) to the shared library so you and others can use it?</p>
          <div class="actions">
            <button type="button" class="btn secondary" on:click={handleNo}>No</button>
            <button type="button" class="btn primary" on:click={handleYes}>Yes, add it</button>
          </div>
        </div>
      {:else if step === 2}
        <div class="modal-body">
          <p>How would you like to add the nutrition details?</p>
          <div class="choice-buttons">
            <button type="button" class="btn choice-btn" on:click={chooseCamera}>
              <span class="choice-icon">📷</span>
              <span>Scan nutrition label</span>
              <span class="choice-hint">Take a photo of the label; we'll try to read the macros</span>
            </button>
            <button type="button" class="btn choice-btn" on:click={chooseManual}>
              <span class="choice-icon">✏️</span>
              <span>Enter manually</span>
              <span class="choice-hint">Type in the nutrition facts</span>
            </button>
          </div>
          <button type="button" class="btn secondary back-btn" on:click={back}>Back</button>
        </div>
      {:else if step === 3 && mode === 'manual'}
        <div class="modal-body">
          <p class="hint">Barcode {barcode} will be saved to the shared library. Enter the nutrition info below.</p>
          <CustomFoodForm
            initialName=""
            initialBarcode={barcode}
            universal={true}
            visible={true}
            on:created={(e) => { reset(); dispatch('created', e.detail); }}
            on:cancel={back}
          />
        </div>
      {:else if step === 3 && mode === 'camera'}
        <div class="modal-body form-body">
          {#if ocrLoading}
            <div class="ocr-loading">
              <div class="spinner"></div>
              <p>Reading label… this may take a few seconds</p>
            </div>
          {:else if !ocrParsed && !ocrError}
            <p class="hint">Take a photo of the nutrition label. We'll read what we can, then you review and edit.</p>
            <div class="actions">
              <button type="button" class="btn secondary" on:click={back}>Back</button>
              <button type="button" class="btn primary" on:click={() => document.getElementById(fileInputId)?.click()}>
                Take photo
              </button>
            </div>
          {:else}
            {#if ocrError}
              <p class="ocr-error">{ocrError}</p>
            {/if}

            {#if ocrParsed && (ocrParsed.calories != null || ocrParsed.protein != null || ocrParsed.fat != null || ocrParsed.carbs != null)}
              <p class="ocr-success">Read from label — review and fix anything missing:</p>
            {:else}
              <p class="ocr-warn">Could not read values automatically. Please fill in below.</p>
            {/if}

            {#if ocrRawText}
              <details class="ocr-raw">
                <summary>Show raw OCR text</summary>
                <pre>{ocrRawText}</pre>
              </details>
            {/if}

            <button type="button" class="btn small retake-btn" on:click={() => document.getElementById(fileInputId)?.click()}>
              Retake photo
            </button>

            {#if showDuplicatePrompt && duplicateMatches.length > 0}
              <div class="duplicate-prompt">
                <p class="dup-heading">Possible duplicates</p>
                <ul class="dup-list">
                  {#each duplicateMatches as m}
                    <li>
                      <span>{m.name}{#if m.brand} ({m.brand}){/if}</span>
                      <button type="button" class="btn small" on:click={() => useExisting(m)}>Use this</button>
                    </li>
                  {/each}
                </ul>
                <div class="dup-actions">
                  <button type="button" class="btn secondary" on:click={backToForm}>Back</button>
                  <button type="button" class="btn primary" on:click={createAnyway} disabled={submitting}>Create anyway</button>
                </div>
              </div>
            {:else}
              <form on:submit|preventDefault={handleSubmit} class="add-form">
                <div class="field">
                  <label for="ab-name">Name *</label>
                  <input id="ab-name" type="text" bind:value={name} placeholder="Product name" required />
                </div>
                <div class="field">
                  <label for="ab-brand">Brand (optional)</label>
                  <input id="ab-brand" type="text" bind:value={brand} placeholder="Brand name" />
                </div>
                <div class="field row">
                  <label for="ab-serving">1 serving =</label>
                  <input id="ab-serving" type="number" bind:value={servingSize} min="0.1" step="0.1" placeholder="33" />
                  <select bind:value={servingUnit} aria-label="Serving unit">
                    <option value="g">g</option>
                    <option value="oz">oz</option>
                  </select>
                </div>
                <div class="field">
                  <label for="ab-cal">Calories per serving *</label>
                  <input id="ab-cal" type="number" bind:value={calories} min="0" step="1" placeholder="0" required />
                </div>
                <div class="field row three">
                  <div>
                    <label for="ab-protein">Protein (g)</label>
                    <input id="ab-protein" type="number" bind:value={protein} min="0" step="0.1" placeholder="—" />
                  </div>
                  <div>
                    <label for="ab-fat">Fat (g)</label>
                    <input id="ab-fat" type="number" bind:value={fat} min="0" step="0.1" placeholder="—" />
                  </div>
                  <div>
                    <label for="ab-carbs">Carbs (g)</label>
                    <input id="ab-carbs" type="number" bind:value={carbs} min="0" step="0.1" placeholder="—" />
                  </div>
                </div>
                {#if error}
                  <div class="error">{error}</div>
                {/if}
                <div class="actions">
                  <button type="button" class="btn secondary" on:click={back}>Back</button>
                  <button type="submit" class="btn primary" disabled={submitting}>
                    {submitting ? 'Creating…' : 'Create & add'}
                  </button>
                </div>
              </form>
            {/if}
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--spacing-md);
  }
  .modal-content {
    background: var(--surface-elevated);
    border-radius: var(--border-radius);
    max-width: 420px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border);
  }
  .modal-header h3 {
    margin: 0;
    font-size: 1.125rem;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
  }
  .close-btn:hover {
    color: var(--text-primary);
  }
  .modal-body {
    padding: var(--spacing-md);
  }
  .modal-body p {
    margin: 0 0 var(--spacing-md);
    color: var(--text-secondary);
  }
  .hint, .ocr-success {
    font-size: 0.875rem;
    color: var(--text-muted);
  }
  .ocr-warn {
    font-size: 0.875rem;
    color: #fbbf24;
    margin-bottom: var(--spacing-sm);
  }
  .ocr-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-lg) 0;
    color: var(--primary-color);
  }
  .ocr-loading .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .ocr-error {
    color: #f87171;
    margin-bottom: var(--spacing-sm);
  }
  .ocr-raw {
    margin-bottom: var(--spacing-md);
    font-size: 0.75rem;
  }
  .ocr-raw summary {
    cursor: pointer;
    color: var(--text-muted);
    margin-bottom: var(--spacing-xs);
  }
  .ocr-raw pre {
    max-height: 120px;
    overflow-y: auto;
    background: var(--surface);
    padding: var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    border: 1px solid var(--border);
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-secondary);
    font-size: 0.75rem;
  }
  .retake-btn {
    margin-bottom: var(--spacing-md);
    background: var(--surface);
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }
  .choice-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }
  .choice-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    padding: var(--spacing-md);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    background: var(--surface);
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .choice-btn:hover {
    border-color: var(--primary-color);
  }
  .choice-icon {
    font-size: 1.5rem;
    margin-bottom: var(--spacing-xs);
  }
  .choice-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: var(--spacing-xs);
  }
  .back-btn {
    margin-top: var(--spacing-sm);
  }
  .actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
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
  .btn.small {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.8125rem;
  }
  .add-form {
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
  .field.row {
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-sm);
  }
  .field.row label {
    flex-shrink: 0;
  }
  .field.row input,
  .field.row select {
    flex: 1;
    min-width: 60px;
  }
  .field.row.three {
    flex-wrap: wrap;
  }
  .field.row.three > div {
    flex: 1;
    min-width: 80px;
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
  .duplicate-prompt {
    padding: var(--spacing-sm) 0;
  }
  .dup-heading {
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }
  .dup-list {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--spacing-md);
  }
  .dup-list li {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
    background: var(--surface);
    border-radius: var(--border-radius-sm);
  }
  .dup-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
  }
  .error {
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    padding: var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
  }
</style>
