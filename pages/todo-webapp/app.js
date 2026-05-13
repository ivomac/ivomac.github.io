let todos = [];
let showDone = false;
let errorDismissTimer = null;

function credentials() {
  return {
    url:   localStorage.getItem('turso_url')   || '',
    token: localStorage.getItem('turso_token') || '',
  };
}

function getTable() {
  return localStorage.getItem('turso_table') || 'todo';
}

function validateTableName(name) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

async function init() {
  initEventListeners();
  const { url, token } = credentials();
  document.getElementById('tableInput').value = getTable();
  if (url && token) {
    await initDatabase();
    await loadTodos();
  } else {
    showSettings();
  }
}

function initEventListeners() {
  document.getElementById('refreshBtn').addEventListener('click', loadTodos);
  document.getElementById('settingsBtn').addEventListener('click', showSettings);
  document.getElementById('addBtn').addEventListener('click', addTodo);
  document.getElementById('newTodoInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') addTodo();
  });
  document.getElementById('toggleDoneBtn').addEventListener('click', toggleDoneSection);
  document.getElementById('todoList').addEventListener('click', handleListClick);
  document.getElementById('doneList').addEventListener('click', handleListClick);
  document.getElementById('todoList').addEventListener('dblclick', handleListDblClick);
  document.getElementById('doneList').addEventListener('dblclick', handleListDblClick);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('clearSettingsBtn').addEventListener('click', clearSettings);
  document.getElementById('closeSettingsBtn').addEventListener('click', hideSettings);
  const tableInput = document.getElementById('tableInput');
  tableInput.addEventListener('change', switchTable);
  tableInput.addEventListener('keypress', e => { if (e.key === 'Enter') tableInput.blur(); });
}

function handleListClick(event) {
  const btn = event.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'copy') copyToClipboard(id);
}

function handleListDblClick(event) {
  if (event.target.closest('button')) return;
  const item = event.target.closest('.todo-item');
  if (!item) return;
  const { id } = item.dataset;
  if (!id) return;
  toggleDone(id);
}

function showSettings() {
  const { url, token } = credentials();
  document.getElementById('tursoUrlInput').value = url;
  document.getElementById('tursoTokenInput').value = token;
  document.getElementById('settingsModal').classList.add('active');
}

function hideSettings() {
  document.getElementById('settingsModal').classList.remove('active');
}

async function saveSettings() {
  const url = document.getElementById('tursoUrlInput').value.trim();
  const token = document.getElementById('tursoTokenInput').value.trim();

  if (!url) { showError('Turso DB URL cannot be empty'); return; }
  if (!token) { showError('Auth token cannot be empty'); return; }

  localStorage.setItem('turso_url', url);
  localStorage.setItem('turso_token', token);

  hideSettings();
  hideError();
  await initDatabase();
  await loadTodos();
}

async function switchTable() {
  const table = document.getElementById('tableInput').value.trim() || 'todo';
  document.getElementById('tableInput').value = table;
  if (!validateTableName(table)) {
    showError('Table name must start with a letter or underscore and contain only letters, digits, and underscores.');
    return;
  }
  localStorage.setItem('turso_table', table);
  await initDatabase();
  await loadTodos();
}

function clearSettings() {
  localStorage.removeItem('turso_url');
  localStorage.removeItem('turso_token');
  localStorage.removeItem('turso_table');
  document.getElementById('tableInput').value = '';
  todos = [];
  renderTodos();
  showSettings();
}

function toTursoArg(val) {
  if (val === null || val === undefined) return { type: 'null' };
  return { type: 'text', value: String(val) };
}

