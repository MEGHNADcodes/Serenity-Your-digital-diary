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

  /* ---------- Helpers and missing utilities ---------- */
  function loadSettings() {
    try {
      const raw = localStorage.getItem(settingsKey);
      if (!raw) return { nickname: 'Krupa', theme: 'sakura', reminderTime: '', personalQuote: 'You are enough.' };
      return JSON.parse(raw);
    } catch (e) {
      return { nickname: 'Krupa', theme: 'sakura', reminderTime: '', personalQuote: 'You are enough.' };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      const opts = { year: 'numeric', month: 'long', day: 'numeric' };
      return d.toLocaleDateString(undefined, opts) + ' • ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return iso; }
  }

  function updateDiaryDate() {
    const el = document.querySelector('.diary-label');
    if (!el) return;
    const now = new Date();
    const opts = { year: 'numeric', month: 'long', day: 'numeric' };
    el.textContent = now.toLocaleDateString(undefined, opts);
  }

  function saveDraft() {
    const ta = document.querySelector('.diary-textarea');
    if (!ta) return;
    localStorage.setItem(draftKey, JSON.stringify({ text: ta.value, updated: Date.now() }));
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const ta = document.querySelector('.diary-textarea');
      if (ta && parsed && parsed.text) ta.value = parsed.text;
    } catch (e) {}
  }

  function bindMusicButton() {
    const btn = document.querySelector('.play-pause');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const icon = btn.querySelector('i');
      if (!icon) return;
      if (btn.classList.contains('playing')) {
        btn.classList.remove('playing');
        icon.setAttribute('data-lucide', 'play');
      } else {
        btn.classList.add('playing');
        icon.setAttribute('data-lucide', 'pause');
      }
      if (window.lucide) window.lucide.createIcons();
    });
  }

  /* ---------- New renderers: Calendar, Mood, Insights ---------- */
  function renderCalendar() {
    const grid = document.querySelector('#calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= days; i++) {
      const dayDate = new Date(year, month, i);
      const dayIso = dayDate.toISOString();
      const entries = getEntries().filter(e => new Date(e.date).toDateString() === dayDate.toDateString());
      const el = document.createElement('div');
      el.className = 'calendar-day fade-in';
      el.innerHTML = `<div style="font-weight:700;margin-bottom:8px">${i}</div>` + (entries.length ? `<div class="small-preview">${entries[0].preview.slice(0,60)}</div>` : '<div class="small-preview muted">No entry</div>');
      el.addEventListener('click', () => { if (entries[0]) openEntryModal(entries[0].id); });
      grid.appendChild(el);
    }
  }

  function renderMoodTracker() {
    const summary = document.querySelector('#moodSummary');
    const chart = document.querySelector('#moodChart');
    if (!summary || !chart) return;
    const entries = getEntries();
    const counts = entries.reduce((acc, e) => { acc[e.mood] = (acc[e.mood] || 0) + 1; return acc; }, {});
    summary.innerHTML = Object.entries(counts).map(([m, c]) => `<div class="mood-chip-large">${m} • ${c}</div>`).join('') || '<div class="mood-chip-large muted">No mood data yet</div>';
    // simple bar chart
    chart.innerHTML = Object.entries(counts).map(([m, c]) => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><div style="width:90px">${m}</div><div style="flex:1;background:var(--bg-secondary);border-radius:8px;padding:6px"><div style="height:12px;width:${Math.min(c*14,100)}%;background:var(--gradient-primary);border-radius:8px"></div></div><div style="width:36px;text-align:right">${c}</div></div>`).join('');
  }

  function renderInsights() {
    const grid = document.querySelector('#insightsGrid');
    if (!grid) return;
    const entries = getEntries();
    const wordCounts = {};
    entries.forEach(e => {
      const words = e.text.toLowerCase().replace(/[^a-z\s]/g,'').split(/\s+/).filter(Boolean);
      words.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });
    });
    const topWords = Object.entries(wordCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const moodCounts = entries.reduce((acc,e)=>{acc[e.mood]=(acc[e.mood]||0)+1;return acc;},{});
    grid.innerHTML = `
      <div class="insight-card">
        <h4>Top words</h4>
        <div>${topWords.map(w=>`<span style="margin-right:8px;padding:6px;background:var(--bg-secondary);border-radius:8px">${w[0]} (${w[1]})</span>`).join('')}</div>
      </div>
      <div class="insight-card">
        <h4>Mood distribution</h4>
        <div>${Object.entries(moodCounts).map(m=>`<div style="margin-bottom:6px">${m[0]}: ${m[1]}</div>`).join('')}</div>
      </div>
      <div class="insight-card">
        <h4>Streak</h4>
        <div>Your current streak: ${Math.min(entries.length,7)} days</div>
      </div>
    `;
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
    if (screenKey === 'calendar') renderCalendar();
    if (screenKey === 'mood') renderMoodTracker();
    if (screenKey === 'insights') renderInsights();
    updateHeaderForScreen(screenKey);
  }

  // update header and focus behavior when changing screens
  function updateHeaderForScreen(screenKey) {
    const title = document.querySelector('#primaryPageTitle');
    const subtitle = document.querySelector('#primaryPageSubtitle');
    if (!title) return;
    switch (screenKey) {
      case 'dashboard':
        title.textContent = 'Your Thoughts';
        if (subtitle) subtitle.textContent = 'Capture the moment and reflect with calm intention.';
        // focus diary and place cursor at top
        const textarea = document.querySelector('.diary-textarea');
        if (textarea) {
          textarea.focus();
          try { textarea.setSelectionRange(0, 0); } catch (e) {}
          textarea.scrollTop = 0;
        }
        break;
      case 'timeline':
        title.textContent = 'Timeline';
        if (subtitle) subtitle.textContent = 'Browse all your past entries.';
        break;
      case 'search':
        title.textContent = 'Search';
        if (subtitle) subtitle.textContent = 'Find memories by words, mood, or date.';
        break;
      case 'achievements':
        title.textContent = 'Achievements';
        if (subtitle) subtitle.textContent = 'Celebrate milestones from your journaling.';
        break;
      case 'settings':
        title.textContent = 'Settings';
        if (subtitle) subtitle.textContent = 'Manage your account and preferences.';
        break;
      default:
        title.textContent = 'Serenity';
        if (subtitle) subtitle.textContent = '';
    }
  }

  function handleHashChange() {
    const screenKey = window.location.hash.replace('#', '') || 'dashboard';
    showScreen(screenKey);
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

  function bindFormatToolbar() {
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        const ta = document.querySelector('.diary-textarea');
        if (!ta) return;
        const start = ta.selectionStart || 0;
        const end = ta.selectionEnd || 0;
        const selected = ta.value.substring(start, end) || '';
        let insert = selected;
        if (cmd === 'bold') insert = `**${selected || 'bold text'}**`;
        if (cmd === 'italic') insert = `*${selected || 'italic text'}*`;
        if (cmd === 'underline') insert = `__${selected || 'underlined'}__`;
        if (cmd === 'h1') insert = `# ${selected || 'Heading'}`;
        if (cmd === 'emoji') insert = `${selected} 😊`;
        if (cmd === 'image') insert = `${selected} ![image](image-url)`;
        ta.setRangeText(insert, start, end, 'end');
        ta.focus();
        saveDraft();
      });
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

    const modalOverlay = document.querySelector('#lunaChatModal');
    const openButton = document.querySelector('#openLunaChatBtn');
    const closeButton = document.querySelector('#closeLunaChatBtn');
    const modalInput = document.querySelector('#lunaChatInput');
    const modalSend = document.querySelector('#lunaChatSendBtn');
    const modalMessages = document.querySelector('#lunaChatMessages');

    function addChatMessage(text, isUser, container) {
      const message = document.createElement('div');
      message.className = `chat-message ${isUser ? 'user' : 'ai'}`;
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.innerHTML = `<p>${text}</p>`;
      message.appendChild(bubble);
      container?.appendChild(message);
      container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      // bind any memory-open links inside this message
      message.querySelectorAll('.luna-open-memory').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.entryId;
          if (id) {
            // ensure modal closed then open entry modal
            // open entry in main app modal
            openEntryModal(id);
            // ensure the large chat modal is visible so user has context
            const overlay = document.querySelector('#lunaChatModal');
            if (overlay) {
              overlay.style.display = 'flex';
              setTimeout(() => overlay.classList.add('visible'), 20);
            }
          }
        });
      });
    }

    function sendChatMessage(value) {
      if (!value) return;
      addChatMessage(value, true, modalMessages);
      modalInput.value = '';
      if (typing) typing.style.display = 'flex';
      setTimeout(() => {
        if (typing) typing.style.display = 'none';
        const response = generateLunaResponse(value);
        addChatMessage(response, false, modalMessages);
      }, 700);
    }

    sendButton?.addEventListener('click', () => sendChatMessage(input?.value.trim()));
    input?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendChatMessage(input?.value.trim());
      }
    });

    modalSend?.addEventListener('click', () => sendChatMessage(modalInput?.value.trim()));
    modalInput?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendChatMessage(modalInput?.value.trim());
      }
    });

    openButton?.addEventListener('click', () => {
      modalOverlay?.style.setProperty('display', 'flex');
      setTimeout(() => modalOverlay?.classList.add('visible'), 20);
    });

    closeButton?.addEventListener('click', () => {
      modalOverlay?.classList.remove('visible');
      setTimeout(() => modalOverlay?.style.setProperty('display', 'none'), 200);
    });

    modalOverlay?.addEventListener('click', event => {
      if (event.target === modalOverlay) {
        modalOverlay.classList.remove('visible');
        setTimeout(() => modalOverlay?.style.setProperty('display', 'none'), 200);
      }
    });

    // Open chat when clicking the small Luna preview or the status text
    document.querySelectorAll('.luna-chat-preview, .luna-card').forEach(el => {
      el?.addEventListener('click', (e) => {
        const target = e.target;
        if (target && (target.closest && target.closest('#lunaChatModal'))) return;
        modalOverlay?.style.setProperty('display', 'flex');
        setTimeout(() => modalOverlay?.classList.add('visible'), 20);
        setTimeout(() => modalInput?.focus(), 160);
      });
    });

    // Quick mini chat in sidebar
    const miniInput = document.querySelector('#lunaMiniInput');
    const miniSend = document.querySelector('#lunaMiniSendBtn');
    function handleMiniSend() {
      const val = miniInput?.value.trim();
      if (!val) return;
      // show a small typing indicator by replacing preview text briefly
      const previewBubble = document.querySelector('.luna-chat-preview .message-bubble p');
      if (previewBubble) previewBubble.textContent = 'Thinking...';
      const reply = generateLunaResponse(val);
      miniInput.value = '';
      // If reply long, open modal and show full conversation
      if (reply && reply.length > 120 || reply.includes('\n')) {
        modalOverlay?.style.setProperty('display', 'flex');
        setTimeout(() => modalOverlay?.classList.add('visible'), 20);
        setTimeout(() => {
          modalInput?.focus();
          addChatMessage(reply, false, modalMessages);
        }, 180);
      } else {
        // show reply in the small preview bubble
        if (previewBubble) previewBubble.innerHTML = reply;
        setTimeout(() => {
          // fade back to default after a few seconds
          if (previewBubble) previewBubble.textContent = "Hi there... I'm Luna. 💫 What's on your mind today?";
        }, 5000);
      }
    }
    miniSend?.addEventListener('click', handleMiniSend);
    miniInput?.addEventListener('keydown', e=>{
      if (e.key === 'Enter') { e.preventDefault(); handleMiniSend(); }
    });

    function generateLunaResponse(userText) {
      // Simple keyword-based memory lookup
      const entries = getEntries();
      const words = userText.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean).slice(0, 8);
      const scoreMap = new Map();
      entries.forEach(e => {
        let score = 0;
        const hay = (e.title + ' ' + e.text + ' ' + (e.mood||'')).toLowerCase();
        words.forEach(w => { if (hay.includes(w)) score++; });
        if (score > 0) scoreMap.set(e.id, { score, entry: e });
      });
      const matches = Array.from(scoreMap.values()).sort((a,b)=>b.score-a.score).slice(0,3).map(s=>s.entry);
      if (matches.length) {
        // Return HTML with clickable snippets
        let html = `<div>I found ${matches.length} memory${matches.length>1?'ies':'y'} that relate to that.</div>`;
        html += `<div style="margin-top:6px">Here are brief snippets:</div>`;
        html += '<ul style="margin:8px 0;padding-left:16px">';
        matches.forEach(m => {
          const short = m.preview.slice(0,80).replace(/</g,'&lt;').replace(/>/g,'&gt;');
          html += `<li style="margin-bottom:6px">`;
          html += `<button class="luna-open-memory" data-entry-id="${m.id}" style="background:transparent;border:none;color:var(--color-primary-dark);text-decoration:underline;cursor:pointer">${formatDate(m.date)}</button>`;
          html += ` — <span style="color:var(--text-secondary)">${short}</span>`;
          html += `</li>`;
        });
        html += '</ul>';
        html += `<div style="margin-top:8px">Would you like me to open one of these memories?</div>`;
        return html;
      }
      // fallback empathetic reply
      const fallback = responses[Math.floor(Math.random() * responses.length)];
      return fallback;
    }
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
      const password = document.querySelector('#settingPassword')?.value || '';
      const confirmPassword = document.querySelector('#settingConfirmPassword')?.value || '';
      const message = document.querySelector('#settingsMessage');

      if (password && password !== confirmPassword) {
        if (message) {
          message.textContent = 'Passwords do not match.';
          message.style.color = 'crimson';
        }
        return;
      }

      if (password) {
        settings.passwordHint = `saved-${password.length}`;
      }

      saveSettings(settings);
      updateGreeting(settings);
      applyTheme(settings.theme);
      if (message) {
        message.textContent = 'Settings saved successfully.';
        message.style.color = 'var(--text-secondary)';
      }
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
    bindFormatToolbar();
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
    window.addEventListener('hashchange', handleHashChange);

    // New Entry button behavior
    document.querySelector('#newEntryBtn')?.addEventListener('click', () => {
      showScreen('dashboard');
      setTimeout(() => {
        const ta = document.querySelector('.diary-textarea');
        if (ta) {
          ta.focus();
          try { ta.setSelectionRange(0, 0); } catch (e) {}
        }
      }, 120);
    });

    // Font controls
    const fontSelector = document.querySelector('#fontSelector');
    const fontInc = document.querySelector('#fontSizeInc');
    const fontDec = document.querySelector('#fontSizeDec');
    let currentSize = 13;
    fontSelector?.addEventListener('change', () => {
      const val = fontSelector.value;
      // update root CSS variables and diary textarea directly
      document.documentElement.style.setProperty('--font-sans', `${val}, sans-serif`);
      document.documentElement.style.setProperty('--font-serif', `${val}, serif`);
      // apply to diary textarea specifically
      const ta = document.querySelector('.diary-textarea');
      if (ta) ta.style.fontFamily = val;
      // also update body fallback
      document.body.style.fontFamily = `${val}, sans-serif`;
    });
    fontInc?.addEventListener('click', () => { currentSize = Math.min(36, currentSize + 1); document.documentElement.style.setProperty('--font-size-base', currentSize + 'px'); const ta = document.querySelector('.diary-textarea'); if (ta) ta.style.fontSize = currentSize + 'px'; });
    fontDec?.addEventListener('click', () => { currentSize = Math.max(10, currentSize - 1); document.documentElement.style.setProperty('--font-size-base', currentSize + 'px'); const ta = document.querySelector('.diary-textarea'); if (ta) ta.style.fontSize = currentSize + 'px'; });

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
