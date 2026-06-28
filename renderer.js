(function () {
  const storageKey = 'serenity-diary-state-v1';
  const draftKey = 'serenity-diary-draft-v1';
  const settingsKey = 'serenity-diary-settings-v1';

  const defaultEntries = [
    {
      id: 'entry-1',
      title: 'A Soft Evening',
      date: '2026-06-27T18:00:00.000Z',
      mood: 'Calm',
      text: 'Today I let the quiet hold me. I took a slow breath and remembered that rest is not a failure.',
      preview: 'Today I let the quiet hold me. I took a slow breath and remembered that rest is not a failure.'
    },
    {
      id: 'entry-2',
      title: 'A Little Hope',
      date: '2026-06-25T14:30:00.000Z',
      mood: 'Happy',
      text: 'I noticed the smallest signs of joy today: warm tea, a bright window, and a kind message.',
      preview: 'I noticed the smallest signs of joy today: warm tea, a bright window, and a kind message.'
    }
  ];

  function loadEntries() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaultEntries.slice();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : defaultEntries.slice();
    } catch (error) {
      return defaultEntries.slice();
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(storageKey, JSON.stringify(entries));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(settingsKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        nickname: parsed.nickname || 'Krupa',
        theme: parsed.theme || 'sakura',
        reminderTime: parsed.reminderTime || '',
        personalQuote: parsed.personalQuote || 'You are enough.',
        ...parsed
      };
    } catch (error) {
      return {
        nickname: 'Krupa',
        theme: 'sakura',
        reminderTime: '',
        personalQuote: 'You are enough.'
      };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }

  function getEntries() {
    return loadEntries();
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
    saveEntries(entries);
    return entry;
  }

  function deleteEntry(entryId) {
    const entries = getEntries().filter(entry => entry.id !== entryId);
    saveEntries(entries);
  }

  function updateGreeting(settings) {
    const hour = new Date().getHours();
    let greeting = 'Good Evening 🌙';
    if (hour < 12) greeting = 'Good Morning ☀️';
    else if (hour < 18) greeting = 'Good Afternoon 🌤️';

    const profileGreeting = document.querySelector('.profile-greeting');
    const profileName = document.querySelector('.profile-name');
    if (profileGreeting) profileGreeting.textContent = `${greeting}`;
    if (profileName) profileName.textContent = settings.nickname || 'Krupa';
  }

  function updateStats() {
    const entries = getEntries();
    const totalEntries = entries.length;
    const totalWords = entries.reduce((sum, entry) => sum + entry.text.split(/\s+/).filter(Boolean).length, 0);
    const todayEntries = entries.filter(entry => new Date(entry.date).toDateString() === new Date().toDateString()).length;
    const streakValue = Math.min(totalEntries, 7);

    const streakCount = document.querySelector('.streak-count');
    if (streakCount) streakCount.textContent = `${streakValue} days`;

    const streakBar = document.querySelector('.streak-bar');
    if (streakBar) streakBar.style.width = `${Math.min(streakValue * 14, 100)}%`;

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
      <div class="entry-card" data-entry-id="${entry.id}">
        <div class="entry-date">${formatDate(entry.date)}</div>
        <div class="entry-preview">${entry.preview}</div>
        <div class="entry-mood">${entry.mood || 'Calm'}</div>
      </div>
    `).join('');

    container.querySelectorAll('.entry-card').forEach(card => {
      card.addEventListener('click', () => openEntryModal(card.dataset.entryId));
    });
  }

  function renderTimelineEntries() {
    const list = document.querySelector('.timeline-list');
    if (!list) return;

    const sortType = document.querySelector('#timelineSort')?.value || 'date-desc';
    const moodFilter = document.querySelector('#timelineMoodFilter')?.value || 'all';
    let entries = getEntries().slice();

    if (moodFilter !== 'all') {
      entries = entries.filter(entry => entry.mood === moodFilter);
    }

    entries.sort((a, b) => {
      if (sortType === 'date-asc') return new Date(a.date) - new Date(b.date);
      if (sortType === 'title') return a.title.localeCompare(b.title);
      if (sortType === 'mood') return a.mood.localeCompare(b.mood);
      return new Date(b.date) - new Date(a.date);
    });

    if (!entries.length) {
      list.innerHTML = '<div class="entry-card"><div class="entry-date">No entries match this filter.</div></div>';
      return;
    }

    list.innerHTML = entries.map(entry => `
      <div class="entry-card timeline-entry" data-entry-id="${entry.id}">
        <div class="entry-row">
          <div>
            <div class="entry-title">${entry.title}</div>
            <div class="entry-date">${formatDate(entry.date)}</div>
          </div>
          <div class="entry-mood">${entry.mood}</div>
        </div>
        <div class="entry-preview">${entry.preview}</div>
      </div>
    `).join('');

    list.querySelectorAll('.timeline-entry').forEach(card => {
      card.addEventListener('click', () => openEntryModal(card.dataset.entryId));
    });
  }

  function renderSearchResults(query = '') {
    const results = document.querySelector('.search-results');
    if (!results) return;

    const entries = getEntries().filter(entry => {
      if (!query) return true;
      const normalized = query.toLowerCase();
      return entry.title.toLowerCase().includes(normalized) ||
        entry.text.toLowerCase().includes(normalized) ||
        entry.mood.toLowerCase().includes(normalized) ||
        formatDate(entry.date).toLowerCase().includes(normalized);
    });

    if (!entries.length) {
      results.innerHTML = '<div class="entry-card"><div class="entry-date">No results found</div><div class="entry-preview">Try a different word or mood.</div></div>';
      return;
    }

    results.innerHTML = entries.map(entry => `
      <div class="entry-card timeline-entry" data-entry-id="${entry.id}">
        <div class="entry-row">
          <div>
            <div class="entry-title">${entry.title}</div>
            <div class="entry-date">${formatDate(entry.date)}</div>
          </div>
          <div class="entry-mood">${entry.mood}</div>
        </div>
        <div class="entry-preview">${entry.preview}</div>
      </div>
    `).join('');

    results.querySelectorAll('.timeline-entry').forEach(card => {
      card.addEventListener('click', () => openEntryModal(card.dataset.entryId));
    });
  }

  function renderAchievements() {
    const container = document.querySelector('.achievements-grid');
    if (!container) return;

    const entries = getEntries();
    const moodCounts = entries.reduce((acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1;
      return acc;
    }, {});

    const mostUsedMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Calm';
    const longestEntry = entries.slice().sort((a, b) => b.text.length - a.text.length)[0];
    const totalEntries = entries.length;
    const milestoneCount = Math.max(0, totalEntries - 1);

    const cards = [
      {
        title: 'First Step',
        value: totalEntries ? 'Journal started' : 'Begin here',
        detail: totalEntries ? `You have written ${totalEntries} entries so far.` : 'Write your first diary memory today.'
      },
      {
        title: 'Mood Anchor',
        value: mostUsedMood,
        detail: `Your most frequent mood is ${mostUsedMood}.`
      },
      {
        title: 'Milestone',
        value: `${milestoneCount} entries`,        
        detail: 'Every memory helps you grow a little more.'
      },
      {
        title: 'Longest Reflection',
        value: longestEntry ? `${longestEntry.text.split(/\s+/).length} words` : 'Keep writing',
        detail: longestEntry ? longestEntry.title : 'Your next moment could be your longest yet.'
      }
    ];

    container.innerHTML = cards.map(card => `
      <article class="achievement-card">
        <div class="achievement-title">${card.title}</div>
        <div class="achievement-value">${card.value}</div>
        <p class="achievement-detail">${card.detail}</p>
      </article>
    `).join('');
  }

  function renderSettings() {
    const settings = loadSettings();
    document.querySelector('#settingNickname').value = settings.nickname;
    document.querySelector('#settingTheme').value = settings.theme;
    document.querySelector('#settingReminderTime').value = settings.reminderTime;
    document.querySelector('#settingPersonalQuote').value = settings.personalQuote;
    applyTheme(settings.theme);
  }

  function openEntryModal(entryId) {
    const entry = getEntries().find(item => item.id === entryId);
    if (!entry) return;

    const modal = document.querySelector('#entryViewModal');
    const title = document.querySelector('#viewEntryTitle');
    const meta = document.querySelector('#viewEntryMeta');
    const content = document.querySelector('#viewEntryContent');
    const editButton = document.querySelector('#editEntryBtn');
    const deleteButton = document.querySelector('#deleteEntryBtn');

    if (title) title.textContent = entry.title;
    if (meta) meta.textContent = `${formatDate(entry.date)} • ${entry.mood}`;
    if (content) content.textContent = entry.text;

    modal.style.display = 'flex';

    editButton.onclick = () => {
      showScreen('dashboard');
      const textarea = document.querySelector('.diary-textarea');
      if (textarea) textarea.value = entry.text;
      const indicator = document.querySelector('.autosave-indicator span');
      if (indicator) indicator.textContent = 'Editing entry';
      modal.style.display = 'none';
    };

    deleteButton.onclick = () => {
      deleteEntry(entry.id);
      renderEntries();
      renderTimelineEntries();
      renderSearchResults();
      renderAchievements();
      updateStats();
      modal.style.display = 'none';
    };
  }

  function closeModal(modalId) {
    const modal = document.querySelector(modalId);
    if (modal) modal.style.display = 'none';
  }

  function showScreen(screenKey) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    const target = document.querySelector(`#${screenKey}Screen`);
    const navItem = document.querySelector(`.nav-item a[href='#${screenKey}']`)?.parentElement;

    if (target) target.classList.add('active');
    if (navItem) navItem.classList.add('active');

    if (window.location.hash !== `#${screenKey}`) {
      window.history.replaceState(null, '', `#${screenKey}`);
    }

    if (screenKey === 'timeline') renderTimelineEntries();
    if (screenKey === 'search') renderSearchResults(document.querySelector('#searchQuery')?.value.trim() || '');
    if (screenKey === 'achievements') renderAchievements();
    if (screenKey === 'settings') renderSettings();
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
      link.addEventListener('click', event => {
        event.preventDefault();
        const screenKey = link.getAttribute('href').replace('#', '');
        showScreen(screenKey);
      });
    });

    const viewAllBtn = document.querySelector('#viewAllTimelineBtn');
    viewAllBtn?.addEventListener('click', () => showScreen('timeline'));
  }

  function bindDiaryActions() {
    const textarea = document.querySelector('.diary-textarea');
    const saveButton = document.querySelector('#saveDiaryBtn');

    if (textarea) {
      textarea.addEventListener('input', () => {
        saveDraft();
      });
    }

    saveButton?.addEventListener('click', () => {
      const text = textarea?.value.trim();
      if (!text) return;
      createEntry(text);
      saveDraft();
      updateStats();
      renderEntries();
      renderTimelineEntries();
      renderSearchResults(document.querySelector('#searchQuery')?.value.trim() || '');
      renderAchievements();
      if (textarea) textarea.value = '';
      const indicator = document.querySelector('.autosave-indicator span');
      if (indicator) indicator.textContent = 'Entry saved';
    });
  }

  function bindLunaChat() {
    const input = document.querySelector('.luna-input-field');
    const sendButton = document.querySelector('.luna-send-btn');
    const chat = document.querySelector('.luna-chat');
    const typing = document.querySelector('.typing-indicator');

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
      'I am here with you. Let this page hold what feels too big to carry alone.',
      'Your words are safe here. Breathe and let them out.'
    ];

    const handleSend = () => {
      const value = input?.value.trim();
      if (!value || !chat) return;
      addMessage(value, true);
      input.value = '';
      if (typing) typing.style.display = 'flex';
      setTimeout(() => {
        if (typing) typing.style.display = 'none';
        const response = responses[Math.floor(Math.random() * responses.length)];
        addMessage(response, false);
      }, 900);
    };

    sendButton?.addEventListener('click', handleSend);
    input?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSend();
      }
    });

    const expandButton = document.querySelector('.luna-expand-btn');
    expandButton?.addEventListener('click', () => {
      document.querySelector('.luna-card')?.classList.toggle('expanded');
    });
  }

  function bindSearch() {
    const searchButton = document.querySelector('#runSearch');
    const searchInput = document.querySelector('#searchQuery');
    searchButton?.addEventListener('click', () => {
      renderSearchResults(searchInput?.value.trim() || '');
    });

    searchInput?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        renderSearchResults(searchInput.value.trim() || '');
      }
    });
  }

  function bindTimelineControls() {
    document.querySelector('#timelineSort')?.addEventListener('change', renderTimelineEntries);
    document.querySelector('#timelineMoodFilter')?.addEventListener('change', renderTimelineEntries);
  }

  function bindSettings() {
    document.querySelector('#saveSettingsBtn')?.addEventListener('click', () => {
      const settings = {
        nickname: document.querySelector('#settingNickname')?.value.trim() || 'Krupa',
        theme: document.querySelector('#settingTheme')?.value || 'sakura',
        reminderTime: document.querySelector('#settingReminderTime')?.value || '',
        personalQuote: document.querySelector('#settingPersonalQuote')?.value.trim() || 'You are enough.'
      };
      saveSettings(settings);
      updateGreeting(settings);
      applyTheme(settings.theme);
      const btn = document.querySelector('#saveSettingsBtn');
      if (btn) btn.textContent = 'Saved';
      setTimeout(() => { if (btn) btn.textContent = 'Save settings'; }, 1200);
    });
  }

  function applyTheme(theme) {
    document.body.dataset.theme = theme;
  }

  function closeModal(modalId) {
    const modal = document.querySelector(modalId);
    if (modal) modal.style.display = 'none';
  }

  function init() {
    const settings = loadSettings();
    updateGreeting(settings);
    updateDiaryDate();
    bindMoodSelection();
    bindNavigation();
    bindDiaryActions();
    bindLunaChat();
    bindMusicButton();
    bindSearch();
    bindTimelineControls();
    bindSettings();
    loadDraft();
    updateStats();
    renderEntries();
    renderAchievements();
    renderSettings();

    const initialHash = window.location.hash.replace('#', '') || 'dashboard';
    showScreen(initialHash);

    document.querySelector('#closeEntryView')?.addEventListener('click', () => closeModal('#entryViewModal'));
    document.querySelector('#entryViewModal')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeModal('#entryViewModal');
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
