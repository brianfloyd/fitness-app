<script>
  import { onMount } from 'svelte';
  import { getSettings, updateSettings, getGoalPhotoUrl } from '../lib/api.js';
  
  let loading = true;
  let saving = false;
  let error = null;
  let success = false;
  
  let totalDays = 84;
  let startDate = new Date().toISOString().split('T')[0];
  let goalPhotoFile = null;
  let goalPhotoPreview = null;
  let goalPhotoUrl = null;
  let hasGoalPhoto = false;
  let goalFileInput;
  let goalImageElement;
  let goalCropper = null;
  let showGoalCropModal = false;
  let goalSelectedFile = null;
  let GoalCropperLib = null;
  
  async function loadSettings() {
    try {
      loading = true;
      const settings = await getSettings();
      totalDays = settings.total_days || 84;
      startDate = settings.start_date || new Date().toISOString().split('T')[0];
      hasGoalPhoto = settings.has_goal_photo || false;
      
      if (hasGoalPhoto) {
        goalPhotoUrl = getGoalPhotoUrl();
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      error = 'Failed to load settings';
    } finally {
      loading = false;
    }
  }
  
  async function loadGoalCropper() {
    if (!GoalCropperLib) {
      const module = await import('cropperjs');
      GoalCropperLib = module.default;
      // Also load CSS if not already loaded
      if (!document.querySelector('link[href*="cropper.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/node_modules/cropperjs/dist/cropper.css';
        document.head.appendChild(link);
      }
    }
    return GoalCropperLib;
  }

  async function handleGoalPhotoSelect(event) {
    const file = event.target.files[0];
    if (file) {
      goalSelectedFile = file;
      const reader = new FileReader();
      reader.onload = async (e) => {
        goalPhotoPreview = e.target.result;
        showGoalCropModal = true;
        // Load cropper library
        await loadGoalCropper();
        // Initialize cropper after modal is shown and library is loaded
        setTimeout(() => {
          if (goalImageElement && !goalCropper && GoalCropperLib) {
            goalCropper = new GoalCropperLib(goalImageElement, {
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
                if (goalCropper) {
                  const cropBoxData = goalCropper.getCropBoxData();
                  const imageData = goalCropper.getImageData();
                  
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
                  
                  goalCropper.setCropBoxData({
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

  function applyGoalCrop() {
    if (goalCropper && goalSelectedFile) {
      // Store file info before closing modal
      const fileName = goalSelectedFile.name;
      const fileType = goalSelectedFile.type;
      
      const canvas = goalCropper.getCroppedCanvas({
        maxWidth: 1920,
        maxHeight: 1920,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      
      if (!canvas) {
        console.error('Failed to create cropped canvas');
        return;
      }
      
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          return;
        }
        
        const croppedFile = new File([blob], fileName, {
          type: fileType,
          lastModified: Date.now(),
        });
        
        // Set the cropped file
        goalPhotoFile = croppedFile;
        
        // Create preview URL
        const reader = new FileReader();
        reader.onload = (e) => {
          goalPhotoPreview = e.target.result;
        };
        reader.readAsDataURL(croppedFile);
        
        // Close modal after blob is created
        closeGoalCropModal();
      }, fileType, 0.95);
    }
  }

  function closeGoalCropModal() {
    if (goalCropper) {
      goalCropper.destroy();
      goalCropper = null;
    }
    showGoalCropModal = false;
    goalSelectedFile = null;
    if (goalFileInput) {
      goalFileInput.value = '';
    }
  }
  
  async function removeGoalPhoto() {
    try {
      const response = await fetch('/api/settings/goal-photo', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        goalPhotoFile = null;
        goalPhotoPreview = null;
        goalPhotoUrl = null;
        hasGoalPhoto = false;
        if (goalFileInput) {
          goalFileInput.value = '';
        }
      } else {
        error = 'Failed to remove goal photo';
      }
    } catch (err) {
      console.error('Error removing goal photo:', err);
      error = 'Failed to remove goal photo';
    }
  }
  
  function triggerGoalPhotoInput() {
    goalFileInput.click();
  }
  
  async function handleSave() {
    try {
      saving = true;
      error = null;
      success = false;
      
      const result = await updateSettings(
        { total_days: totalDays, start_date: startDate },
        goalPhotoFile
      );
      
      // Update goal photo URL if photo was uploaded
      if (goalPhotoFile && result.has_goal_photo) {
        goalPhotoUrl = getGoalPhotoUrl();
        hasGoalPhoto = true;
        goalPhotoFile = null;
        goalPhotoPreview = null;
      } else if (!goalPhotoFile && result.has_goal_photo) {
        goalPhotoUrl = getGoalPhotoUrl();
        hasGoalPhoto = true;
      }
      
      success = true;
      setTimeout(() => { success = false; }, 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      error = 'Failed to save settings';
    } finally {
      saving = false;
    }
  }
  
  onMount(() => {
    loadSettings();
    
    return () => {
      if (goalCropper) {
        goalCropper.destroy();
      }
    };
  });
</script>

<div class="settings-panel">
  <div class="card">
    <h2>Settings</h2>
    
    {#if loading}
      <div class="loading">Loading settings...</div>
    {:else}
      <div class="form-section">
        <label for="total-days">Total Days</label>
        <input
          id="total-days"
          type="number"
          min="1"
          bind:value={totalDays}
          placeholder="84"
        />
        <p class="help-text">Total number of days in your tracking period (e.g., 84 for 12 weeks)</p>
      </div>
      
      <div class="form-section">
        <label for="start-date">Start Date</label>
        <input
          id="start-date"
          type="date"
          bind:value={startDate}
        />
        <p class="help-text">The first day of your tracking period</p>
      </div>
      
      <div class="form-section">
        <label>AI Goal Photo</label>
        <div class="goal-photo-upload">
          {#if goalPhotoPreview || goalPhotoUrl}
            <div class="goal-photo-preview">
              <img src={goalPhotoPreview || goalPhotoUrl} alt="" role="presentation" />
              <button type="button" class="remove-goal-photo-btn" on:click={removeGoalPhoto}>Remove</button>
              <button type="button" class="change-goal-photo-btn" on:click={triggerGoalPhotoInput}>Change Photo</button>
            </div>
          {:else}
            <button 
              type="button" 
              class="goal-photo-placeholder" 
              on:click={triggerGoalPhotoInput}
              aria-label="Upload AI goal photo"
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p>Upload AI goal photo</p>
            </button>
          {/if}
          <input
            type="file"
            accept="image/*"
            bind:this={goalFileInput}
            on:change={handleGoalPhotoSelect}
            style="display: none;"
          />
        </div>
        <p class="help-text">Upload your AI goal photo to compare with daily photos</p>
      </div>
      
      {#if showGoalCropModal}
        <div 
          class="crop-modal" 
          role="dialog"
          aria-modal="true"
          aria-labelledby="crop-modal-title"
          on:click|self={closeGoalCropModal}
          on:keydown={(e) => e.key === 'Escape' && closeGoalCropModal()}
        >
          <div class="crop-modal-content" on:click|stopPropagation role="document">
            <div class="crop-header">
              <h3 id="crop-modal-title">Crop Goal Photo</h3>
              <button 
                type="button" 
                class="close-btn" 
                on:click={closeGoalCropModal}
                aria-label="Close crop modal"
              >×</button>
            </div>
            <div class="crop-container">
              <img bind:this={goalImageElement} src={goalPhotoPreview} alt="" role="presentation" style="max-width: 100%; max-height: 70vh;" />
            </div>
            <div class="crop-actions">
              <button type="button" class="cancel-btn" on:click={closeGoalCropModal}>Cancel</button>
              <button type="button" class="apply-btn" on:click={applyGoalCrop}>Apply Crop</button>
            </div>
          </div>
        </div>
      {/if}
      
      {#if error}
        <div class="error-message">{error}</div>
      {/if}
      
      {#if success}
        <div class="success-message">Settings saved successfully!</div>
      {/if}
      
      <button type="button" on:click={handleSave} disabled={saving} class="save-btn">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    {/if}
  </div>
</div>

<style>
  .settings-panel {
    max-width: 600px;
    margin: 0 auto;
  }
  
  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: var(--spacing-lg);
    color: var(--text-primary);
  }
  
  .form-section {
    margin-bottom: var(--spacing-lg);
  }
  
  .help-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
  }
  
  .save-btn {
    width: 100%;
    padding: var(--spacing-md);
    font-size: 1.125rem;
    font-weight: 600;
  }
  
  .error-message {
    background-color: #fee2e2;
    color: #991b1b;
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
  }
  
  .success-message {
    background-color: #d1fae5;
    color: #065f46;
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
  }

  .goal-photo-upload {
    margin-top: var(--spacing-sm);
  }

  .goal-photo-preview {
    position: relative;
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .goal-photo-preview img {
    width: 100%;
    height: auto;
    max-height: 300px;
    border-radius: var(--border-radius);
    display: block;
    object-fit: contain;
  }

  .remove-goal-photo-btn,
  .change-goal-photo-btn {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.875rem;
    margin-right: var(--spacing-sm);
  }

  .remove-goal-photo-btn {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .change-goal-photo-btn {
    background-color: var(--primary-color);
    color: white;
  }

  .goal-photo-placeholder {
    border: 2px dashed var(--border);
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background-color 0.2s;
    background-color: var(--surface);
    width: 100%;
    background: none;
    font-family: inherit;
  }

  .goal-photo-placeholder:hover {
    border-color: var(--primary-color);
    background-color: rgba(37, 99, 235, 0.05);
  }

  .goal-photo-placeholder svg {
    color: var(--secondary-color);
    margin-bottom: var(--spacing-sm);
  }

  .goal-photo-placeholder p {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  /* Crop Modal Styles */
  .crop-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--spacing-md);
  }

  .crop-modal-content {
    background-color: var(--surface);
    border-radius: var(--border-radius);
    width: 100%;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
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
    font-weight: 600;
    color: var(--text-primary);
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
    border-radius: var(--border-radius);
    transition: background-color 0.2s;
  }

  .close-btn:hover {
    background-color: var(--background);
  }

  .crop-container {
    padding: var(--spacing-md);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: auto;
    flex: 1;
    min-height: 0;
  }

  .crop-actions {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-top: 1px solid var(--border);
    justify-content: flex-end;
  }

  .cancel-btn,
  .apply-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .cancel-btn {
    background-color: var(--background);
    color: var(--text-primary);
  }

  .cancel-btn:hover {
    opacity: 0.8;
  }

  .apply-btn {
    background-color: var(--primary-color);
    color: white;
  }

  .apply-btn:hover {
    opacity: 0.9;
  }
</style>
