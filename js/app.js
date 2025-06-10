// App.js - Enhanced with Session Support for Conversation Context
document.addEventListener('DOMContentLoaded', function() {
  // Configuration
  const API_URL = 'https://portfolio-bot-backend-git-bot-20-tapaspatra.vercel.app/api';

  // DOM References
  const loadingOverlay = document.getElementById('loading-overlay');
  const chatMessages = document.getElementById('chat-messages');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const clearChatButton = document.getElementById('clear-chat');
  const introPanel = document.getElementById('intro-panel');
  const suggestionChips = document.querySelectorAll('.suggestion-chip');

  // Track initialization state
  let isInitialized = false;
  
  // 🆕 SESSION MANAGEMENT - Generate unique session ID for conversation context
  let sessionId = generateSessionId();
  
  // 🆕 Generate a unique session ID
  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Initialize the application
  async function initializeApp() {
    // Show loading overlay
    loadingOverlay.classList.remove('hidden');

    try {
      // Check if the API is available
      const response = await fetch(`${API_URL}/health`);

      if (!response.ok) {
        throw new Error('API not available');
      }

      // Initialize is complete
      isInitialized = true;

      // Hide loading overlay
      loadingOverlay.classList.add('hidden');

      // Add welcome message
      setTimeout(() => {
        addBotMessage("Hi there! How can I help you today?");
      }, 500);

    } catch (error) {
      console.error('Initialization error:', error);
      loadingOverlay.classList.add('hidden');

      // Show error message
      addErrorMessage("I'm having trouble connecting to my knowledge base. Please try again later.");
    }
  }

  // Add event listeners
  function setupEventListeners() {
    // Send button click
    sendButton.addEventListener('click', handleUserMessage);

    // Enter key in textarea
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserMessage();
      }
    });

    // Input changes (for enabling/disabling send button)
    userInput.addEventListener('input', () => {
      // Adjust textarea height based on content
      userInput.style.height = 'auto';
      userInput.style.height = `${Math.min(userInput.scrollHeight, 120)}px`;

      // Enable/disable send button based on input
      sendButton.disabled = userInput.value.trim() === '';
    });

    // 🆕 ENHANCED Clear chat button - now also resets session
    clearChatButton.addEventListener('click', () => {
      // Clear messages
      chatMessages.innerHTML = '';
      
      // 🆕 Generate new session ID for fresh conversation
      sessionId = generateSessionId();
      console.log('New conversation session started:', sessionId);

      // Show intro panel
      introPanel.classList.remove('hidden');

      // Add welcome message
      setTimeout(() => {
        addBotMessage("I've cleared our conversation. How else can I help you?");
      }, 300);
    });

    // Suggestion chips
    suggestionChips.forEach(chip => {
      chip.addEventListener('click', () => {
        // Hide intro panel
        introPanel.classList.add('hidden');

        // Get query from data attribute
        const query = chip.getAttribute('data-query');

        // Set input value
        userInput.value = query;

        // Trigger input event to adjust height and enable send button
        userInput.dispatchEvent(new Event('input'));

        // Send message
        handleUserMessage();
      });
    });
  }

  // 🆕 ENHANCED Handle user message with session support
  async function handleUserMessage() {
    const message = userInput.value.trim();

    // Don't process empty messages
    if (!message) return;

    // Don't process if not initialized
    if (!isInitialized) {
      addErrorMessage("I'm still getting ready. Please wait a moment and try again.");
      return;
    }

    // Check for mode-switching commands
    if (message.toLowerCase() === 'uimode' || message.toLowerCase() === 'ui mode' ||
        message.toLowerCase() === 'switch to ui mode') {
      // Add user message to chat
      addUserMessage(message);

      // Clear input and reset height
      userInput.value = '';
      userInput.style.height = 'auto';

      // Add bot response
      addBotMessage("Switching to UI mode...");

      // Set mode in localStorage and redirect
      setTimeout(() => {
        localStorage.setItem('portfolioMode', 'ui');
        window.location.href = 'index.html';
      }, 1000);

      return;
    }

    if (message.toLowerCase() === 'climode' || message.toLowerCase() === 'cli mode' ||
        message.toLowerCase() === 'switch to cli mode') {
      // Add user message to chat
      addUserMessage(message);

      // Clear input and reset height
      userInput.value = '';
      userInput.style.height = 'auto';

      // Add bot response
      addBotMessage("Switching to CLI mode...");

      // Set mode in localStorage and redirect
      setTimeout(() => {
        localStorage.setItem('portfolioMode', 'cli');
        window.location.href = 'index.html?mode=cli';
      }, 1000);

      return;
    }

    // Hide intro panel if visible
    introPanel.classList.add('hidden');

    // Add user message to chat
    addUserMessage(message);

    // Clear input and reset height
    userInput.value = '';
    userInput.style.height = 'auto';
    userInput.focus();

    // Disable send button
    sendButton.disabled = true;

    // Show thinking indicator
    const thinkingIndicator = addThinkingIndicator();

    try {
      // 🆕 ENHANCED API request with session support
      const requestBody = { 
        query: message,
        sessionId: sessionId  // Include session ID for conversation context
      };

      console.log('Sending message with session:', sessionId);

      // Send request to backend API
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data = await response.json();

      // Remove thinking indicator
      chatMessages.removeChild(thinkingIndicator);

      // Add bot response
      addBotMessage(data.response);
      
      // 🆕 Log session info for debugging (optional)
      if (data.sessionId) {
        console.log('Response from session:', data.sessionId);
      }

    } catch (error) {
      // Remove thinking indicator
      chatMessages.removeChild(thinkingIndicator);

      // Add error message
      addErrorMessage("I'm having trouble generating a response right now. Please try again later.");
      console.error("Error generating response:", error);
    }
  }

  // Add user message to chat
  function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message message-user';

    // Format the message text (replacing URLs, etc)
    messageElement.innerHTML = formatMessageText(message);

    // Add to chat and scroll to bottom
    chatMessages.appendChild(messageElement);
    scrollToBottom();
  }

  // Add bot message to chat
  function addBotMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message message-bot';

    // Process markdown-like formatting
    const formattedMessage = formatMessageText(message);

    messageElement.innerHTML = formattedMessage;
    chatMessages.appendChild(messageElement);
    scrollToBottom();
  }

  // Add error message
  function addErrorMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message message-bot error';
    messageElement.innerHTML = `<p>⚠️ ${message}</p>`;
    chatMessages.appendChild(messageElement);
    scrollToBottom();
  }

  // Add thinking indicator
  function addThinkingIndicator() {
    const thinkingElement = document.createElement('div');
    thinkingElement.className = 'message message-bot thinking';

    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'thinking-dots';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'thinking-dot';
      dotsContainer.appendChild(dot);
    }

    thinkingElement.appendChild(dotsContainer);
    chatMessages.appendChild(thinkingIndicator);
    scrollToBottom();

    return thinkingElement;
  }

  // Format message text (handles code blocks, links, etc.)
  function formatMessageText(text) {
    // Replace code blocks with <pre><code> elements
    let formattedText = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Replace inline code with <code> elements
    formattedText = formattedText.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Auto-link URLs
    formattedText = formattedText.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Replace newlines with <br>
    formattedText = formattedText.replace(/\n/g, '<br>');

    return formattedText;
  }

  // Scroll to bottom of messages
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Initialize the app
  setupEventListeners();
  initializeApp();
});
