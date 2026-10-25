(() => {
  const KEY = 'taskboard.tasks', THEME_KEY = 'taskboard.theme';
  const $ = id => document.getElementById(id);
  const list = $('list'), empty = $('empty'), summary = $('summary');

  let tasks = load(KEY, []);
  let filter = 'all';
  let dragId = null;

  function load(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch {} };

  // ---------- Theme ----------
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    $('themeIcon').textContent = t === 'dark' ? '☀️' : '🌙';
  }
  let theme = localStorage.getItem(THEME_KEY) ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme);
  $('themeToggle').onclick = () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  };

  // ---------- Actions ----------
  $('addForm').onsubmit = e => {
    e.preventDefault();
    const text = $('taskInput').value.trim();
    if (!text) return;
    tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, done: false, due: $('dueInput').value });
    $('taskInput').value = ''; $('dueInput').value = '';
    save(); render();
  };

  document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
    filter = b.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('active', x === b));
    render();
  });

  $('clearDone').onclick = () => { tasks = tasks.filter(t => !t.done); save(); render(); };

  function startEdit(task, titleEl) {
    const input = document.createElement('input');
    input.className = 'edit'; input.value = task.text; input.maxLength = 120;
    titleEl.replaceWith(input); input.focus(); input.select();
    const commit = ok => {
      const v = input.value.trim();
      if (ok && v) { task.text = v; save(); }
      render();
    };
    input.onkeydown = e => { if (e.key === 'Enter') commit(true); if (e.key === 'Escape') commit(false); };
    input.onblur = () => commit(true);
  }

  // ---------- Render ----------
  function visible() {
    return tasks.filter(t => filter === 'all' || (filter === 'completed' ? t.done : !t.done));
  }

  function dueLabel(due, done) {
    if (!due) return null;
    const d = new Date(due + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const over = !done && d < today;
    return { text: (over ? 'Overdue · ' : 'Due ') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear(), over };
  }

  function render() {
    list.innerHTML = '';
    const items = visible();
    items.forEach(t => list.appendChild(row(t)));

    const left = tasks.filter(t => !t.done).length;
    summary.textContent = tasks.length ? `${left} pending · ${tasks.length - left} completed` : 'Nothing here yet';
    empty.hidden = items.length > 0;
    empty.textContent = !tasks.length ? 'No tasks yet. Add your first one above.'
      : filter === 'completed' ? 'No completed tasks yet.' : 'All caught up. Nothing pending.';
  }

  function row(t) {
    const li = document.createElement('li');
    li.className = 'item' + (t.done ? ' done' : '');
    li.draggable = true; li.dataset.id = t.id;

    const handle = document.createElement('span');
    handle.className = 'handle'; handle.textContent = '⋮⋮'; handle.setAttribute('aria-hidden', 'true');

    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = t.done; cb.setAttribute('aria-label', 'Mark "' + t.text + '" complete');
    cb.onchange = () => { t.done = cb.checked; save(); render(); };

    const body = document.createElement('div'); body.className = 'body';
    const title = document.createElement('div'); title.className = 'title'; title.textContent = t.text;
    title.ondblclick = () => startEdit(t, title);
    body.appendChild(title);
    const dl = dueLabel(t.due, t.done);
    if (dl) {
      const d = document.createElement('div');
      d.className = 'due' + (dl.over ? ' overdue' : ''); d.textContent = dl.text;
      body.appendChild(d);
    }

    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '✕'; del.setAttribute('aria-label', 'Delete "' + t.text + '"');
    del.onclick = () => { tasks = tasks.filter(x => x.id !== t.id); save(); render(); };

    li.append(handle, cb, body, del);

    // Drag and drop
    li.ondragstart = e => { dragId = t.id; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); };
    li.ondragend = () => { dragId = null; li.classList.remove('dragging'); document.querySelectorAll('.over').forEach(x => x.classList.remove('over')); };
    li.ondragover = e => { e.preventDefault(); if (dragId && dragId !== t.id) li.classList.add('over'); };
    li.ondragleave = () => li.classList.remove('over');
    li.ondrop = e => {
      e.preventDefault(); li.classList.remove('over');
      if (!dragId || dragId === t.id) return;
      const from = tasks.findIndex(x => x.id === dragId);
      const [moved] = tasks.splice(from, 1);
      tasks.splice(tasks.findIndex(x => x.id === t.id), 0, moved);
      save(); render();
    };
    return li;
  }

  render();
})();