<script>
  export let value = '';
  export let label = 'Sleep Time (hours:minutes)';
  
  let hours = '';
  let minutes = '';
  let isInternalUpdate = false; // Flag to prevent reactive loops
  
  // Parse existing value (could be HH:MM or HH:MM:SS)
  function parseValue(val) {
    if (!val) return { hours: '', minutes: '' };
    
    // Handle HH:MM:SS format from database
    const parts = val.split(':');
    if (parts.length >= 2) {
      return {
        hours: parts[0].replace(/^0+/, '') || '', // Remove leading zeros for display
        minutes: parts[1].replace(/^0+/, '') || '', // Remove leading zeros for display
      };
    }
    
    return { hours: '', minutes: '' };
  }
  
  // Sanitize and validate hours
  function sanitizeHours(val) {
    let sanitized = val.replace(/\D/g, ''); // Only digits
    if (sanitized.length > 2) sanitized = sanitized.slice(0, 2);
    if (sanitized && parseInt(sanitized) > 23) sanitized = '23';
    return sanitized;
  }
  
  // Sanitize and validate minutes
  function sanitizeMinutes(val) {
    let sanitized = val.replace(/\D/g, ''); // Only digits
    if (sanitized.length > 2) sanitized = sanitized.slice(0, 2);
    if (sanitized && parseInt(sanitized) > 59) sanitized = '59';
    return sanitized;
  }
  
  // Update value when hours or minutes change
  function updateValue() {
    if (isInternalUpdate) return; // Prevent loops
    
    isInternalUpdate = true;
    if (hours && minutes) {
      const h = hours.padStart(2, '0');
      const m = minutes.padStart(2, '0');
      value = `${h}:${m}`;
    } else if (hours) {
      value = `${hours.padStart(2, '0')}:`;
    } else if (minutes) {
      value = `:${minutes.padStart(2, '0')}`;
    } else {
      value = '';
    }
    isInternalUpdate = false;
  }
  
  function handleHoursInput(e) {
    const rawValue = e.target.value;
    const sanitized = sanitizeHours(rawValue);
    if (hours !== sanitized) {
      hours = sanitized;
      updateValue();
    } else if (rawValue !== sanitized) {
      // If the raw value differs from sanitized, update the input
      e.target.value = sanitized;
    }
  }
  
  function handleMinutesInput(e) {
    const rawValue = e.target.value;
    const sanitized = sanitizeMinutes(rawValue);
    if (minutes !== sanitized) {
      minutes = sanitized;
      updateValue();
    } else if (rawValue !== sanitized) {
      // If the raw value differs from sanitized, update the input
      e.target.value = sanitized;
    }
  }
  
  // React to value prop changes from parent (only when not from internal update)
  $: {
    if (!isInternalUpdate && value !== undefined) {
      const parsed = parseValue(value);
      // Only update if different to avoid infinite loops
      if (parsed.hours !== hours || parsed.minutes !== minutes) {
        hours = parsed.hours;
        minutes = parsed.minutes;
      }
    }
  }
</script>

<div class="metric-input sleep-time-input">
  <label>{label}</label>
  <div class="sleep-time-container">
    <input
      type="text"
      inputmode="numeric"
      class="hours-input"
      value={hours}
      on:input={handleHoursInput}
      placeholder="00"
      maxlength="2"
      size="2"
    />
    <span class="separator">:</span>
    <input
      type="text"
      inputmode="numeric"
      class="minutes-input"
      value={minutes}
      on:input={handleMinutesInput}
      placeholder="00"
      maxlength="2"
      size="2"
    />
  </div>
</div>

<style>
  .sleep-time-input {
    margin-bottom: var(--spacing-md);
  }
  
  .sleep-time-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
  
  .hours-input,
  .minutes-input {
    width: 60px;
    text-align: center;
    padding: var(--spacing-sm) var(--spacing-xs);
    font-size: 1rem;
  }
  
  .separator {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    user-select: none;
  }
  
  @media (min-width: 768px) {
    .hours-input,
    .minutes-input {
      width: 70px;
    }
  }
</style>
