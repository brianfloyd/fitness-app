<script>
  export let label;
  export let value = '';
  export let type = 'text';
  export let placeholder = '';
  export let step = null;
  export let min = null;
  export let max = null;
  export let readonly = false;
</script>

<div class="metric-input">
  <label>{label}</label>
  <input
    type={type}
    value={value}
    {placeholder}
    {step}
    {min}
    {max}
    readonly={readonly}
    on:input={(e) => value = e.target.value}
    on:change
  />
</div>

<style>
  .metric-input {
    margin-bottom: var(--spacing-md);
  }
</style>
