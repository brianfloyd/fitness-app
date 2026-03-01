<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { searchFoods, searchFoodsByBarcode, getPreviouslyUsedFoods } from './api.js';
  import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
  import CustomFoodForm from './CustomFoodForm.svelte';
  import AddFromBarcodeModal from './AddFromBarcodeModal.svelte';

  const dispatch = createEventDispatcher();
  
  let searchQuery = '';
  let barcodeQuery = '';
  let searchResults = [];
  let isSearching = false;
  let error = null;
  let searchTimeout = null;
  let previouslyUsedFoods = []; // Array of foods that have been logged before
  let showCustomFoodForm = false;
  let showAddFromBarcodeModal = false;

  // Camera scanning state
  let showCameraModal = false;
  let videoStream = null;
  let videoElement = null;
  let canvasElement = null;
  let scanning = false;
  let barcodeDetector = null;
  let zxingReader = null;
  let scanInterval = null;
  let streamMonitorInterval = null;
  let hasBarcodeDetector = false;
  let useZXing = false;
  let cameraPermissionGranted = false;
  let videoPlaying = false;
  
  // Permission storage key
  const CAMERA_PERMISSION_KEY = 'fitness_app_camera_permission';
  const CAMERA_PERMISSION_TIMESTAMP_KEY = 'fitness_app_camera_permission_timestamp';
  
  // Track if we've already requested permission in this session
  let permissionRequestedThisSession = false;
  
  // Check camera permission status (non-intrusive, doesn't request permission)
  async function checkCameraPermission() {
    // Check localStorage first
    const storedPermission = localStorage.getItem(CAMERA_PERMISSION_KEY);
    const storedTimestamp = localStorage.getItem(CAMERA_PERMISSION_TIMESTAMP_KEY);
    
    // If permission was granted recently (within last 30 days), trust it
    if (storedPermission === 'granted' && storedTimestamp) {
      const timestamp = parseInt(storedTimestamp, 10);
      const daysSinceGranted = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
      if (daysSinceGranted < 30) {
        cameraPermissionGranted = true;
        return 'granted';
      }
    }
    
    // Try Permissions API if available (doesn't trigger prompt)
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' });
        const state = permissionStatus.state;
        cameraPermissionGranted = state === 'granted';
        
        // Update localStorage based on actual browser state
        if (state === 'granted') {
          localStorage.setItem(CAMERA_PERMISSION_KEY, 'granted');
          localStorage.setItem(CAMERA_PERMISSION_TIMESTAMP_KEY, Date.now().toString());
        } else if (state === 'denied') {
          localStorage.setItem(CAMERA_PERMISSION_KEY, 'denied');
        }
        
        // Listen for permission changes
        permissionStatus.onchange = () => {
          cameraPermissionGranted = permissionStatus.state === 'granted';
          if (permissionStatus.state === 'granted') {
            localStorage.setItem(CAMERA_PERMISSION_KEY, 'granted');
            localStorage.setItem(CAMERA_PERMISSION_TIMESTAMP_KEY, Date.now().toString());
          } else if (permissionStatus.state === 'denied') {
            localStorage.setItem(CAMERA_PERMISSION_KEY, 'denied');
          }
        };
        
        return state;
      } catch (e) {
        // Permissions API not supported (e.g., iOS Safari)
        console.debug('Permissions API not supported:', e);
      }
    }
    
    // If we have stored permission, trust it (browser will handle actual permission)
    if (storedPermission === 'granted') {
      cameraPermissionGranted = true;
      return 'granted';
    }
    
    return storedPermission || 'prompt';
  }
  
  // Debounced search - wait 1.5 seconds OR trigger on Enter key
  $: if (searchQuery && searchQuery.length >= 2) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch();
    }, 1500);
  }
  
  function handleSearchKeydown(event) {
    if (event.key === 'Enter' && searchQuery && searchQuery.length >= 2) {
      clearTimeout(searchTimeout);
      performSearch();
    }
  }
  
  async function performSearch() {
    if (!searchQuery || searchQuery.length < 2) {
      searchResults = [];
      return;
    }
    
    try {
      isSearching = true;
      error = null;
      const queryLower = searchQuery.toLowerCase();
      
      // First, find previously used foods that match the search query
      const matchingUsedFoods = previouslyUsedFoods.filter(food => {
        const description = (food.description || '').toLowerCase();
        const brand = (food.brandOwner || '').toLowerCase();
        return description.includes(queryLower) || brand.includes(queryLower);
      });
      
      console.debug('Matching previously used foods:', matchingUsedFoods.length, matchingUsedFoods);
      
      const results = await searchFoods(searchQuery, { pageSize: 20 });
      const apiFoods = results.foods || [];
      const usedFdcIds = new Set(matchingUsedFoods.filter(f => f.fdcId).map(f => f.fdcId));
      const usedCustomIds = new Set(matchingUsedFoods.filter(f => f.customFoodId).map(f => f.customFoodId));
      const apiFdcIds = new Set(apiFoods.filter(f => f.fdcId).map(f => f.fdcId));
      const apiCustomIds = new Set(apiFoods.filter(f => f.customFoodId).map(f => f.customFoodId));

      const usedApiFoods = [];
      const newApiFoods = [];
      apiFoods.forEach(food => {
        const used = (food.fdcId && usedFdcIds.has(food.fdcId)) || (food.customFoodId && usedCustomIds.has(food.customFoodId));
        if (used) usedApiFoods.push(food);
        else newApiFoods.push(food);
      });

      const usedFoodsNotInApi = matchingUsedFoods.filter(f => {
        if (f.fdcId) return !apiFdcIds.has(f.fdcId);
        if (f.customFoodId) return !apiCustomIds.has(f.customFoodId);
        return true;
      });

      searchResults = [...usedApiFoods, ...usedFoodsNotInApi, ...newApiFoods];
    } catch (err) {
      console.error('Error searching foods:', err);
      error = err.message || 'Failed to search foods';
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }
  
  async function handleBarcodeSearch() {
    if (!barcodeQuery || barcodeQuery.length < 8) {
      error = 'Please enter a valid barcode (at least 8 digits)';
      return;
    }
    
    try {
      isSearching = true;
      error = null;
      const results = await searchFoodsByBarcode(barcodeQuery);
      const apiFoods = results.foods || [];
      
      // Prioritize previously used foods for barcode search too
      const usedFoodIds = new Set(previouslyUsedFoods.map(f => f.fdcId));
      const usedApiFoods = apiFoods.filter(food => usedFoodIds.has(food.fdcId));
      const newApiFoods = apiFoods.filter(food => !usedFoodIds.has(food.fdcId));
      
      searchResults = [...usedApiFoods, ...newApiFoods];
      
      if (searchResults.length === 0) {
        showAddFromBarcodeModal = true;
        error = null;
      }
    } catch (err) {
      console.error('Error searching by barcode:', err);
      error = err.message || 'Failed to search by barcode';
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }
  
  // Load previously used foods on mount
  async function loadPreviouslyUsedFoods() {
    try {
      const result = await getPreviouslyUsedFoods();
      previouslyUsedFoods = result.foods || [];
      console.debug('Loaded previously used foods:', previouslyUsedFoods.length);
    } catch (err) {
      console.error('Error loading previously used foods:', err);
      // Don't show error to user - this is a nice-to-have feature
      previouslyUsedFoods = [];
    }
  }
  
  // Check for BarcodeDetector support, fallback to ZXing
  onMount(async () => {
    if ('BarcodeDetector' in window) {
      hasBarcodeDetector = true;
      useZXing = false;
      try {
        barcodeDetector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf']
        });
      } catch (e) {
        console.warn('BarcodeDetector initialization failed, using ZXing fallback:', e);
        hasBarcodeDetector = false;
        useZXing = true;
        zxingReader = createZXingReader();
      }
  } else {
    // Use ZXing as fallback for iOS and other browsers
    useZXing = true;
    zxingReader = createZXingReader();
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
    
    // Load previously used foods
    await loadPreviouslyUsedFoods();
    
    // Check permission status silently (non-blocking, doesn't request)
    checkCameraPermission().catch(() => {
      // Ignore errors in permission check
    });
  });
  
  onDestroy(() => {
    stopCamera();
    
    // Clean up any remaining intervals
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
    
    if (streamMonitorInterval) {
      clearInterval(streamMonitorInterval);
      streamMonitorInterval = null;
    }
    
    // Clean up search timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
  });
  
  // Get getUserMedia function (defined at module level so it can be reused)
  let getUserMediaFn = null;
  
  // Initialize getUserMedia on mount
  onMount(() => {
    if (navigator && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      getUserMediaFn = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    } else if (navigator && typeof navigator.getUserMedia === 'function') {
      // Fallback for older browsers
      getUserMediaFn = (constraints) => {
        return new Promise((resolve, reject) => {
          navigator.getUserMedia(constraints, resolve, reject);
        });
      };
    }
  });
  
  async function startCameraScan() {
    if (!hasBarcodeDetector && !useZXing) {
      error = 'Barcode scanning is not supported in this browser. Please enter the barcode manually.';
      return;
    }
    
    // Check if getUserMedia is available
    if (!getUserMediaFn) {
      // Try to initialize it now
      if (navigator && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        getUserMediaFn = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      } else if (navigator && typeof navigator.getUserMedia === 'function') {
        getUserMediaFn = (constraints) => {
          return new Promise((resolve, reject) => {
            navigator.getUserMedia(constraints, resolve, reject);
          });
        };
      } else {
        error = 'Camera access is not available in this browser. Please use Safari or a recent version of Chrome, or enter the barcode manually.';
        return;
      }
    }
    
    if (!getUserMediaFn) {
      error = 'Camera access is not available. Please use a modern browser or enter the barcode manually.';
      return;
    }
    
    // Check if we've already requested permission this session
    // If permission was previously granted, browser should remember it
    const storedPermission = localStorage.getItem(CAMERA_PERMISSION_KEY);
    if (storedPermission === 'granted' && !permissionRequestedThisSession) {
      // Permission was previously granted - browser should remember it
      // We can proceed without showing prompt
      cameraPermissionGranted = true;
    }
    
    try {
      showCameraModal = true;
      scanning = true;
      restartAttempts = 0; // Reset restart attempts for new session
      
      // Wait for video element to be available and in DOM
      let retries = 0;
      while (!videoElement && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      if (!videoElement) {
        error = 'Camera element not available. Please refresh and try again.';
        stopCamera();
        return;
      }
      
      // Ensure video element is visible and ready
      if (videoElement.offsetParent === null) {
        error = 'Camera view not visible. Please ensure the modal is displayed.';
        stopCamera();
        return;
      }
      
      if (useZXing && zxingReader) {
        // Use ZXing's built-in continuous decode from video constraints
        try {
          videoElement.setAttribute('playsinline', 'true');
          videoElement.setAttribute('webkit-playsinline', 'true');
          videoElement.muted = true;
          videoElement.playsInline = true;
          
          // ZXing handles getUserMedia, video setup, and continuous decoding internally
          await zxingReader.decodeFromConstraints(
            {
              video: {
                facingMode: 'environment',
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 }
              }
            },
            videoElement,
            (result, err) => {
              if (result) {
                const barcodeValue = result.getText();
                if (barcodeValue && barcodeValue.length >= 8) {
                  stopCamera();
                  barcodeQuery = barcodeValue;
                  handleBarcodeSearch();
                }
              }
              // NotFoundException is normal when no barcode in frame - ignore
            }
          );
          
          // decodeFromConstraints resolved = camera started successfully
          cameraPermissionGranted = true;
          permissionRequestedThisSession = true;
          localStorage.setItem(CAMERA_PERMISSION_KEY, 'granted');
          localStorage.setItem(CAMERA_PERMISSION_TIMESTAMP_KEY, Date.now().toString());
          videoPlaying = true;
          
          // Grab the stream ZXing set up so we can clean it up later
          if (videoElement.srcObject instanceof MediaStream) {
            videoStream = videoElement.srcObject;
          }
        } catch (err) {
          console.error('ZXing initialization error:', err);
          const errorMessage = err.message || err.toString() || 'Unknown error';
          if (err.name === 'NotAllowedError' || errorMessage.includes('permission')) {
            cameraPermissionGranted = false;
            permissionRequestedThisSession = true;
            localStorage.setItem(CAMERA_PERMISSION_KEY, 'denied');
            error = 'Camera permission denied. Please allow camera access to scan barcodes.';
          } else if (err.name === 'NotFoundError' || errorMessage.includes('camera') || errorMessage.includes('device')) {
            error = 'No camera found. Please enter the barcode manually.';
          } else {
            error = `Failed to start barcode scanner: ${errorMessage}. Please enter the barcode manually.`;
          }
          stopCamera();
        }
      } else if (hasBarcodeDetector && barcodeDetector) {
        // Use native BarcodeDetector API
        // Check permission state (non-intrusive)
        await checkCameraPermission();
        
        // Request camera access (browser will remember if permission was previously granted)
        const stream = await getUserMediaFn({
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 }
          }
        });
        
        // Permission granted - mark it and store in localStorage
        cameraPermissionGranted = true;
        permissionRequestedThisSession = true;
        localStorage.setItem(CAMERA_PERMISSION_KEY, 'granted');
        localStorage.setItem(CAMERA_PERMISSION_TIMESTAMP_KEY, Date.now().toString());
        videoStream = stream;
        videoElement.srcObject = stream;
        await videoElement.play();
        
        // Monitor stream health
        stream.getVideoTracks().forEach(track => {
          track.onended = () => {
            console.debug('Camera track ended');
            if (scanning && showCameraModal) {
              restartCameraIfNeeded();
            }
          };
        });
        
        // Start scanning
        scanInterval = setInterval(async () => {
          if (videoElement && barcodeDetector && scanning) {
            try {
              const barcodes = await barcodeDetector.detect(videoElement);
              if (barcodes && barcodes.length > 0) {
                const barcode = barcodes[0];
                const barcodeValue = barcode.rawValue;
                
                // Stop scanning and search
                stopCamera();
                barcodeQuery = barcodeValue;
                await handleBarcodeSearch();
              }
            } catch (err) {
              // Ignore detection errors, continue scanning
            }
          }
        }, 250); // Scan every 250ms for better barcode capture
        
        // Monitor stream health
        streamMonitorInterval = setInterval(() => {
          if (!scanning || !showCameraModal) {
            clearInterval(streamMonitorInterval);
            streamMonitorInterval = null;
            return;
          }
          
          if (videoStream) {
            const activeTracks = videoStream.getVideoTracks().filter(track => track.readyState === 'live');
            if (activeTracks.length === 0) {
              console.debug('No active camera tracks detected, restarting...');
              restartCameraIfNeeded();
            }
          } else if (videoElement && !videoElement.srcObject) {
            console.debug('Video element lost stream, restarting...');
            restartCameraIfNeeded();
          }
        }, 2000);
      }
        } catch (err) {
          console.error('Error accessing camera:', err);
          
          // Update permission state if denied
          if (err.name === 'NotAllowedError') {
            cameraPermissionGranted = false;
            permissionRequestedThisSession = true;
            localStorage.setItem(CAMERA_PERMISSION_KEY, 'denied');
            error = 'Camera permission denied. Please allow camera access to scan barcodes.';
          } else if (err.name === 'NotFoundError') {
            error = 'No camera found. Please enter the barcode manually.';
          } else {
            error = 'Failed to access camera. Please enter the barcode manually.';
          }
          
          stopCamera();
        }
  }
  
  function stopCamera() {
    scanning = false;
    showCameraModal = false;
    videoPlaying = false;
    
    // Stop monitoring intervals
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
    
    if (streamMonitorInterval) {
      clearInterval(streamMonitorInterval);
      streamMonitorInterval = null;
    }
    
    // Stop ZXing continuous decode and release camera
    if (zxingReader) {
      try {
        zxingReader.stopContinuousDecode();
        zxingReader.reset();
      } catch (e) {
        console.debug('ZXing cleanup error:', e);
      }
    }
    
    // Stop video stream tracks
    if (videoStream) {
      videoStream.getTracks().forEach(track => {
        track.stop();
        // Remove event listeners
        track.onended = null;
        track.onmute = null;
        track.onunmute = null;
      });
      videoStream = null;
    }
    
    // Also check if videoElement has a stream attached
    if (videoElement) {
      if (videoElement.srcObject) {
        const stream = videoElement.srcObject;
        if (stream instanceof MediaStream) {
          stream.getTracks().forEach(track => {
            track.stop();
            track.onended = null;
            track.onmute = null;
            track.onunmute = null;
          });
        }
        videoElement.srcObject = null;
      }
      videoElement.pause();
    }
  }
  
  // Track restart attempts to prevent infinite loops
  let restartAttempts = 0;
  const maxRestartAttempts = 3;
  
  async function restartCameraIfNeeded() {
    if (!showCameraModal || !scanning || !videoElement) {
      return;
    }
    
    const hasActiveStream = videoStream && videoStream.getVideoTracks().some(track => track.readyState === 'live');
    
    if (!hasActiveStream) {
      restartAttempts++;
      if (restartAttempts > maxRestartAttempts) {
        error = 'Camera keeps stopping. Please close and reopen the scanner.';
        return;
      }
      
      console.debug(`Camera stopped, restarting ${restartAttempts}/${maxRestartAttempts}...`);
      stopCamera();
      showCameraModal = true;
      scanning = true;
      await new Promise(resolve => setTimeout(resolve, 500));
      startCameraScan();
    } else if (videoElement.paused) {
      try {
        await videoElement.play();
        videoPlaying = true;
      } catch (e) {
        console.debug('Resume error:', e);
      }
    }
  }
  
  // Handle camera button click - this ensures permission request is from direct user interaction
  function handleCameraButtonClick(event) {
    // Ensure this is a direct user interaction (required for iOS Safari)
    if (barcodeQuery && barcodeQuery.length >= 8) {
      // If barcode is already entered, just search
      handleBarcodeSearch();
    } else {
      // Start camera scan - this must be called directly from click event
      // Don't wrap in setTimeout or async - iOS Safari requires direct call
      startCameraScan();
    }
  }
  
  function handleSelectFood(food) {
    dispatch('foodSelected', food);
    searchQuery = '';
    searchResults = [];
  }

  function openAddCustomFood() {
    showCustomFoodForm = true;
  }

  function handleCustomFoodCreated(event) {
    const created = event.detail;
    dispatch('foodSelected', created);
    searchQuery = '';
    searchResults = [];
    showCustomFoodForm = false;
  }

  function handleCustomFoodCancel() {
    showCustomFoodForm = false;
  }

  function handleAddFromBarcodeCreated(event) {
    const created = event.detail;
    dispatch('foodSelected', created);
    searchQuery = '';
    searchResults = [];
    barcodeQuery = '';
    showAddFromBarcodeModal = false;
  }

  function handleAddFromBarcodeCancel() {
    showAddFromBarcodeModal = false;
    error = 'No food found with this barcode. Try searching by name instead.';
  }
  
  function getDataTypeBadge(dataType) {
    const badges = {
      'Foundation': { label: 'Foundation', color: '#3b82f6' },
      'Branded': { label: 'Branded', color: '#10b981' },
      'SR Legacy': { label: 'SR Legacy', color: '#8b5cf6' },
      'Survey (FNDDS)': { label: 'Survey', color: '#f59e0b' },
      'Custom': { label: 'Custom', color: '#ec4899' },
    };
    return badges[dataType] || { label: dataType || 'Food', color: '#64748b' };
  }
  
  function isPreviouslyUsed(food) {
    if (!food) return false;
    if (food.customFoodId != null) return previouslyUsedFoods.some(used => used.customFoodId === food.customFoodId);
    if (food.fdcId != null) return previouslyUsedFoods.some(used => used.fdcId === food.fdcId);
    return false;
  }

  function extractMacros(food) {
    if (food.source === 'custom') {
      return {
        cal: food.calories != null ? Math.round(food.calories) : null,
        p: food.protein != null ? Math.round(food.protein) : null,
        f: food.fat != null ? Math.round(food.fat) : null,
        c: food.carbs != null ? Math.round(food.carbs) : null,
        serving: food.servingSize ? `${food.servingSize}${food.servingSizeUnit || 'g'}` : null,
      };
    }
    let cal = null, p = null, f = null, c = null;
    if (food.foodNutrients) {
      for (const n of food.foodNutrients) {
        const id = n.nutrientId ?? n.nutrient?.id;
        const v = n.value ?? n.amount;
        if (v == null) continue;
        if (id === 1008) cal = Math.round(v);
        else if (id === 1003) p = Math.round(v);
        else if (id === 1004) f = Math.round(v);
        else if (id === 1005) c = Math.round(v);
      }
    }
    const ss = food.servingSize;
    const su = food.servingSizeUnit || 'g';
    const serving = ss ? `${ss}${su}` : null;
    return { cal, p, f, c, serving };
  }
