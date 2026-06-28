// preload.js – Secure bridge between renderer and Node/Electron APIs
const { contextBridge } = require('electron');

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ---------- Paths ----------
const dataDir = path.join(os.homedir(), '.digital_diary');
const configPath = path.join(dataDir, 'config.json');
const entriesPath = path.join(dataDir, 'entries.json');
const statsPath = path.join(dataDir, 'stats.json');
const trashPath = path.join(dataDir, 'trash.json');
const backupDir = path.join(dataDir, 'backups');

// Ensure data directory and required JSON files exist
function ensureFile(filePath, defaultContent) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
  }
}
function initStorage() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  ensureFile(entriesPath, []);
  ensureFile(trashPath, []);
  ensureFile(statsPath, {
    releaseCounts: {},
    streak: 0,
    lastEntryDate: null,
    totalEntries: 0,
    totalWords: 0
  });
  ensureFile(configPath, {
    theme: 'sakura',
    nickname: '',
    greeting: '',
    reminderTime: '20:00',
    personalQuote: '',
    aiMemoryEnabled: false,
    autoSaveEnabled: true,
    autoSaveInterval: 5000,
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
    language: 'en',
    achievements: [],
    profileAvatar: null
  });
}
initStorage();

// ---------- Crypto Helpers ----------
let encryptionKey = null;
function deriveKeyFromPassword(pwd, encSaltHex) {
  return crypto.pbkdf2Sync(pwd, Buffer.from(encSaltHex, 'hex'), 100_000, 32, 'sha256');
}

// Static encryption key (no password required)
const STATIC_PASSWORD = 'krupa-secret';
const STATIC_SALT = 'a1b2c3d4e5f6g7h8a9b0c1d2e3f4g5h6';
encryptionKey = deriveKeyFromPassword(STATIC_PASSWORD, STATIC_SALT);

function encryptText(plain) {
  if (!encryptionKey) throw new Error('Encryption key not initialized');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('hex'), ct: ciphertext.toString('hex'), tag: tag.toString('hex') };
}

function decryptText(encrypted) {
  if (!encryptionKey) throw new Error('Encryption key not initialized');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(encrypted.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(encrypted.ct, 'hex')), decipher.final()]);
  return plaintext.toString('utf8');
}

// ---------- Config ----------
function getConfig() {
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}
function saveConfig(cfg) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}
function updateConfig(partial) {
  const cfg = getConfig();
  saveConfig({ ...cfg, ...partial });
}

// ---------- Diary Persistence ----------
function getAllEntries() {
  const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
  return entries.map(e => ({
    ...e,
    text: decryptText(e),
    preview: decryptText(e).slice(0, 150)
  }));
}

function getEntryById(id) {
  const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
  const entry = entries.find(e => e.id === id);
  if (!entry) return null;
  return { ...entry, text: decryptText(entry) };
}

function createEntry(entryData) {
  const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
  const encrypted = encryptText(entryData.text);
  const entry = {
    id: crypto.randomBytes(8).toString('hex'),
    date: new Date().toISOString(),
    title: entryData.title || '',
    tags: entryData.tags || [],
    mood: entryData.mood || null,
    energy: entryData.energy ?? null,
    stress: entryData.stress ?? null,
    sleep: entryData.sleep ?? null,
    favorite: false,
    pinned: false,
    wordCount: entryData.text.trim().split(/\s+/).filter(Boolean).length,
    ...encrypted
  };
  entries.unshift(entry);
  fs.writeFileSync(entriesPath, JSON.stringify(entries, null, 2));
  updateStatsOnCreate(entry);
  return { ...entry, text: entryData.text };
}

function updateEntry(id, updates) {
  const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const newText = updates.text !== undefined ? updates.text : decryptText(entries[idx]);
  const encrypted = encryptText(newText);
  const updated = {
    ...entries[idx],
    ...updates,
    text: undefined,
    ...encrypted,
    wordCount: newText.trim().split(/\s+/).filter(Boolean).length,
    updatedAt: new Date().toISOString()
  };
  entries[idx] = updated;
  fs.writeFileSync(entriesPath, JSON.stringify(entries, null, 2));
  return { ...updated, text: newText };
}

function deleteEntry(id, permanent = false) {
  const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return false;
  const [entry] = entries.splice(idx, 1);
  fs.writeFileSync(entriesPath, JSON.stringify(entries, null, 2));
  if (!permanent) {
    const trash = JSON.parse(fs.readFileSync(trashPath, 'utf-8'));
    trash.unshift({ ...entry, deletedAt: new Date().toISOString() });
    fs.writeFileSync(trashPath, JSON.stringify(trash, null, 2));
  }
  return true;
}

