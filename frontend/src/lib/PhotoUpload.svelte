<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import 'cropperjs/dist/cropper.css';

  export let currentPhotoUrl = null;
  export let photoMimeType = null;
  export let goalPhotoUrl = null; // AI goal photo URL
  
  const dispatch = createEventDispatcher();
  
  let previewUrl = null;
  let fileInput;
  let imageElement;
  let cropper = null;
  let showCropModal = false;
  let selectedFile = null;
  let CropperLib = null;
  let showingGoalPhoto = false;
  let lastTapTime = 0;
  let touchHandled = false;
  
  async function loadCropper() {
    if (!CropperLib) {
      const module = await import('cropperjs');
      CropperLib = module.default;
    }
    return CropperLib;
  }
  
  async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      selectedFile = file;
      const reader = new FileReader();
      reader.onload = async (e) => {
        previewUrl = e.target.result;
        showCropModal = true;
        // Load cropper library
        await loadCropper();
        // Initialize cropper after modal is shown and library is loaded
        setTimeout(() => {
          if (imageElement && !cropper && CropperLib) {
            cropper = new CropperLib(imageElement, {
              aspectRatio: NaN, // Allow free aspect ratio
              viewMode: 1,
              dragMode: 'move',
              autoCropArea: 0.35, // Start with 35% crop area - tighter crop matching saved photos (torso/head only)
              restore: false,
              guides: true,
              center: true,
              highlight: false,
              cropBoxMovable: true,
              cropBoxResizable: true,
              toggleDragModeOnDblclick: false,
              ready: function() {
                // Increase crop box size by 12px in both dimensions after initialization
                if (cropper) {
                  const cropBoxData = cropper.getCropBoxData();
                  const imageData = cropper.getImageData();
                  
                  // Calculate 12px as a percentage of the displayed image size
                  const widthPercent = 12 / imageData.width;
                  const heightPercent = 12 / imageData.height;
                  
                  // Increase crop box by equivalent of 12px
                  const newWidth = cropBoxData.width + (imageData.width * widthPercent);
                  const newHeight = cropBoxData.height + (imageData.height * heightPercent);
                  
                  // Ensure we don't exceed image bounds
                  const maxWidth = imageData.width;
                  const maxHeight = imageData.height;
                  
                  // Adjust position to keep it centered
                  const widthDiff = newWidth - cropBoxData.width;
                  const heightDiff = newHeight - cropBoxData.height;
                  
                  cropper.setCropBoxData({
                    width: Math.min(newWidth, maxWidth),
                    height: Math.min(newHeight, maxHeight),
                    left: Math.max(0, cropBoxData.left - widthDiff / 2),
                    top: Math.max(0, cropBoxData.top - heightDiff / 2),
                  });
                }
              },
            });
          }
        }, 100);
      };
      reader.readAsDataURL(file);
    }
  }
  
  function applyCrop() {
    if (cropper) {
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 1920,
        maxHeight: 1920,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      
      canvas.toBlob((blob) => {
        const croppedFile = new File([blob], selectedFile.name, {
          type: selectedFile.type,
          lastModified: Date.now(),
        });
        
        // Create preview URL
        const reader = new FileReader();
        reader.onload = (e) => {
          previewUrl = e.target.result;
        };
        reader.readAsDataURL(blob);
        
        dispatch('photoSelected', croppedFile);
        closeCropModal();
      }, selectedFile.type, 0.95);
    }
  }
  
  function closeCropModal() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    showCropModal = false;
    selectedFile = null;
    fileInput.value = '';
  }
  
  function triggerFileInput() {
    fileInput.click();
  }
  
  function removePhoto() {
    previewUrl = null;
    currentPhotoUrl = null;
    photoMimeType = null;
    fileInput.value = '';
    dispatch('photoRemoved');
  }
  
  onMount(() => {
    return () => {
      if (cropper) {
        cropper.destroy();
      }
    };
  });
  
  $: displayUrl = previewUrl || currentPhotoUrl;
  $: showGoalPhoto = goalPhotoUrl && showingGoalPhoto;
  $: finalDisplayUrl = showGoalPhoto ? goalPhotoUrl : displayUrl;
  
  function handleMouseEnter() {
    if (goalPhotoUrl && displayUrl) {
      showingGoalPhoto = true;
    }
  }
  
  function handleMouseLeave() {
    showingGoalPhoto = false;
  }
  
  function handlePhotoTap(event) {
    // Don't handle if clicking on buttons
    const target = event.target;
    if (target.closest('.remove-btn') || target.closest('.change-btn')) {
      return;
    }
    
    // Prevent double-firing: if this is a click event right after a touch, ignore it
    const now = Date.now();
    if (event.type === 'click' && now - lastTapTime < 300) {
      return;
    }
    
    // Simple toggle - works for both touch and click
    if (goalPhotoUrl && displayUrl) {
      if (event.type === 'touchstart') {
        event.preventDefault();
        lastTapTime = now;
        touchHandled = true;
      }
      showingGoalPhoto = !showingGoalPhoto;
    }
  }
  
</script>