async function tursoQuery(sql, args = []) {
  const { url, token } = credentials();
  const httpUrl = url.replace(/^libsql:\/\//, 'https://');
  const response = await fetch(`${httpUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql, args: args.map(toTursoArg) } },
        { type: 'close' },
      ],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) throw new Error(`Auth error (${status}): check your Turso token`);
    throw new Error(`Network error: HTTP ${status}`);
  }

  const data = await response.json();
  const result = data.results[0];

  if (result.type === 'error') throw new Error(`SQL error: ${result.error.message}`);

  const { cols, rows } = result.response.result;
  return rows.map(row =>
    Object.fromEntries(cols.map((col, i) => [col.name, row[i].value ?? null]))
  );
}

async function initDatabase() {
  const table = getTable();
  try {
    await tursoQuery(`
      CREATE TABLE IF NOT EXISTS "${table}" (
        id         TEXT    PRIMARY KEY,
        content    TEXT    NOT NULL,
        created_at TEXT    NOT NULL,
        done_at    TEXT
      )
    `);
  } catch (err) {
    showError(`Failed to initialise database: ${err.message}`);
    throw err;
  }
}

async function fetchTodos() {
  const table = getTable();
  return tursoQuery(
    `SELECT id, content, created_at, done_at FROM "${table}" ORDER BY done_at IS NOT NULL, created_at DESC`
  );
}

async function loadTodos() {
  try {
    showStatus('Loading...');
    hideError();
    todos = await fetchTodos();
    renderTodos();
    hideStatus();
  } catch (err) {
    showError(`Failed to load todos: ${err.message}`);
    hideStatus();
  }
}

async function addTodo() {
  const table = getTable();
  const input = document.getElementById('newTodoInput');
  const content = input.value.trim();
  if (!content) return;

  const item = { id: crypto.randomUUID(), content, created_at: new Date().toISOString(), done_at: null };
  todos.unshift(item);
  input.value = '';
  renderTodos();

  try {
    await tursoQuery(
      `INSERT INTO "${table}" (id, content, created_at) VALUES (?, ?, ?)`,
      [item.id, content, item.created_at]
    );
  } catch (err) {
    todos = todos.filter(t => t !== item);
    renderTodos();
    showError(`Failed to add todo: ${err.message}`);
    input.value = content;
  }
}

async function toggleDone(id) {
  const table = getTable();
  const item = todos.find(t => t.id === id);
  if (!item) return;

  const prevDoneAt = item.done_at;
  item.done_at = prevDoneAt ? null : new Date().toISOString();
  renderTodos();

  try {
    if (prevDoneAt) {
      await tursoQuery(`UPDATE "${table}" SET done_at = NULL WHERE id = ?`, [id]);
    } else {
      await tursoQuery(`UPDATE "${table}" SET done_at = ? WHERE id = ?`, [item.done_at, id]);
    }
  } catch (err) {
    item.done_at = prevDoneAt;
    renderTodos();
    showError(`Failed to update todo: ${err.message}`);
  }
}

async function copyToClipboard(id) {
  const item = todos.find(t => t.id === id);
  if (!item) return;
  try {
    await navigator.clipboard.writeText(item.content);
    showStatus('Copied!');
    setTimeout(hideStatus, 1500);
  } catch (err) {
    showError('Failed to copy to clipboard');
  }
}

function toggleDoneSection() {
  showDone = !showDone;
  renderTodos();
}

function itemHtml(item) {
  const isDone = !!item.done_at;
  return `
    <div class="todo-item${isDone ? ' done-item' : ''}" data-id="${item.id}" title="Double-click to ${isDone ? 'restore' : 'complete'}">
      <span class="todo-text">${escapeHtml(item.content)}</span>
      <button class="action-btn copy-btn" data-action="copy" data-id="${item.id}" title="Copy">📋</button>
    </div>
  `;
}

function renderTodos() {
  const active = todos.filter(t => !t.done_at);
  const done = todos.filter(t => t.done_at);

  const list = document.getElementById('todoList');
  const doneList = document.getElementById('doneList');
  const toggleBtn = document.getElementById('toggleDoneBtn');

  list.innerHTML = active.length === 0
    ? '<div class="empty">No active todos</div>'
    : active.map(itemHtml).join('');

  if (done.length === 0) {
    toggleBtn.classList.remove('visible');
    doneList.innerHTML = '';
  } else {
    toggleBtn.classList.add('visible');
    toggleBtn.textContent = showDone
      ? `Hide completed (${done.length})`
      : `Show completed (${done.length})`;
    doneList.innerHTML = showDone ? done.map(itemHtml).join('') : '';
  }
}

function showError(message) {
  const el = document.getElementById('error');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(errorDismissTimer);
  errorDismissTimer = setTimeout(hideError, 5000);
}

function hideError() {
  clearTimeout(errorDismissTimer);
  document.getElementById('error').classList.remove('visible');
}

function showStatus(message) {
  const el = document.getElementById('status');
  el.textContent = message;
  el.classList.add('visible');
}

function hideStatus() {
  document.getElementById('status').classList.remove('visible');
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
}

init();