function restoreFromTrash(id) {
  const trash = JSON.parse(fs.readFileSync(trashPath, 'utf-8'));
  const idx = trash.findIndex(e => e.id === id);
  if (idx === -1) return false;
  const [entry] = trash.splice(idx, 1);
  delete entry.deletedAt;
  const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
  entries.unshift(entry);
  fs.writeFileSync(entriesPath, JSON.stringify(entries, null, 2));
  fs.writeFileSync(trashPath, JSON.stringify(trash, null, 2));
  return true;
}

function emptyTrash(olderThanDays = 30) {
  const trash = JSON.parse(fs.readFileSync(trashPath, 'utf-8'));
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const remaining = trash.filter(e => new Date(e.deletedAt).getTime() > cutoff);
  fs.writeFileSync(trashPath, JSON.stringify(remaining, null, 2));
  return trash.length - remaining.length;
}

function getTrash() {
  return JSON.parse(fs.readFileSync(trashPath, 'utf-8'));
}

function toggleFavorite(id) {
  const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
  const entry = entries.find(e => e.id === id);
  if (!entry) return null;
  entry.favorite = !entry.favorite;
  fs.writeFileSync(entriesPath, JSON.stringify(entries, null, 2));
  return entry.favorite;
}

function togglePin(id) {
  const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
  const entry = entries.find(e => e.id === id);
  if (!entry) return null;
  entry.pinned = !entry.pinned;
  fs.writeFileSync(entriesPath, JSON.stringify(entries, null, 2));
  return entry.pinned;
}

function searchEntries(query, filters = {}) {
  const entries = getAllEntries();
  let results = entries;
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(e =>
      e.text.toLowerCase().includes(q) ||
      (e.title?.toLowerCase().includes(q)) ||
      (e.tags?.some(t => t.toLowerCase().includes(q)))
    );
  }
  if (filters.dateFrom) results = results.filter(e => new Date(e.date) >= new Date(filters.dateFrom));
  if (filters.dateTo) results = results.filter(e => new Date(e.date) <= new Date(filters.dateTo));
  if (filters.mood) results = results.filter(e => e.mood === filters.mood);
  if (filters.favorite !== undefined) results = results.filter(e => e.favorite === filters.favorite);
  if (filters.tags?.length) results = results.filter(e => filters.tags.some(t => e.tags?.includes(t)));
  return results;
}

// ---------- Stats ----------
function updateStatsOnCreate(entry) {
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);
  const entryDate = new Date(entry.date).toISOString().slice(0, 10);
  stats.totalEntries = (stats.totalEntries || 0) + 1;
  stats.totalWords = (stats.totalWords || 0) + (entry.wordCount || 0);
  if (entryDate === today) {
    stats.releaseCounts[today] = (stats.releaseCounts[today] || 0) + 1;
  }
  if (stats.lastEntryDate) {
    const last = new Date(stats.lastEntryDate);
    const curr = new Date(entryDate);
    const diff = Math.floor((curr - last) / (1000 * 60 * 60 * 24));
    if (diff === 1) stats.streak = (stats.streak || 0) + 1;
    else if (diff > 1) stats.streak = 1;
  } else {
    stats.streak = 1;
  }
  stats.lastEntryDate = entryDate;
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
}

function getTodayReleaseCount() {
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);
  return stats.releaseCounts[today] || 0;
}

function getEntriesCount() {
  if (!fs.existsSync(entriesPath)) return 0;
  const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
  return Array.isArray(entries) ? entries.length : 0;
}

function getStats() {
  return JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
}

function incrementReleaseCount() {
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);
  stats.releaseCounts[today] = (stats.releaseCounts[today] || 0) + 1;
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
}

// ---------- Mood Tracking ----------
function getMoodData() {
  const entries = getAllEntries();
  return entries.filter(e => e.mood).map(e => ({
    date: e.date.slice(0, 10),
    mood: e.mood,
    energy: e.energy,
    stress: e.stress,
    sleep: e.sleep
  }));
}

// ---------- Daily Check-in ----------
function getLastCheckIn() {
  if (!fs.existsSync(configPath)) return null;
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return cfg.lastCheckIn || null;
}
function updateLastCheckIn() {
  const cfg = getConfig();
  cfg.lastCheckIn = new Date().toISOString();
  saveConfig(cfg);
}

