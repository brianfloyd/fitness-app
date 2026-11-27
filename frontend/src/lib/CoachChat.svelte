<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { getCoachStatus, chatWithCoach } from './api.js';
  
  const dispatch = createEventDispatcher();
  
  let available = false;
  let model = null;
  let statusMessage = '';
  let loading = true;
  let sending = false;
  let error = null;
  
  let messages = [];
  let inputMessage = '';
  let chatContainer;
  
  const QUICK_PROMPTS = [
    { label: '📊 Weekly summary', message: 'Give me a quick summary of my week - weight trend, workout volume, and nutrition.' },
    { label: '🏋️ Progression check', message: 'Looking at my recent workouts, should I increase weight on any exercises?' },
    { label: '⚠️ Pain management', message: 'I\'ve been logging some pain. What exercises should I modify or substitute?' },
    { label: '🛹 Skate progress', message: 'How is my skateboard training looking for Ultraskate prep?' },
    { label: '🍽️ Nutrition check', message: 'Am I hitting my protein and calorie targets this week?' },
  ];
  
  onMount(async () => {
    try {
      const status = await getCoachStatus();
      available = status.available;
      model = status.model;
      statusMessage = status.message;
    } catch (err) {
      statusMessage = 'Could not check coach status';
    } finally {
      loading = false;
    }
  });
  
  async function sendMessage(text = inputMessage) {
    if (!text.trim() || sending || !available) return;
    
    const userMessage = text.trim();
    messages = [...messages, { role: 'user', content: userMessage }];
    inputMessage = '';
    sending = true;
    error = null;
    
    // Scroll to bottom
    setTimeout(() => {
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 10);
    
    try {
      const response = await chatWithCoach(userMessage);
      messages = [...messages, { 
        role: 'assistant', 
        content: response.reply,
        context: response.context,
      }];
    } catch (err) {
      error = err.message || 'Failed to get response';
      messages = [...messages, { 
        role: 'assistant', 
        content: `Sorry, I encountered an error: ${error}`,
        isError: true,
      }];
    } finally {
      sending = false;
      setTimeout(() => {
        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 10);
    }
  }
  
  function handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
  
  function handleClose() {
    dispatch('close');
  }
</script>

<div class="coach-chat">
  <div class="chat-header">
    <div class="header-left">
      <h2>🤖 AI Coach</h2>
      {#if model}
        <span class="model-badge">{model}</span>
      {/if}
    </div>
    <button type="button" class="close-btn" on:click={handleClose}>×</button>
  </div>
  
  {#if loading}
    <div class="loading-state">Checking coach availability...</div>
  {:else if !available}
    <div class="unavailable-state">
      <div class="unavailable-icon">🔧</div>
      <h3>AI Coach Not Configured</h3>
      <p>{statusMessage}</p>
      <div class="env-hint">
        Set these environment variables on Railway:
        <ul>
          <li><code>COACH_API_KEY</code> - Your API key</li>
          <li><code>COACH_BASE_URL</code> - API endpoint (default: OpenAI)</li>
          <li><code>COACH_MODEL</code> - Model name (default: gpt-4o)</li>
        </ul>
      </div>
    </div>
  {:else}
    <div class="chat-body">
      <div class="quick-prompts">
        {#each QUICK_PROMPTS as prompt}
          <button 
            type="button" 
            class="quick-prompt-btn" 
            on:click={() => sendMessage(prompt.message)}
            disabled={sending}
          >
            {prompt.label}
          </button>
        {/each}
      </div>
      
      <div class="chat-messages" bind:this={chatContainer}>
        {#if messages.length === 0}
          <div class="empty-chat">
            <p>Ask me about your workouts, nutrition, pain management, or skateboard training.</p>
            <p>I have access to your recent training data to give personalized advice.</p>
          </div>
        {:else}
          {#each messages as msg, i}
            <div class="message {msg.role}" class:error={msg.isError}>
              <div class="message-content">{msg.content}</div>
              {#if msg.context}
                <div class="message-context">
                  Phase: {msg.context.phase}
                  {#if msg.context.block_number} · Block {msg.context.block_number}{/if}
                   · Analyzed {msg.context.logs_analyzed} days
                </div>
              {/if}
            </div>
          {/each}
          {#if sending}
            <div class="message assistant typing">
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          {/if}
        {/if}
      </div>
      
      <div class="chat-input">
        <input 
          type="text" 
          bind:value={inputMessage}
          on:keydown={handleKeydown}
          placeholder="Ask your coach..."
          disabled={sending}
        />
        <button 
          type="button" 
          class="send-btn" 
          on:click={() => sendMessage()}
          disabled={sending || !inputMessage.trim()}
        >
          {#if sending}
            <span class="spinner"></span>
          {:else}
            Send
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .coach-chat {
    background: var(--surface);
    border-radius: var(--border-radius);
    max-width: 700px;
    width: 100%;
    height: 80vh;
    max-height: 600px;
    display: flex;
    flex-direction: column;
  }
  
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--border);
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  
  .header-left h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }
  
  .model-badge {
    padding: 2px 8px;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    color: var(--text-muted);
  }
  
  .close-btn {
    width: 32px;
    height: 32px;
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--border-radius-sm);
  }
  
  .close-btn:hover {
    background: var(--surface-elevated);
  }
  
  .loading-state, .unavailable-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
    text-align: center;
  }
  
  .unavailable-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
  }
  
  .unavailable-state h3 {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-primary);
  }
  
  .unavailable-state p {
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-md) 0;
  }
  
  .env-hint {
    text-align: left;
    padding: var(--spacing-md);
    background: var(--surface-elevated);
    border-radius: var(--border-radius-sm);
    font-size: 0.875rem;
  }
  
  .env-hint ul {
    margin: var(--spacing-sm) 0 0 0;
    padding-left: var(--spacing-lg);
  }
  
  .env-hint code {
    padding: 1px 4px;
    background: var(--surface);
    border-radius: 3px;
    font-size: 0.8125rem;
  }
  
  .chat-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  
  .quick-prompts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--border);
  }
  
  .quick-prompt-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    color: var(--text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .quick-prompt-btn:hover:not(:disabled) {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
  
  .quick-prompt-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .empty-chat {
    text-align: center;
    color: var(--text-muted);
    padding: var(--spacing-xl);
  }
  
  .empty-chat p {
    margin: 0 0 var(--spacing-sm) 0;
  }
  
  .message {
    max-width: 85%;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-sm);
  }
  
  .message.user {
    align-self: flex-end;
    background: var(--primary-color);
    color: white;
  }
  
  .message.assistant {
    align-self: flex-start;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
  }
  
  .message.error {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
  
  .message-content {
    white-space: pre-wrap;
    line-height: 1.5;
  }
  
  .message-context {
    margin-top: var(--spacing-xs);
    font-size: 0.75rem;
    color: var(--text-muted);
  }
  
  .typing-indicator {
    display: flex;
    gap: 4px;
  }
  
  .typing-indicator span {
    width: 8px;
    height: 8px;
    background: var(--text-muted);
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;
  }
  
  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  @keyframes typing {
    0%, 60%, 100% { opacity: 0.3; }
    30% { opacity: 1; }
  }
  
  .chat-input {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-top: 1px solid var(--border);
  }
  
  .chat-input input {
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-sm);
    color: var(--text-primary);
    font-size: 0.9375rem;
  }
  
  .chat-input input:focus {
    outline: none;
    border-color: var(--primary-color);
  }
  
  .send-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--primary-color);
    border: none;
    border-radius: var(--border-radius-sm);
    color: white;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 70px;
  }
  
  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
