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

async function fetchTables() {
  const rows = await tursoQuery(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  return rows.map(r => r.name);
}

function populateListSelect(tables, current) {
  const select = document.getElementById('listSelect');
  select.innerHTML = tables.map(name =>
    `<option value="${name}"${name === current ? ' selected' : ''}>${name}</option>`
  ).join('');
}

async function refreshListSelect() {
  const tables = await fetchTables();
  populateListSelect(tables, getTable());
  return tables;
}

async function addList() {
  const input = window.prompt('New list name:');
  if (input === null) return;
  const name = input.trim();
  if (!name) return;
  if (!validateTableName(name)) {
    showMessage('Name must start with a letter or underscore and contain only letters, digits, and underscores.', true);
    return;
  }
  localStorage.setItem('turso_table', name);
  try {
    await initDatabase();
    await refreshListSelect();
    await loadTodos();
  } catch (err) {
    showMessage(`Failed to create list: ${err.message}`, true);
  }
}

async function deleteList() {
  const table = getTable();
  if (!window.confirm(`Delete list "${table}" and all its todos? This cannot be undone.`)) return;
  try {
    await tursoQuery(`DROP TABLE "${table}"`);
  } catch (err) {
    showMessage(`Failed to delete list: ${err.message}`, true);
    return;
  }
  const tables = await fetchTables();
  if (tables.length === 0) {
    localStorage.removeItem('turso_table');
    document.getElementById('listSelect').innerHTML = '';
    todos = [];
    renderTodos();
    return;
  }
  localStorage.setItem('turso_table', tables[0]);
  populateListSelect(tables, tables[0]);
  await loadTodos();
}

function focusInput() {
  document.getElementById('newTodoInput').focus();
}

async function init() {
  initEventListeners();
  const { url, token } = credentials();
  if (url && token) {
    const tables = await refreshListSelect();
    if (!tables.includes(getTable())) await initDatabase();
    await loadTodos();
    focusInput();
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

  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('clearSettingsBtn').addEventListener('click', clearSettings);
  document.getElementById('closeSettingsBtn').addEventListener('click', hideSettings);
  document.getElementById('message').addEventListener('click', hideMessage);
  document.getElementById('listSelect').addEventListener('change', switchTable);
  document.getElementById('addListBtn').addEventListener('click', addList);
  document.getElementById('deleteListBtn').addEventListener('click', deleteList);
}

function handleListClick(event) {
  const btn = event.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'toggle') toggleDone(id);
  if (action === 'copy') copyToClipboard(id);
  if (action === 'delete') deleteTodo(id);
  focusInput();
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

  if (!url) { showMessage('Turso DB URL cannot be empty', true); return; }
  if (!token) { showMessage('Auth token cannot be empty', true); return; }

  localStorage.setItem('turso_url', url);
  localStorage.setItem('turso_token', token);

  hideSettings();
  hideMessage();
  const tables = await refreshListSelect();
  if (!tables.includes(getTable())) await initDatabase();
  await loadTodos();
}

async function switchTable() {
  const table = document.getElementById('listSelect').value;
  if (!table) return;
  localStorage.setItem('turso_table', table);
  await loadTodos();
}

function clearSettings() {
  if (!window.confirm('Clear all credentials and reset? This cannot be undone.')) return;
  localStorage.removeItem('turso_url');
  localStorage.removeItem('turso_token');
  localStorage.removeItem('turso_table');
  document.getElementById('listSelect').innerHTML = '';
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
    showMessage(`Failed to initialise database: ${err.message}`, true);
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
    showMessage('Loading...');
    todos = await fetchTodos();
    renderTodos();
    hideMessage();
  } catch (err) {
    showMessage(`Failed to load todos: ${err.message}`, true);
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
  focusInput();

  try {
    await tursoQuery(
      `INSERT INTO "${table}" (id, content, created_at) VALUES (?, ?, ?)`,
      [item.id, content, item.created_at]
    );
  } catch (err) {
    todos = todos.filter(t => t !== item);
    renderTodos();
    showMessage(`Failed to add todo: ${err.message}`, true);
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
    showMessage(`Failed to update todo: ${err.message}`, true);
  }
}

async function deleteTodo(id) {
  const table = getTable();
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) return;
  const [item] = todos.splice(index, 1);
  renderTodos();

  try {
    await tursoQuery(`DELETE FROM "${table}" WHERE id = ?`, [id]);
  } catch (err) {
    todos.splice(index, 0, item);
    renderTodos();
    showMessage(`Failed to delete todo: ${err.message}`, true);
  }
}

async function copyToClipboard(id) {
  const item = todos.find(t => t.id === id);
  if (!item) return;
  try {
    await navigator.clipboard.writeText(item.content);
    showMessage('Copied!');
    setTimeout(hideMessage, 1500);
  } catch (err) {
    showMessage('Failed to copy to clipboard', true);
  }
}

function toggleDoneSection() {
  showDone = !showDone;
  renderTodos();
}

function itemHtml(item) {
  const isDone = !!item.done_at;
  const checkIcon = isDone ? 'icon-square-check' : 'icon-square';
  const checkTitle = isDone ? 'Restore' : 'Complete';
  const actionBtn = isDone
    ? `<button class="action-btn delete-btn" data-action="delete" data-id="${item.id}" title="Delete"><span class="icon icon-trash"></span></button>`
    : `<button class="action-btn copy-btn" data-action="copy" data-id="${item.id}" title="Copy"><span class="icon icon-copy"></span></button>`;
  return `
    <div class="todo-item${isDone ? ' done-item' : ''}" data-id="${item.id}">
      <button class="action-btn check-btn" data-action="toggle" data-id="${item.id}" title="${checkTitle}"><span class="icon ${checkIcon}"></span></button>
      <span class="todo-text">${escapeHtml(item.content)}</span>
      ${actionBtn}
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
    ? '<div class="empty">All done</div>'
    : active.map(itemHtml).join('');

  if (done.length === 0) {
    toggleBtn.classList.remove('visible');
    doneList.innerHTML = '';
  } else {
    toggleBtn.classList.add('visible');
    toggleBtn.innerHTML = showDone
      ? '<span class="icon icon-chevron-up"></span>'
      : '<span class="icon icon-chevron-down"></span>';
    doneList.innerHTML = showDone ? done.map(itemHtml).join('') : '';
  }
}

function showMessage(message, isError = false) {
  const el = document.getElementById('message');
  el.textContent = message;
  el.classList.toggle('error', isError);
  el.classList.add('visible');
  clearTimeout(errorDismissTimer);
  if (isError) errorDismissTimer = setTimeout(hideMessage, 10000);
}

function hideMessage() {
  clearTimeout(errorDismissTimer);
  document.getElementById('message').classList.remove('visible', 'error');
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
}

init();
