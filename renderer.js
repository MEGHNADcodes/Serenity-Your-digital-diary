(function () {
  const storageKey = 'serenity-diary-state-v1';
  const draftKey = 'serenity-diary-draft-v1';

  const defaultEntries = [
    {
      id: 'entry-1',
      title: 'A soft evening',
      date: '2026-06-27',
      mood: 'Calm',
      text: 'Today I let the quiet hold me. I took a slow breath and remembered that rest is not a failure.',
      preview: 'Today I let the quiet hold me. I took a slow breath and remembered that rest is not a failure.'
    },
    {
      id: 'entry-2',
      title: 'A little hope',
      date: '2026-06-25',
      mood: 'Happy',
      text: 'I noticed the smallest signs of joy today: warm tea, a bright window, and a kind message.',
      preview: 'I noticed the smallest signs of joy today: warm tea, a bright window, and a kind message.'
    }
  ];

  function loadEntries() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaultEntries;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : defaultEntries;
    } catch (error) {
      return defaultEntries;
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(storageKey, JSON.stringify(entries));
  }

  function getEntries() {
    return loadEntries();
  }

  function createEntry(text) {
    const entries = getEntries();
    const mood = document.querySelector('.mood-chip.selected')?.textContent.trim() || 'Calm';
    const entry = {
      id: `entry-${Date.now()}`,
      title: text.split('\n')[0].slice(0, 40) || 'Untitled entry',
      date: new Date().toISOString(),
      mood,
      text,
      preview: text.slice(0, 120)
    };
    entries.unshift(entry);
    saveEntries(entries.slice(0, 8));
    return entry;
  }

  function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good Evening 🌙';
    if (hour < 12) greeting = 'Good Morning ☀️';
    else if (hour < 18) greeting = 'Good Afternoon 🌤️';

    const profileGreeting = document.querySelector('.profile-greeting');
    if (profileGreeting) profileGreeting.textContent = greeting;
  }

  function updateStats() {
    const entries = getEntries();
    const totalEntries = entries.length;
    const totalWords = entries.reduce((sum, entry) => sum + entry.text.split(/\s+/).filter(Boolean).length, 0);
    const todayEntries = entries.filter(entry => new Date(entry.date).toDateString() === new Date().toDateString()).length;
    const streak = Math.min(totalEntries, 7);

    const streakCount = document.querySelector('.streak-count');
    if (streakCount) streakCount.textContent = `${streak} days`;

    const streakBar = document.querySelector('.streak-bar');
    if (streakBar) streakBar.style.width = `${Math.min(streak * 10, 100)}%`;

    const statValues = document.querySelectorAll('.stats-card .stat-value');
    if (statValues[0]) statValues[0].textContent = totalEntries;
    if (statValues[1]) statValues[1].textContent = todayEntries;
    if (statValues[2]) statValues[2].textContent = totalWords;

    const memoryCount = document.querySelector('.jar-count');
    if (memoryCount) memoryCount.textContent = `${totalEntries} memories`;

    const jarProgress = document.querySelector('.jar-progress');
    if (jarProgress) jarProgress.textContent = `${Math.min(totalEntries * 10, 100)}% full`;
  }

  function renderEntries() {
    const container = document.querySelector('.entries-carousel');
    if (!container) return;

    const entries = getEntries().slice(0, 4);
    if (!entries.length) {
      container.innerHTML = '<div class="entry-card"><div class="entry-date">No entries yet</div><div class="entry-preview">Your first memory will appear here.</div><div class="entry-mood">🌿 Calm</div></div>';
      return;
    }

    container.innerHTML = entries.map(entry => `
      <div class="entry-card">
        <div class="entry-date">${new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
        <div class="entry-preview">${entry.preview}</div>
        <div class="entry-mood">${entry.mood || 'Calm'}</div>
      </div>
    `).join('');
  }

  function updateDiaryDate() {
    const diaryDate = document.querySelector('.diary-date');
    if (diaryDate) {
      diaryDate.textContent = `Today, ${new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`;
    }
  }

  function saveDraft() {
    const textarea = document.querySelector('.diary-textarea');
    if (!textarea) return;

    localStorage.setItem(draftKey, textarea.value);
    const indicator = document.querySelector('.autosave-indicator');
    if (indicator) {
      indicator.querySelector('span').textContent = 'Saved';
    }
  }

  function loadDraft() {
    const textarea = document.querySelector('.diary-textarea');
    if (!textarea) return;

    const saved = localStorage.getItem(draftKey);
    if (saved) {
      textarea.value = saved;
    }
  }

  function bindMoodSelection() {
    document.querySelectorAll('.mood-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.mood-chip').forEach(item => item.classList.remove('selected'));
        chip.classList.add('selected');
      });
    });
  }

  function bindNavigation() {
    document.querySelectorAll('.nav-item a').forEach(link => {
      link.addEventListener('click', () => {
        const label = link.querySelector('span')?.textContent || 'Your Thoughts';
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) pageTitle.textContent = label;
      });
    });
  }

  function bindDiaryActions() {
    const textarea = document.querySelector('.diary-textarea');
    const saveButton = document.querySelector('.diary-btn');

    if (textarea) {
      textarea.addEventListener('input', () => {
        saveDraft();
      });
    }

    if (saveButton) {
      saveButton.addEventListener('click', () => {
        const text = textarea?.value.trim();
        if (!text) return;

        createEntry(text);
        saveDraft();
        updateStats();
        renderEntries();
        if (textarea) textarea.value = '';
        const indicator = document.querySelector('.autosave-indicator');
        if (indicator) {
          indicator.querySelector('span').textContent = 'Entry saved';
        }
      });
    }
  }

  function bindLunaChat() {
    const input = document.querySelector('.luna-input-field');
    const sendButton = document.querySelector('.luna-send-btn');
    const chat = document.querySelector('.luna-chat');

    function addMessage(text, isUser) {
      const message = document.createElement('div');
      message.className = `chat-message ${isUser ? 'user' : 'ai'}`;
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.innerHTML = `<p>${text}</p>`;
      message.appendChild(bubble);
      chat?.appendChild(message);
      chat?.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
    }

    const responses = [
      'Thank you for sharing that with me. Your feelings matter, and you are allowed to take this one moment slowly.',
      'That sounds heavy. Remember that even a small breath can make space for calm.',
      'I am here with you. Let this page hold what feels too big to carry alone.'
    ];

    const handleSend = () => {
      const value = input?.value.trim();
      if (!value || !chat) return;
      addMessage(value, true);
      input.value = '';
      setTimeout(() => {
        const response = responses[Math.floor(Math.random() * responses.length)];
        addMessage(response, false);
      }, 700);
    };

    sendButton?.addEventListener('click', handleSend);
    input?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSend();
      }
    });
  }

  function bindMusicButton() {
    const button = document.querySelector('.play-pause');
    const icon = button?.querySelector('i');
    button?.addEventListener('click', () => {
      if (icon) {
        icon.setAttribute('data-lucide', icon.getAttribute('data-lucide') === 'play' ? 'pause' : 'play');
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }
    });
  }

  function init() {
    updateGreeting();
    updateDiaryDate();
    bindMoodSelection();
    bindNavigation();
    bindDiaryActions();
    bindLunaChat();
    bindMusicButton();
    loadDraft();
    updateStats();
    renderEntries();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