<div class="photo-upload">
  <label class="section-label">
    <svg class="label-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
    Photo
  </label>
  <div class="photo-container">
    {#if displayUrl}
      <div 
        class="photo-preview"
        role="button"
        tabindex="0"
        aria-label={showingGoalPhoto ? "Tap to show actual photo" : "Tap to show AI goal photo"}
        on:mouseenter={handleMouseEnter}
        on:mouseleave={handleMouseLeave}
        on:click={handlePhotoTap}
        on:touchstart={handlePhotoTap}
        on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { handlePhotoTap(e); } }}
      >
        <img 
          src={finalDisplayUrl} 
          alt={showingGoalPhoto ? "AI goal photo" : "Daily progress photo"}
          role="presentation"
          class="photo-image"
        />
        {#if showGoalPhoto && goalPhotoUrl}
          <div class="goal-photo-indicator">AI Goal</div>
        {/if}
        <button 
          type="button" 
          class="remove-btn" 
          on:click|stopPropagation={removePhoto}
        >Remove</button>
        <button 
          type="button" 
          class="change-btn" 
          on:click|stopPropagation={triggerFileInput}
        >Change Photo</button>
      </div>
    {:else}
      <button 
        type="button" 
        class="photo-placeholder" 
        on:click={triggerFileInput}
        aria-label="Upload photo"
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <p>Tap to upload photo</p>
      </button>
    {/if}
    <input
      type="file"
      accept="image/*"
      bind:this={fileInput}
      on:change={handleFileSelect}
      style="display: none;"
    />
  </div>
</div>

{#if showCropModal}
  <div class="crop-modal" on:click|self={closeCropModal}>
    <div class="crop-modal-content" on:click|stopPropagation>
      <div class="crop-header">
        <h3>Crop Photo</h3>
        <button type="button" class="close-btn" on:click={closeCropModal}>×</button>
      </div>
      <div class="crop-container">
        <img bind:this={imageElement} src={previewUrl} alt="Crop" style="max-width: 100%; max-height: 70vh;" />
      </div>
      <div class="crop-actions">
        <button type="button" class="cancel-btn" on:click={closeCropModal}>Cancel</button>
        <button type="button" class="apply-btn" on:click={applyCrop}>Apply Crop</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .photo-upload {
    margin-bottom: var(--spacing-md);
  }

  .section-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
  }

  .label-icon {
    color: var(--primary-color);
    flex-shrink: 0;
  }
  
  .photo-container {
    width: 100%;
  }
  
  .photo-preview {
    position: relative;
    width: 100%;
  }
  
  .photo-preview {
    position: relative;
    touch-action: pan-y; /* Allow vertical scrolling, prevent horizontal scrolling */
  }
  
  .photo-preview {
    position: relative;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: pan-y; /* Allow vertical scrolling, prevent horizontal scrolling */
  }
  
  .photo-preview img,
  .photo-image {
    width: 100%;
    height: auto;
    max-height: 500px;
    border-radius: var(--border-radius);
    display: block;
    object-fit: contain;
    transition: opacity 0.3s ease;
    user-select: none;
    -webkit-user-select: none;
    pointer-events: none; /* Let touch events pass through to parent */
    -webkit-tap-highlight-color: transparent;
  }
  
  .photo-preview:active .photo-image {
    opacity: 0.8;
  }
  
  @media (hover: hover) {
    .photo-preview:hover .photo-image {
      opacity: 0.9;
    }
  }
  
  .goal-photo-indicator {
    position: absolute;
    top: var(--spacing-sm);
    left: var(--spacing-sm);
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    color: white;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    font-weight: 700;
    z-index: 10;
    box-shadow: var(--shadow);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .remove-btn, .change-btn {
    position: absolute;
    top: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.875rem;
    background-color: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--shadow);
    transition: all 0.2s ease;
    z-index: 20;
    pointer-events: auto;
    -webkit-tap-highlight-color: rgba(255, 255, 255, 0.2);
  }

  .remove-btn:hover, .change-btn:hover {
    background-color: rgba(15, 23, 42, 0.95);
    transform: translateY(-1px);
    box-shadow: var(--shadow-lg);
  }
  
  .remove-btn {
    right: var(--spacing-sm);
  }
  
  .change-btn {
    right: calc(var(--spacing-sm) + 80px);
  }
  
  .photo-placeholder {
    border: 2px dashed var(--border);
    border-radius: var(--border-radius);
    padding: var(--spacing-xl);
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: var(--surface);
    width: 100%;
    font-family: inherit;
    box-shadow: var(--shadow-sm);
  }
  
  .photo-placeholder:hover {
    border-color: var(--primary-color);
    background-color: var(--surface-elevated);
    box-shadow: var(--shadow);
    transform: translateY(-2px);
  }
  
  .photo-placeholder svg {
    color: var(--primary-color);
    margin-bottom: var(--spacing-sm);
    transition: transform 0.2s ease;
  }

  .photo-placeholder:hover svg {
    transform: translateY(-2px);
  }
  
  .photo-placeholder p {
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .crop-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--spacing-md);
  }
  
  .crop-modal-content {
    background: white;
    border-radius: var(--border-radius);
    width: 100%;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .crop-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border);
  }
  
  .crop-header h3 {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    color: var(--text-primary);
    background-color: var(--surface);
    border-radius: 4px;
  }
  
  .crop-container {
    padding: var(--spacing-md);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: auto;
    flex: 1;
  }
  
  .crop-actions {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-top: 1px solid var(--border);
    justify-content: flex-end;
  }
  
  .cancel-btn {
    background-color: var(--surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }
  
  .cancel-btn:hover {
    background-color: var(--border);
  }
  
  .apply-btn {
    background-color: var(--primary-color);
    color: white;
  }
  
  .apply-btn:hover {
    background-color: #1d4ed8;
  }
</style>