// ---------- AI (Ollama) ----------
async function askAI(message, history = []) {
  const payload = {
    model: 'llama3',
    messages: [...history.slice(-10), { role: 'user', content: message }],
    stream: false
  };
  try {
    const resp = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(`Ollama request failed: ${resp.status}`);
    const data = await resp.json();
    return { success: true, reply: data.message?.content || '' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function askAIStream(message, history = [], onChunk) {
  const payload = {
    model: 'llama3',
    messages: [...history.slice(-10), { role: 'user', content: message }],
    stream: true
  };
  try {
    const resp = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(`Ollama request failed: ${resp.status}`);
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let fullReply = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            fullReply += data.message.content;
            onChunk(data.message.content);
          }
        } catch (_) {}
      }
    }
    return { success: true, reply: fullReply };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ---------- Backup ----------
function createBackup(password = '') {
  const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
  const config = getConfig();
  const trash = JSON.parse(fs.readFileSync(trashPath, 'utf-8'));
  const backup = { entries, stats, config, trash, createdAt: new Date().toISOString(), version: 1 };
  const backupData = JSON.stringify(backup, null, 2);
  let finalData = backupData;
  if (password) {
    const iv = crypto.randomBytes(12);
    const key = deriveKeyFromPassword(password, STATIC_SALT);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(backupData, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    finalData = JSON.stringify({ encrypted: true, iv: iv.toString('hex'), ct: ciphertext.toString('hex'), tag: tag.toString('hex') });
  }
  const fileName = `backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  const filePath = path.join(backupDir, fileName);
  fs.writeFileSync(filePath, finalData);
  return fileName;
}

function listBackups() {
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ name: f, path: path.join(backupDir, f), size: fs.statSync(path.join(backupDir, f)).size, date: fs.statSync(path.join(backupDir, f)).mtime }))
    .sort((a, b) => b.date - a.date);
}

function restoreBackup(fileName, password = '') {
  const filePath = path.join(backupDir, fileName);
  if (!fs.existsSync(filePath)) return { success: false, error: 'Backup not found' };
  let data = fs.readFileSync(filePath, 'utf-8');
  try {
    const parsed = JSON.parse(data);
    if (parsed.encrypted) {
      if (!password) return { success: false, error: 'Password required' };
      const key = deriveKeyFromPassword(password, STATIC_SALT);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parsed.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(parsed.tag, 'hex'));
      const plain = Buffer.concat([decipher.update(Buffer.from(parsed.ct, 'hex')), decipher.final()]);
      data = plain.toString('utf8');
    }
    const backup = JSON.parse(data);
    fs.writeFileSync(entriesPath, JSON.stringify(backup.entries, null, 2));
    fs.writeFileSync(statsPath, JSON.stringify(backup.stats, null, 2));
    saveConfig(backup.config);
    fs.writeFileSync(trashPath, JSON.stringify(backup.trash || [], null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function deleteBackup(fileName) {
  const filePath = path.join(backupDir, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

// ---------- Achievements ----------
function getAchievements() {
  const config = getConfig();
  return config.achievements || [];
}

function unlockAchievement(id, name, description, icon) {
  const config = getConfig();
  if (!config.achievements) config.achievements = [];
  if (!config.achievements.find(a => a.id === id)) {
    config.achievements.push({ id, name, description, icon, unlockedAt: new Date().toISOString() });
    saveConfig(config);
    return true;
  }
  return false;
}

function checkAchievements() {
  const stats = getStats();
  const entries = getAllEntries();
  const newAchievements = [];
  if (stats.streak >= 7 && !getAchievements().find(a => a.id === 'streak-7')) newAchievements.push({ id: 'streak-7', name: 'Week Streak', description: 'Wrote for 7 consecutive days', icon: '🔥' });
  if (stats.streak >= 30 && !getAchievements().find(a => a.id === 'streak-30')) newAchievements.push({ id: 'streak-30', name: 'Month Streak', description: 'Wrote for 30 consecutive days', icon: '🌟' });
  if (stats.totalEntries >= 100 && !getAchievements().find(a => a.id === 'entries-100')) newAchievements.push({ id: 'entries-100', name: 'Centurion', description: '100 diary entries', icon: '💯' });
  if (stats.totalEntries >= 500 && !getAchievements().find(a => a.id === 'entries-500')) newAchievements.push({ id: 'entries-500', name: 'Chronicler', description: '500 diary entries', icon: '📚' });
  if (entries.filter(e => e.favorite).length >= 10 && !getAchievements().find(a => a.id === 'favorites-10')) newAchievements.push({ id: 'favorites-10', name: 'Treasure Keeper', description: '10 favorite memories', icon: '❤️' });
  newAchievements.forEach(a => unlockAchievement(a.id, a.name, a.description, a.icon));
  return newAchievements;
}

// ---------- Export API ----------
contextBridge.exposeInMainWorld('diaryAPI', {
  // Config
  getConfig,
  updateConfig,
  // Diary CRUD
  getAllEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  // Trash
  getTrash,
  restoreFromTrash,
  emptyTrash,
  // Favorites & Pins
  toggleFavorite,
  togglePin,
  // Search
  searchEntries,
  // Stats
  getTodayReleaseCount,
  getEntriesCount,
  getStats,
  incrementReleaseCount,
  // Mood
  getMoodData,
  // Check-in
  getLastCheckIn,
  updateLastCheckIn,
  // AI
  askAI,
  askAIStream,
  // Backup
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  // Achievements
  getAchievements,
  checkAchievements
});