</script>

<div class="food-search">
  <div class="search-inputs">
    <div class="search-row">
      <div class="search-group">
        <input
          type="text"
          class="search-input"
          placeholder="Search foods..."
          bind:value={searchQuery}
          on:keydown={handleSearchKeydown}
          disabled={isSearching}
        />
        {#if isSearching}
          <div class="loading-spinner"></div>
        {/if}
      </div>
      <button type="button" class="add-custom-inline-btn" on:click={openAddCustomFood} disabled={isSearching}>
        Add custom
      </button>
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
    </div>
  </div>
  
  {#if error}
    <div class="error-message">{error}</div>
  {/if}
  
  {#if searchResults.length > 0}
    <div class="search-results">
      {#each searchResults as food}
        {@const badge = getDataTypeBadge(food.source === 'custom' ? 'Custom' : food.dataType)}
        {@const isUsed = isPreviouslyUsed(food)}
        {@const m = extractMacros(food)}
        <div class="food-result" class:previously-used={isUsed} role="button" tabindex="0" on:click={() => handleSelectFood(food)} on:keydown={(e) => e.key === 'Enter' && handleSelectFood(food)}>
          <div class="food-result-info">
            <div class="food-result-header">
              <span class="food-result-name">
                {food.description || food.brandOwner || 'Unknown Food'}
                {#if isUsed}<span class="used-badge" title="Previously logged">✓</span>{/if}
              </span>
              <span class="food-result-badge" style="background-color: {badge.color}20; color: {badge.color};">{badge.label}</span>
            </div>
            {#if food.brandOwner && food.description !== food.brandOwner}
              <div class="food-result-brand">{food.brandOwner}</div>
            {/if}
            <div class="food-result-macros">
              {#if m.cal != null}<span class="macro-cal">{m.cal} cal</span>{/if}
              {#if m.serving}<span class="macro-sep">·</span><span class="macro-serving">{m.serving}</span>{/if}
              {#if m.p != null}<span class="macro-sep">·</span><span class="macro-p">P {m.p}g</span>{/if}
              {#if m.f != null}<span class="macro-sep">·</span><span class="macro-f">F {m.f}g</span>{/if}
              {#if m.c != null}<span class="macro-sep">·</span><span class="macro-c">C {m.c}g</span>{/if}
              {#if m.cal == null && m.p == null && m.f == null && m.c == null}
                <span class="macro-na">—</span>
              {/if}
            </div>
          </div>
          <button
            type="button"
            class="add-food-btn"
            on:click|stopPropagation={() => handleSelectFood(food)}
          >+</button>
        </div>
      {/each}
    </div>
  {:else if searchQuery && searchQuery.length >= 2 && !isSearching && !error}
    <div class="no-results">
      <p>No foods found. Try a different search term or <button type="button" class="no-results-add-link" on:click={openAddCustomFood}>add a custom food</button>.</p>
    </div>
  {/if}
</div>

{#if showCustomFoodForm}
  <div
    class="custom-food-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="custom-food-title"
    tabindex="-1"
    on:click|self={handleCustomFoodCancel}
    on:keydown={(e) => { if (e.key === 'Escape') { e.preventDefault(); handleCustomFoodCancel(); } }}
  >
    <div class="custom-food-modal" role="document" on:click|stopPropagation>
      <CustomFoodForm
        initialName={searchQuery}
        visible={true}
        on:created={handleCustomFoodCreated}
        on:cancel={handleCustomFoodCancel}
      />
    </div>
  </div>
{/if}

<AddFromBarcodeModal
  barcode={barcodeQuery}
  visible={showAddFromBarcodeModal}
  on:created={handleAddFromBarcodeCreated}
  on:cancel={handleAddFromBarcodeCancel}
/>

{#if showCameraModal}
  <div 
    class="camera-modal-overlay" 
    role="button"
    tabindex="0"
    on:click|self={stopCamera}
    on:keydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        stopCamera();
      }
    }}
    aria-label="Close camera scanner"
  >
    <div 
      class="camera-modal-content" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      on:click|stopPropagation
    >
      <div class="camera-modal-header">
        <h3 id="camera-modal-title">Scan Barcode</h3>
        <button type="button" class="close-camera-btn" on:click={stopCamera}>×</button>
      </div>
      <div class="camera-container">
        <!-- Hidden canvas for barcode decoding -->
        <canvas bind:this={canvasElement} class="decode-canvas"></canvas>
        <video
          bind:this={videoElement}
          class="camera-video"
          autoplay
          playsinline
          webkit-playsinline="true"
          muted
          on:playing={() => { videoPlaying = true; }}
          on:pause={() => { videoPlaying = false; }}
        ></video>
        {#if scanning}
          <div class="scanning-overlay">
            <div class="scan-line"></div>
            <p class="scan-instructions">Hold barcode steady within frame</p>
          </div>
        {/if}
      </div>
      <p class="camera-permission-tip">Use the same URL each visit so camera permission persists (especially on mobile)</p>
      <div class="camera-modal-footer">
        <button type="button" class="cancel-camera-btn" on:click={stopCamera}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .food-search {
    margin-bottom: var(--spacing-md);
  }
  
  .search-inputs {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .search-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .search-row .search-group {
    flex: 1;
    min-width: 120px;
  }
  
  .search-group {
    position: relative;
    display: flex;
    align-items: center;
  }

  .add-custom-inline-btn {
    flex-shrink: 0;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .add-custom-inline-btn:hover:not(:disabled) {
    background: var(--primary-hover);
  }

  .add-custom-inline-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .search-input {
    flex: 1;
    padding: var(--spacing-sm);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    background-color: var(--input-background);
    color: var(--text-primary);
    font-size: 1rem;
  }
  
  .search-input:focus {
    border-color: var(--primary-color);
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  
  .search-input:disabled {
    background-color: var(--input-readonly-background);
    cursor: not-allowed;
  }
  
  .loading-spinner {
    position: absolute;
    right: var(--spacing-sm);
    width: 16px;
    height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .barcode-btn {
    padding: var(--spacing-sm);
    background-color: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .barcode-btn:hover:not(:disabled) {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }
  
  .barcode-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .camera-modal-overlay {
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
  
  .camera-modal-content {
    background: var(--surface-elevated);
    border-radius: var(--border-radius);
    width: 100%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .camera-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border);
  }
  
  .camera-modal-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .close-camera-btn {
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
    transition: all 0.2s;
  }
  
  .close-camera-btn:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
  }
  
  .camera-container {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    background-color: #000;
    overflow: hidden;
  }
  
  .camera-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    background-color: #000;
    /* Don't mirror - barcodes need correct orientation */
  }
  
  .decode-canvas {
    display: none; /* Hidden canvas for barcode decoding */
  }
  
  .scanning-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  
  .scan-line {
    width: 80%;
    height: 2px;
    background: linear-gradient(to right, transparent, var(--primary-color), transparent);
    animation: scan 2s linear infinite;
    margin-bottom: var(--spacing-md);
  }
  
  @keyframes scan {
    0%, 100% { transform: translateY(-50%); }
    50% { transform: translateY(50%); }
  }
  
  .scan-instructions {
    color: white;
    font-size: 0.875rem;
    text-align: center;
    background-color: rgba(0, 0, 0, 0.6);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-sm);
  }

  .camera-permission-tip {
    font-size: 0.75rem;
    color: var(--text-muted, #6b7280);
    text-align: center;
    padding: 0 var(--spacing-md);
    margin: 0;
    line-height: 1.3;
  }

  .camera-modal-footer {
    padding: var(--spacing-md);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: center;
  }
  
  .cancel-camera-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    background-color: var(--surface);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-camera-btn:hover {
    background-color: var(--surface-elevated);
    color: var(--text-primary);
  }
  
  .error-message {
    background-color: #fee2e2;
    color: #991b1b;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
    margin-bottom: var(--spacing-sm);
  }
  
  .search-results {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    max-height: 300px;
    overflow-y: auto;
  }
  
  .food-result {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-md);
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: all 0.15s;
  }

  .food-result:hover {
    background-color: var(--surface-elevated);
    border-color: var(--primary-color);
  }

  .food-result.previously-used {
    border-left: 3px solid #10b981;
    background-color: rgba(16, 185, 129, 0.05);
  }

  .used-badge {
    color: #10b981;
    font-weight: 600;
    font-size: 0.8rem;
    margin-left: 2px;
  }

  .food-result-info {
    flex: 1;
    min-width: 0;
  }

  .food-result-header {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-sm);
    margin-bottom: 2px;
  }

  .food-result-name {
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--text-primary);
    word-break: break-word;
    line-height: 1.3;
  }

  .food-result-brand {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-bottom: 2px;
  }

  .food-result-macros {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .macro-cal {
    font-weight: 600;
    color: var(--text-secondary);
  }

  .macro-sep {
    color: var(--border);
    margin: 0 1px;
  }

  .macro-p { color: #3b82f6; }
  .macro-f { color: #f59e0b; }
  .macro-c { color: #10b981; }

  .macro-serving {
    color: var(--text-muted);
  }

  .macro-na {
    color: var(--text-muted);
  }

  .food-result-badge {
    padding: 2px 6px;
    border-radius: var(--border-radius-sm);
    font-size: 0.65rem;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .add-food-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    transition: background-color 0.15s;
    line-height: 1;
  }

  .add-food-btn:hover {
    background-color: var(--primary-hover);
  }
  
  .no-results {
    padding: var(--spacing-md);
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .no-results p {
    margin: 0;
    font-style: italic;
  }

  .no-results-add-link {
    background: none;
    border: none;
    color: var(--primary-color);
    font: inherit;
    font-style: italic;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
  }

  .no-results-add-link:hover {
    color: var(--primary-hover);
  }

  .custom-food-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: var(--spacing-md);
  }

  .custom-food-modal {
    width: 100%;
    max-width: 420px;
    max-height: 90vh;
    overflow-y: auto;
  }
</style>
