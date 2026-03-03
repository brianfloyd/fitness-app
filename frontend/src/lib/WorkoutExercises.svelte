<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { getRecentLogs } from '../lib/api.js';
  
  export let exercises = []; // Array of { id, name, muscleGroup, sets: [{ id, weight, reps }], completed: boolean }
  
  const dispatch = createEventDispatcher();
  
  let recentExercises = []; // Exercises from previous days for quick access
  let exerciseHistory = new Map(); // Map of exercise name -> last used data
  
  // Muscle groups with common pairings
  const muscleGroups = [
    { name: 'Biceps', icon: '💪', color: '#3b82f6', pairedWith: ['Back'] },
    { name: 'Triceps', icon: '💪', color: '#8b5cf6', pairedWith: ['Chest'] },
    { name: 'Chest', icon: '🫁', color: '#ef4444', pairedWith: ['Triceps'] },
    { name: 'Back', icon: '🔙', color: '#10b981', pairedWith: ['Biceps'] },
    { name: 'Shoulders', icon: '🏋️', color: '#f59e0b', pairedWith: [] },
    { name: 'Legs', icon: '🦵', color: '#ec4899', pairedWith: [] },
    { name: 'Forearms', icon: '🤏', color: '#06b6d4', pairedWith: ['Biceps'] },
    { name: 'Core', icon: '🔥', color: '#f97316', pairedWith: [] },
  ];
  
  function getMuscleGroupColor(name) {
    const group = muscleGroups.find(g => g.name === name);
    return group ? group.color : '#64748b';
  }
  
  // Reactive statements to ensure preview updates when custom inputs change
  // Update effective values based on whether custom mode is active
  $: effectiveMovementType = (customExerciseData.movementType === '__custom__') 
    ? (customMovementTypeInput ? customMovementTypeInput.trim() : '')
    : (customExerciseData.movementType || '');
  
  $: effectiveEquipment = (customExerciseData.equipment === '__custom__')
    ? (customEquipmentInput ? customEquipmentInput.trim() : '')
    : (customExerciseData.equipment || '');
  
  async function loadRecentExercises() {
    try {
      const recentLogs = await getRecentLogs(20);
      const allRecentExercises = new Map(); // Use Map to deduplicate by name
      
      recentLogs.forEach(log => {
        if (log && log.workout) {
          try {
            const workoutData = JSON.parse(log.workout);
            if (Array.isArray(workoutData)) {
              workoutData.forEach(exercise => {
                if (exercise.name) {
                  // Track most recent for recent list
                  if (!allRecentExercises.has(exercise.name)) {
                    allRecentExercises.set(exercise.name, {
                      name: exercise.name,
                      muscleGroup: exercise.muscleGroup,
                      lastUsed: log.date,
                    });
                  }
                  
                  // Store exercise history (last occurrence wins)
                  if (!exerciseHistory.has(exercise.name) || 
                      new Date(log.date) > new Date(exerciseHistory.get(exercise.name).date)) {
                    exerciseHistory.set(exercise.name, {
                      name: exercise.name,
                      muscleGroup: exercise.muscleGroup,
                      sets: exercise.sets || [],
                      direction: exercise.direction ?? null,
                      date: log.date,
                    });
                  }
                }
              });
            }
          } catch (e) {
            // Skip invalid JSON (might be old text format)
          }
        }
      });
      
      recentExercises = Array.from(allRecentExercises.values())
        .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
        .slice(0, 20); // Top 20 most recently used
    } catch (err) {
      console.error('Error loading recent exercises:', err);
      recentExercises = [];
    }
  }
  
  // Expose loadRecentExercises so parent can call it after saves
  export function refreshRecentExercises() {
    loadRecentExercises();
  }
  
  onMount(() => {
    loadRecentExercises();
  });
  
  // Common exercises by muscle group (following canonical naming)
  const commonExercises = {
    'Biceps': [
      'Biceps – Curl – Seated Dumbbell',
      'Biceps – Drag Curl – Seated',
      'Biceps – Drag Curl – Standing',
      'Biceps – Curl – Preacher Machine',
      'Biceps – Curl – Machine',
      'Biceps – Curl – Barbell',
      'Biceps – Curl – Cable (Bar Attachment)',
      'Biceps – Curl – Concentration',
    ],
    'Forearms': [
      'Forearms – Curl – Dumbbell',
      'Forearms – Curl – Cable',
    ],
    'Triceps': [
      'Triceps – Extension – Cable',
      'Triceps – Extension – Cable (Cuff)',
      'Triceps – Extension – Overhead Cable',
      'Triceps – Extension – Overhead Dumbbell',
      'Triceps – Extension – Skull Crusher',
      'Triceps – Dip – Bodyweight',
    ],
    'Shoulders': [
      'Shoulders – Press – Dumbbell',
      'Shoulders – Press – Barbell',
      'Shoulders – Press – Machine',
      'Shoulders – Press – Arnold Dumbbell',
      'Shoulders – Raise – Lateral Dumbbell',
      'Shoulders – Raise – Lateral Cable',
      'Shoulders – Raise – Front Dumbbell',
      'Shoulders – Raise – Front Cable',
      'Shoulders – Fly – Rear Delt Dumbbell',
      'Shoulders – Fly – Rear Delt Cable',
      'Shoulders – Row – Upright Barbell',
    ],
    'Chest': [
      'Chest – Press – Barbell Flat',
      'Chest – Press – Barbell Incline',
      'Chest – Press – Dumbbell Flat',
      'Chest – Press – Dumbbell Incline',
      'Chest – Press – Machine',
      'Chest – Press – Cable Incline',
      'Chest – Fly – Dumbbell Flat',
      'Chest – Fly – Dumbbell Incline',
      'Chest – Fly – Cable',
      'Chest – Fly – Pec Deck',
      'Chest – Push-Up – Bodyweight',
      'Chest – Dip – Bodyweight',
    ],
    'Back': [
      'Back – Pull – Pull-Up',
      'Back – Pull – Lat Pulldown',
      'Back – Row – Barbell',
      'Back – Row – Dumbbell',
      'Back – Row – Seated Cable',
      'Back – Row – Machine',
      'Back – Deadlift – Barbell',
      'Back – Extension – Hyperextension',
      'Back – Pull – Straight Arm Pulldown',
    ],
    'Legs': [
      'Legs – Squat – Barbell',
      'Legs – Squat – Machine',
      'Legs – Press – Leg Press Machine',
      'Legs – Hinge – Romanian Deadlift',
      'Legs – Curl – Hamstring Machine',
      'Legs – Extension – Quadriceps Machine',
      'Legs – Lunge – Dumbbell',
      'Legs – Lunge – Barbell',
      'Legs – Step-Up – Dumbbell',
      'Legs – Calf Raise – Standing Machine',
      'Legs – Calf Raise – Seated Machine',
    ],
    'Core': [
      'Core – Crunch – Machine',
      'Core – Crunch – Cable',
      'Core – Raise – Hanging Leg Raise',
      'Core – Raise – Captain Chair',
      'Core – Rotation – Cable Woodchopper',
      'Core – Hold – Plank',
    ],
  };
  
  let selectedMuscleGroup = null;
  let showExercisePicker = false;
  let exerciseSearchTerm = '';
  let addingExercise = null;
  let showCustomExerciseForm = false;
  let customExerciseData = {
    movementType: '',
    equipment: '',
    variation: '',
  };
  // Separate variables for custom input values to prevent conflicts
  let customMovementTypeInput = '';
  let customEquipmentInput = '';
  let effectiveMovementType = '';
  let effectiveEquipment = '';
  
  // Movement types by muscle group
  const movementTypes = {
    'Biceps': ['Curl', 'Drag Curl', 'Hammer Curl', 'Concentration Curl'],
    'Forearms': ['Curl', 'Extension', 'Reverse Curl'],
    'Triceps': ['Extension', 'Dip', 'Pressdown', 'Overhead Extension'],
    'Shoulders': ['Press', 'Raise', 'Fly', 'Row', 'Shrug'],
    'Chest': ['Press', 'Fly', 'Push-Up', 'Dip', 'Crossover'],
    'Back': ['Pull', 'Row', 'Deadlift', 'Extension', 'Shrug'],
    'Legs': ['Squat', 'Press', 'Hinge', 'Curl', 'Extension', 'Lunge', 'Step-Up', 'Calf Raise'],
    'Core': ['Crunch', 'Raise', 'Rotation', 'Hold', 'Plank', 'Sit-Up'],
  };
  
  // Equipment/Variation options by muscle group
  const equipmentOptions = {
    'Biceps': ['Dumbbell', 'Barbell', 'Cable', 'Machine', 'Preacher Machine', 'Cable (Bar Attachment)', 'Concentration'],
    'Forearms': ['Dumbbell', 'Cable', 'Barbell', 'Machine'],
    'Triceps': ['Cable', 'Dumbbell', 'Barbell', 'Machine', 'Cable (Cuff)', 'Overhead Cable', 'Overhead Dumbbell', 'Skull Crusher', 'Bodyweight'],
    'Shoulders': ['Dumbbell', 'Barbell', 'Machine', 'Cable', 'Arnold Dumbbell', 'Lateral Dumbbell', 'Lateral Cable', 'Front Dumbbell', 'Front Cable', 'Rear Delt Dumbbell', 'Rear Delt Cable', 'Upright Barbell'],
    'Chest': ['Barbell Flat', 'Barbell Incline', 'Dumbbell Flat', 'Dumbbell Incline', 'Machine', 'Cable', 'Pec Deck', 'Bodyweight'],
    'Back': ['Pull-Up', 'Lat Pulldown', 'Barbell', 'Dumbbell', 'Seated Cable', 'Machine', 'Straight Arm Pulldown', 'Hyperextension'],
    'Legs': ['Barbell', 'Dumbbell', 'Machine', 'Hamstring Machine', 'Quadriceps Machine', 'Standing Machine', 'Seated Machine'],
    'Core': ['Machine', 'Cable', 'Hanging Leg Raise', 'Captain Chair', 'Cable Woodchopper', 'Bodyweight'],
  };
  
  function getExercisesForMuscleGroup(group) {
    return commonExercises[group] || [];
  }
  
  function addExercise(exerciseName, muscleGroup) {
    // Check if this exercise is already active (not completed) - prevent duplicates
    const existingActiveExercise = exercises.find(
      ex => ex.name === exerciseName && !ex.completed
    );
    
    if (existingActiveExercise) {
      // Exercise is already open, don't add duplicate
      // Optionally focus the existing one or show a message
      return;
    }
    
    // Check if we have history for this exercise
    const history = exerciseHistory.get(exerciseName);
    
    let sets = [];
    if (history && history.sets && history.sets.length > 0) {
      // Use last entry's sets as template
      sets = history.sets.map(set => ({
        id: Date.now() + Math.random() * (Math.random() * 1000),
        weight: set.weight || '',
        reps: set.reps || '10',
      }));
    } else {
      // Default: 3 sets with 10 reps
      sets = [
        { id: Date.now() + Math.random() + 1, weight: '', reps: '10' },
        { id: Date.now() + Math.random() + 2, weight: '', reps: '10' },
        { id: Date.now() + Math.random() + 3, weight: '', reps: '10' },
      ];
    }
    
    const newExercise = {
      id: Date.now() + Math.random(),
      name: exerciseName,
      muscleGroup: muscleGroup,
      sets: sets,
      direction: history?.direction ?? null,
      completed: false,
    };
    
    // Insert exercise maintaining muscle group order
    const muscleGroupOrder = ['Biceps', 'Forearms', 'Triceps', 'Shoulders', 'Chest', 'Back', 'Legs', 'Core'];
    const currentGroupIndex = muscleGroupOrder.indexOf(muscleGroup);
    
    // Find insertion point (after last exercise of same or earlier group)
    let insertIndex = exercises.length;
    for (let i = exercises.length - 1; i >= 0; i--) {
      const exGroupIndex = muscleGroupOrder.indexOf(exercises[i].muscleGroup);
      if (exGroupIndex <= currentGroupIndex) {
        insertIndex = i + 1;
        break;
      }
      insertIndex = i;
    }
    
    exercises = [
      ...exercises.slice(0, insertIndex),
      newExercise,
      ...exercises.slice(insertIndex)
    ];
    
    dispatch('exercisesChanged', exercises);
    selectedMuscleGroup = null;
    showExercisePicker = false;
    exerciseSearchTerm = '';
  }
  
  function removeExercise(exerciseId) {
    exercises = exercises.filter(ex => ex.id !== exerciseId);
    dispatch('exercisesChanged', exercises);
  }
  
  function updateSet(exerciseId, setId, field, value) {
    exercises = exercises.map(ex => {
      if (ex.id === exerciseId) {
        const updatedSets = ex.sets.map(set => {
          if (set.id === setId) {
            return { ...set, [field]: value };
          }
          return set;
        });
        return { ...ex, sets: updatedSets };
      }
      return ex;
    });
    dispatch('exercisesChanged', exercises);
  }
  
  function addSet(exerciseId) {
    exercises = exercises.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, { id: Date.now() + Math.random(), weight: lastSet?.weight || '', reps: lastSet?.reps || '10' }],
        };
      }
      return ex;
    });
    dispatch('exercisesChanged', exercises);
  }
  
  function removeSet(exerciseId, setId) {
    exercises = exercises.map(ex => {
      if (ex.id === exerciseId) {
        const updatedSets = ex.sets.filter(set => set.id !== setId);
        if (updatedSets.length === 0) {
          // If no sets left, add one back
          updatedSets.push({ id: Date.now() + Math.random(), weight: '', reps: '' });
        }
        return { ...ex, sets: updatedSets };
      }
      return ex;
    });
    dispatch('exercisesChanged', exercises);
  }
  
  function cycleDirection(exerciseId) {
    exercises = exercises.map(ex => {
      if (ex.id === exerciseId) {
        const next = ex.direction === null ? 'up' : ex.direction === 'up' ? 'down' : null;
        return { ...ex, direction: next };
      }
      return ex;
    });
    dispatch('exercisesChanged', exercises);
  }

  function copyWeightToAllSets(exerciseId, weight) {
    exercises = exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(set => ({ ...set, weight: weight })),
        };
      }
      return ex;
    });
    dispatch('exercisesChanged', exercises);
  }
  
  function completeExercise(exerciseId) {
    exercises = exercises.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, completed: true };
      }
      return ex;
    });
    dispatch('exercisesChanged', exercises);
  }
  
  function reopenExerciseForEditing(exerciseId) {
    // Reopen a completed exercise for editing
    exercises = exercises.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, completed: false };
      }
      return ex;
    });
    dispatch('exercisesChanged', exercises);
  }
  
  function deleteExercise(exerciseId) {
    // Remove the exercise completely
    exercises = exercises.filter(ex => ex.id !== exerciseId);
    dispatch('exercisesChanged', exercises);
  }
  
  function calculateTotalReps(sets) {
    return sets.reduce((total, set) => {
      const reps = parseFloat(set.reps) || 0;
      return total + reps;
    }, 0);
  }
  
  function calculateTotalVolume(sets) {
    return sets.reduce((total, set) => {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseFloat(set.reps) || 0;
      return total + (weight * reps);
    }, 0);
  }
  
  $: filteredExercises = selectedMuscleGroup
    ? getExercisesForMuscleGroup(selectedMuscleGroup).filter(ex =>
        exerciseSearchTerm === '' || ex.toLowerCase().includes(exerciseSearchTerm.toLowerCase())
      )
    : [];
  
  // Filter recent exercises for the selected muscle group (including custom exercises)
  $: recentForGroup = recentExercises.filter(re => {
    if (!selectedMuscleGroup) return false;
    const matchesGroup = re.muscleGroup === selectedMuscleGroup;
    const matchesSearch = exerciseSearchTerm === '' || re.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  $: hasActiveExercises = exercises.some(e => !e.completed);
</script>

<div class="workout-exercises">
  <!-- New entry area: muscle grid + active cards - when active, fits one screen; when none, space goes to logged -->
  <div class="workout-new-entry" class:has-active={hasActiveExercises}>
  <div class="muscle-group-grid">
    {#each muscleGroups as group}
      <button
        type="button"
        class="muscle-group-btn"
        style="border-color: {group.color};"
        on:click={() => {
          selectedMuscleGroup = group.name;
          showExercisePicker = true;
          exerciseSearchTerm = '';
          // Refresh recent exercises to include newly saved ones
          loadRecentExercises();
        }}
      >
        <span class="muscle-icon">{group.icon}</span>
        <span class="muscle-name">{group.name}</span>
      </button>
    {/each}
  </div>
  
  <!-- Exercise Picker Modal -->
  {#if showExercisePicker && selectedMuscleGroup}
    <div class="exercise-picker-modal" on:click|self={() => {
      showExercisePicker = false;
      selectedMuscleGroup = null;
      exerciseSearchTerm = '';
    }}>
      <div class="exercise-picker-content" on:click|stopPropagation>
        <div class="picker-header">
          <h3>{selectedMuscleGroup} Exercises</h3>
          <button type="button" class="close-btn" on:click={() => {
            showExercisePicker = false;
            selectedMuscleGroup = null;
            exerciseSearchTerm = '';
          }}>×</button>
        </div>
        
        <div class="picker-search">
          <input
            type="text"
            placeholder="Search exercises..."
            bind:value={exerciseSearchTerm}
            autofocus
          />
        </div>
        
        <div class="exercise-list">
          <!-- Recent Exercises from this muscle group (including custom exercises) -->
          {#if recentForGroup.length > 0}
            <div class="recent-section">
              <div class="recent-label">Recently Used ({recentForGroup.length})</div>
              {#each recentForGroup as recent}
                <button
                  type="button"
                  class="exercise-option recent-exercise"
                  on:click={() => addExercise(recent.name, recent.muscleGroup)}
                >
                  <span>{recent.name}</span>
                  <span class="recent-badge">Recent</span>
                </button>
              {/each}
              {#if filteredExercises.length > 0}
                <div class="divider"></div>
              {/if}
            </div>
          {/if}
          
          <!-- All Canonical Exercises for this muscle group (excluding recent) -->
          {#each filteredExercises as exerciseName}
            {@const isRecent = recentExercises.some(re => re.name === exerciseName && re.muscleGroup === selectedMuscleGroup)}
            {#if !isRecent}
              <button
                type="button"
                class="exercise-option"
                on:click={() => addExercise(exerciseName, selectedMuscleGroup)}
              >
                {exerciseName}
              </button>
            {/if}
          {/each}
          
          {#if filteredExercises.length === 0 && recentForGroup.length === 0}
            <div class="no-exercises">
              <p>No exercises found for {selectedMuscleGroup}</p>
            </div>
          {/if}
          </div>
          
          <!-- Also show Add Custom button even when exercises are found -->
          {#if filteredExercises.length > 0}
            <div class="custom-exercise-section">
              <button
                type="button"
                class="add-custom-btn"
              on:click={() => {
                showCustomExerciseForm = true;
                customExerciseData = {
                  movementType: '',
                  equipment: '',
                  variation: '',
                };
                customMovementTypeInput = '';
                customEquipmentInput = '';
              }}
              >
                + Add Custom Exercise
              </button>
            </div>
          {/if}
      </div>
    </div>
  {/if}
  
  <!-- Custom Exercise Form Modal -->
  {#if showCustomExerciseForm && selectedMuscleGroup}
    <div class="exercise-picker-modal" on:click|self={() => {
      showCustomExerciseForm = false;
      customExerciseData = { movementType: '', equipment: '', variation: '' };
    }}>
      <div class="exercise-picker-content custom-exercise-form" on:click|stopPropagation>
        <div class="picker-header">
          <h3>Add Custom {selectedMuscleGroup} Exercise</h3>
          <button type="button" class="close-btn" on:click={() => {
            showCustomExerciseForm = false;
            customExerciseData = { movementType: '', equipment: '', variation: '' };
          }}>×</button>
        </div>
        
        <div class="custom-form-content">
          <p class="form-help-text">Follow the naming convention: [Muscle Group] – [Movement Type] – [Equipment/Variation]</p>
          
          <div class="form-field">
            <label>Muscle Group</label>
            <input type="text" value={selectedMuscleGroup} readonly class="readonly-field" />
          </div>
          
          <div class="form-field">
            <label>Movement Type <span class="required">*</span></label>
            <select 
              bind:value={customExerciseData.movementType}
              class="form-select"
              on:change={(e) => {
                if (e.target.value !== '__custom__') {
                  customMovementTypeInput = '';
                }
              }}
            >
              <option value="">Select movement type...</option>
              {#each (movementTypes[selectedMuscleGroup] || []) as movement}
                <option value={movement}>{movement}</option>
              {/each}
              <option value="__custom__">Custom...</option>
            </select>
            {#if customExerciseData.movementType === '__custom__'}
              <input 
                type="text" 
                placeholder="Enter custom movement type..."
                class="form-input custom-input"
                bind:value={customMovementTypeInput}
                on:keydown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
              />
            {/if}
          </div>
          
          <div class="form-field">
            <label>Equipment/Variation <span class="required">*</span></label>
            <select 
              bind:value={customExerciseData.equipment}
              class="form-select"
              on:change={(e) => {
                if (e.target.value !== '__custom__') {
                  customEquipmentInput = '';
                } else {
                  // Keep it as '__custom__' when selecting Custom
                  customExerciseData.equipment = '__custom__';
                }
              }}
            >
              <option value="">Select equipment/variation...</option>
              {#each (equipmentOptions[selectedMuscleGroup] || []) as equipment}
                <option value={equipment}>{equipment}</option>
              {/each}
              <option value="__custom__">Custom...</option>
            </select>
            {#if customExerciseData.equipment === '__custom__'}
              <input 
                type="text" 
                placeholder="Enter custom equipment/variation..."
                class="form-input custom-input"
                bind:value={customEquipmentInput}
                on:keydown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
              />
            {/if}
          </div>
          
          <div class="form-preview">
            <label>Exercise Name Preview:</label>
            <div class="preview-name">
              {#if effectiveMovementType && effectiveEquipment}
                {selectedMuscleGroup} – {effectiveMovementType} – {effectiveEquipment}
              {:else}
                <span class="preview-placeholder">Complete the form above to see preview</span>
              {/if}
            </div>
          </div>
          
          <div class="form-actions">
            <button
              type="button"
              class="cancel-btn"
              on:click={() => {
                showCustomExerciseForm = false;
                customExerciseData = { movementType: '', equipment: '', variation: '' };
                customMovementTypeInput = '';
                customEquipmentInput = '';
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              class="save-custom-btn"
              disabled={!effectiveMovementType || !effectiveEquipment}
              on:click={() => {
                const movementType = effectiveMovementType;
                const equipment = effectiveEquipment;
                if (movementType && equipment) {
                  const exerciseName = `${selectedMuscleGroup} – ${movementType} – ${equipment}`;
                  addExercise(exerciseName, selectedMuscleGroup);
                  showCustomExerciseForm = false;
                  customExerciseData = { movementType: '', equipment: '', variation: '' };
                  customMovementTypeInput = '';
                  customEquipmentInput = '';
                }
              }}
            >
              Add Exercise
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Active Exercise Entry Cards (New entry area - stays at top) -->
  <div class="active-exercises-list">
    {#each exercises as exercise (exercise.id)}
      {#if !exercise.completed}
        <!-- Active Exercise Entry Card -->
        <div class="exercise-card">
          <div class="exercise-header">
            <div class="exercise-info">
              <div 
                class="muscle-badge" 
                style="border-color: {getMuscleGroupColor(exercise.muscleGroup)}; color: {getMuscleGroupColor(exercise.muscleGroup)}; background-color: {getMuscleGroupColor(exercise.muscleGroup)}20;"
              >
                {exercise.muscleGroup}
              </div>
              <h4 class="exercise-name">{exercise.name}</h4>
            </div>
            <button
              type="button"
              class="direction-btn"
              class:up={exercise.direction === 'up'}
              class:down={exercise.direction === 'down'}
              on:click={() => cycleDirection(exercise.id)}
              aria-label={exercise.direction === 'up' ? 'Felt good last time, try increasing' : exercise.direction === 'down' ? 'Struggled last time' : 'Set how last session felt'}
              title={exercise.direction === 'up' ? 'Felt good – try heavier' : exercise.direction === 'down' ? 'Struggled – consider lighter' : 'Tap to set: up = try heavier, down = struggled'}
            >
              {#if exercise.direction === 'up'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
              {:else if exercise.direction === 'down'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              {:else}
                <span class="direction-placeholder">−</span>
              {/if}
            </button>
          </div>
          
          <div class="sets-container">
            <div class="sets-header">
              <span>Set</span>
              <span>Weight (lbs)</span>
              <span>Reps</span>
              <span></span>
            </div>
            <div class="sets-rows-scroll">
            {#each exercise.sets as set, index (set.id)}
              <div class="set-row">
                <span class="set-number">{index + 1}</span>
                <input
                  type="number"
                  step="0.5"
                  placeholder="0"
                  value={set.weight}
                  on:input={(e) => {
                    const value = e.target.value;
                    // Just update the current field on input, don't auto-fill yet
                    updateSet(exercise.id, set.id, 'weight', value);
                  }}
                  on:blur={(e) => {
                    const value = e.target.value;
                    // On blur, auto-fill empty weights with this value
                    if (value) {
                      exercises = exercises.map(ex => {
                        if (ex.id === exercise.id) {
                          return {
                            ...ex,
                            sets: ex.sets.map(s => ({
                              ...s,
                              // Fill empty weights with the value from the field that just lost focus
                              weight: (!s.weight || s.weight === '') ? value : s.weight
                            }))
                          };
                        }
                        return ex;
                      });
                      dispatch('exercisesChanged', exercises);
                    }
                  }}
                />
                <input
                  type="number"
                  step="1"
                  placeholder="10"
                  value={set.reps}
                  on:input={(e) => updateSet(exercise.id, set.id, 'reps', e.target.value)}
                  on:blur={(e) => {
                    const value = e.target.value;
                    if (value) {
                      exercises = exercises.map(ex => {
                        if (ex.id === exercise.id) {
                          return {
                            ...ex,
                            sets: ex.sets.map(s => ({
                              ...s,
                              reps: (!s.reps || s.reps === '') ? value : s.reps
                            }))
                          };
                        }
                        return ex;
                      });
                      dispatch('exercisesChanged', exercises);
                    }
                  }}
                />
                <button
                  type="button"
                  class="remove-set-btn"
                  on:click={() => removeSet(exercise.id, set.id)}
                  disabled={exercise.sets.length === 1}
                  aria-label="Remove set"
                >
                  ×
                </button>
              </div>
            {/each}
            </div>
            <div class="exercise-actions">
              <button type="button" class="add-set-btn" on:click={() => addSet(exercise.id)}>
                + Add Set
              </button>
              <button 
                type="button" 
                class="delete-exercise-btn" 
                on:click={() => {
                  if (confirm('Delete this exercise? This action cannot be undone.')) {
                    deleteExercise(exercise.id);
                  }
                }}
                aria-label="Delete exercise"
              >
                Delete
              </button>
              <button 
                type="button" 
                class="complete-exercise-btn" 
                on:click={() => completeExercise(exercise.id)}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      {/if}
    {/each}
  </div>
  </div>
  
  <!-- Previously Logged Exercises (below fold - scroll to see) -->
  <div class="exercises-list">
    {#each exercises as exercise (exercise.id)}
      {#if exercise.completed}
        <div 
          class="exercise-pill clickable-pill" 
          style="border-left: 3px solid {getMuscleGroupColor(exercise.muscleGroup)};"
          on:click={() => reopenExerciseForEditing(exercise.id)}
          role="button"
          tabindex="0"
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              reopenExerciseForEditing(exercise.id);
            }
          }}
        >
          <div class="pill-info">
            <div class="pill-header">
              <span class="pill-badge" style="background-color: {getMuscleGroupColor(exercise.muscleGroup)}20; color: {getMuscleGroupColor(exercise.muscleGroup)};">
                {exercise.muscleGroup}
              </span>
              <span class="pill-name">{exercise.name}</span>
            </div>
            <span class="pill-stats">
              {calculateTotalReps(exercise.sets)} reps • {calculateTotalVolume(exercise.sets).toLocaleString('en-US', { maximumFractionDigits: 0 })} lbs
            </span>
          </div>
          <button
            type="button"
            class="direction-btn pill-direction-btn"
            class:up={exercise.direction === 'up'}
            class:down={exercise.direction === 'down'}
            on:click|stopPropagation={(e) => {
              e.preventDefault();
              cycleDirection(exercise.id);
            }}
            aria-label={exercise.direction === 'up' ? 'Felt good – try heavier next time' : exercise.direction === 'down' ? 'Struggled – consider lighter next time' : 'Set for next time'}
            title="Tap to set: up = try heavier, down = struggled, − = same"
          >
            {#if exercise.direction === 'up'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
            {:else if exercise.direction === 'down'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            {:else}
              <span class="direction-placeholder">−</span>
            {/if}
          </button>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .workout-exercises {
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }

  .workout-new-entry {
    display: flex;
    flex-direction: column;
  }
  
  .muscle-group-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    width: 100%;
    max-width: 100%;
  }
  
  .muscle-group-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-xs);
    background-color: var(--surface-elevated);
    border: 2px solid var(--border);
    border-radius: var(--border-radius-sm);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
    min-width: 0;
    overflow: hidden;
  }
  
  .muscle-group-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow);
    background-color: var(--surface);
  }
  
  .muscle-icon {
    font-size: 1.5rem;
  }
  
  .muscle-name {
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  
  .exercise-picker-modal {
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
  
  .exercise-picker-content {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    width: 100%;
    max-width: 500px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
  }
  
  .picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border);
  }
  
  .picker-header h3 {
    margin: 0;
    font-size: 1.125rem;
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
    border-radius: var(--border-radius-sm);
    transition: background-color 0.2s;
  }
  
  .close-btn:hover {
    background-color: var(--surface-elevated);
  }
  
  .picker-search {
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border);
  }
  
  .picker-search input {
    width: 100%;
  }
  
  .exercise-list {
    padding: var(--spacing-sm);
    overflow-y: auto;
    flex: 1;
  }
  
  .exercise-option {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    text-align: left;
    background-color: transparent;
    border: none;
    border-radius: var(--border-radius-sm);
    color: var(--text-primary);
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 0.875rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .exercise-option:hover {
    background-color: var(--surface-elevated);
  }

  .recent-section {
    margin-bottom: var(--spacing-md);
  }

  .recent-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    padding: var(--spacing-xs) var(--spacing-md);
    margin-bottom: var(--spacing-xs);
  }

  .recent-exercise {
    color: var(--primary-color);
  }

  .recent-badge {
    font-size: 0.625rem;
    font-weight: 600;
    padding: 2px 6px;
    background-color: rgba(59, 130, 246, 0.15);
    color: var(--primary-color);
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .divider {
    height: 1px;
    background-color: var(--border);
    margin: var(--spacing-sm) 0;
  }
  
  .no-exercises {
    padding: var(--spacing-xl);
    text-align: center;
    color: var(--text-secondary);
  }
  
  .add-custom-btn {
    margin-top: var(--spacing-md);
    background-color: var(--primary-color);
    color: white;
  }

  /* Mobile: larger interactive fonts (dev evaluation) */
  @media (max-width: 767px) {
    .picker-header h3 {
      font-size: 1.375rem;
    }
    .picker-search input {
      font-size: 1.125rem;
      padding: var(--spacing-md);
      min-height: 2.75rem;
    }
    .exercise-option {
      font-size: 1.125rem;
      padding: var(--spacing-md) var(--spacing-lg);
      min-height: 2.75rem;
    }
    .recent-label {
      font-size: 0.9375rem;
    }
    .recent-badge {
      font-size: 0.75rem;
    }
    .add-custom-btn {
      font-size: 1.125rem;
      padding: var(--spacing-md) var(--spacing-lg);
      min-height: 2.75rem;
    }
    .exercise-name {
      font-size: 1.125rem;
    }
    .muscle-badge {
      font-size: 0.875rem;
    }
    .sets-header {
      font-size: 0.875rem;
    }
    .set-row input,
    .set-number {
      font-size: 1rem;
    }
    .add-set-btn,
    .delete-exercise-btn,
    .complete-exercise-btn {
      font-size: 1rem;
    }
    .pill-badge {
      font-size: 0.6875rem;
    }
    .pill-name {
      font-size: 1.125rem;
    }
    .muscle-name {
      font-size: 0.9375rem;
    }
    .pill-stats {
      font-size: 0.8125rem;
    }
    /* Compact new-entry area: no scroll, all fits on one screen, logged exercises below fold */
    .muscle-group-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-xs);
      flex-shrink: 0;
    }
    .muscle-group-btn {
      padding: 4px 2px;
      min-height: 40px;
    }
    .muscle-icon {
      font-size: 1.1rem;
    }
    .muscle-group-btn .muscle-name {
      font-size: 0.6rem;
    }
    .active-exercises-list {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }
    .active-exercises-list .exercise-card {
      padding: var(--spacing-xs) var(--spacing-sm);
      flex-shrink: 0;
    }
    .active-exercises-list .exercise-header {
      margin-bottom: 2px;
    }
    .active-exercises-list .sets-container {
      margin-top: 2px;
    }
    .active-exercises-list .sets-header {
      padding: 2px 0;
      margin-bottom: var(--spacing-xs);
      font-size: 0.7rem;
    }
    .active-exercises-list .set-row {
      margin-bottom: var(--spacing-xs);
    }
    .active-exercises-list .set-row input {
      padding: 4px 6px;
      font-size: 0.9rem;
      min-height: 32px;
    }
    .active-exercises-list .exercise-actions {
      margin-top: var(--spacing-xs);
      padding-top: var(--spacing-xs);
      flex-shrink: 0;
    }
    .active-exercises-list .add-set-btn,
    .active-exercises-list .delete-exercise-btn,
    .active-exercises-list .complete-exercise-btn {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: 0.875rem;
      min-height: 36px;
    }
    .workout-new-entry.has-active {
      min-height: calc(100svh - 200px);
    }
    .exercises-list {
      margin-top: var(--spacing-lg);
    }
  }
  
  .exercises-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    width: 100%;
    max-width: 100%;
  }
  
  @media (max-width: 768px) {
    .exercises-list {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (max-width: 480px) {
    .exercises-list {
      grid-template-columns: 1fr;
    }
  }
  
  .active-exercises-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    width: 100%;
    max-width: 100%;
  }
  
  .exercise-card {
    background-color: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    padding: var(--spacing-md);
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }
  
  .exercise-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }
  
  .exercise-info {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }
  
  .muscle-badge {
    display: inline-block;
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: rgba(59, 130, 246, 0.15);
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .exercise-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .direction-btn {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: var(--border-radius-sm);
    border: 1px solid var(--border);
    background: var(--surface-elevated);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .direction-btn:hover {
    background: var(--border);
  }
  .direction-btn.up {
    color: #22c55e;
    border-color: rgba(34, 197, 94, 0.5);
    background: rgba(34, 197, 94, 0.15);
  }
  .direction-btn.down {
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.5);
    background: rgba(239, 68, 68, 0.15);
  }
  .direction-placeholder {
    font-size: 1.25rem;
    line-height: 1;
    opacity: 0.5;
  }

  .pill-direction-btn {
    flex-shrink: 0;
    align-self: center;
  }
  
  .sets-container {
    margin-top: var(--spacing-sm);
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }

  .sets-header {
    display: grid;
    grid-template-columns: 40px 1fr 1fr 32px;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) 0;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--spacing-sm);
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }
  
  .set-row {
    display: grid;
    grid-template-columns: 40px 1fr 1fr 32px;
    gap: var(--spacing-sm);
    align-items: center;
    margin-bottom: var(--spacing-sm);
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }
  
  .set-number {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-align: center;
  }
  
  .set-row input {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.875rem;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }
  
  .remove-set-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius-sm);
    transition: all 0.2s;
    opacity: 0.5;
  }
  
  .remove-set-btn:hover:not(:disabled) {
    color: #ef4444;
    opacity: 1;
  }
  
  .remove-set-btn:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }
  
  .exercise-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-sm);
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
    max-width: 100%;
  }
  
  .add-set-btn {
    flex: 1 1 auto;
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.875rem;
    min-width: 0;
  }
  
  .add-set-btn:hover {
    background-color: var(--surface-elevated);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
  
  .delete-exercise-btn {
    padding: var(--spacing-xs) var(--spacing-md);
    background-color: transparent;
    border: 1px solid #ef4444;
    color: #ef4444;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  
  .delete-exercise-btn:hover {
    background-color: rgba(239, 68, 68, 0.1);
    border-color: #dc2626;
    color: #dc2626;
  }
  
  .complete-exercise-btn {
    padding: var(--spacing-xs) var(--spacing-md);
    background-color: var(--primary-color);
    border: 1px solid var(--primary-color);
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  
  .complete-exercise-btn:hover {
    background-color: var(--primary-hover);
    border-color: var(--primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow);
  }
  
  .exercise-pill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    margin-bottom: 0;
    min-height: 80px;
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }
  
  .exercise-pill.clickable-pill {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .exercise-pill.clickable-pill:hover {
    background-color: var(--surface);
    border-color: var(--primary-color);
    transform: translateY(-1px);
    box-shadow: var(--shadow);
  }
  
  .exercise-pill.clickable-pill:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  
  .pill-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  
  .pill-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
  }
  
  .pill-badge {
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 1px 4px;
    border-radius: 3px;
  }
  
  .pill-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.75rem;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
  }
  
  .pill-stats {
    font-size: 0.625rem;
    color: var(--text-secondary);
    margin-top: 2px;
    line-height: 1.2;
  }
  
  
  .custom-exercise-section {
    padding: var(--spacing-md);
    border-top: 1px solid var(--border);
    margin-top: var(--spacing-sm);
  }
  
  .custom-exercise-form {
    max-width: 600px;
  }
  
  .form-help-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm);
    background-color: var(--surface-elevated);
    border-radius: var(--border-radius-sm);
    border-left: 3px solid var(--primary-color);
  }
  
  .custom-form-content {
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .form-field label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .required {
    color: #ef4444;
  }
  
  .readonly-field {
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: not-allowed;
  }
  
  .form-select {
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  
  .form-select:hover {
    border-color: var(--primary-color);
  }
  
  .form-select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .form-input {
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    color: var(--text-primary);
    font-size: 0.875rem;
    margin-top: var(--spacing-xs);
  }
  
  .form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .custom-input {
    margin-top: var(--spacing-xs);
  }
  
  .form-preview {
    padding: var(--spacing-md);
    background-color: var(--surface-elevated);
    border-radius: var(--border-radius-sm);
    border: 1px solid var(--border);
  }
  
  .form-preview label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
    display: block;
  }
  
  .preview-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--primary-color);
    padding: var(--spacing-sm);
    background-color: var(--surface);
    border-radius: var(--border-radius-sm);
    min-height: 2rem;
    display: flex;
    align-items: center;
  }
  
  .preview-placeholder {
    color: var(--text-muted);
    font-weight: 400;
    font-style: italic;
  }
  
  .form-actions {
    display: flex;
    gap: var(--spacing-sm);
    justify-content: flex-end;
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border);
  }
  
  .cancel-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    background-color: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.875rem;
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-btn:hover {
    background-color: var(--surface-elevated);
    border-color: var(--text-secondary);
  }
  
  .save-custom-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    background-color: var(--primary-color);
    border: 1px solid var(--primary-color);
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .save-custom-btn:hover:not(:disabled) {
    background-color: var(--primary-hover);
    border-color: var(--primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow);
  }
  
  .save-custom-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
