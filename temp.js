
    // ===================================================================
    //  DATA LAYER — LocalStorage
    // ===================================================================

    function loadData(key, fallback = []) {
      try {
        const d = localStorage.getItem('sm_' + key);
        return d ? JSON.parse(d) : fallback;
      } catch { return fallback; }
    }

    function saveData(key, data) {
      localStorage.setItem('sm_' + key, JSON.stringify(data));
    }

    function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

    function todayStr() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function formatDate(dateStr) {
      if (!dateStr) return '';
      const ymd = String(dateStr).split('T')[0];
      const d = new Date(ymd + 'T00:00:00');
      if (isNaN(d.getTime())) return String(dateStr);
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const days = ['日', '月', '火', '水', '木', '金', '土'];
      return `${m}/${day}(${days[d.getDay()]})`;
    }

    function formatDateFull(dateStr) {
      if (!dateStr) return '';
      const ymd = String(dateStr).split('T')[0];
      const d = new Date(ymd + 'T00:00:00');
      if (isNaN(d.getTime())) return String(dateStr);
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    }

    // ===================================================================
    //  TAB NAVIGATION
    // ===================================================================

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
      });
    });

    // ===================================================================
    //  1. TASK MANAGEMENT
    // ===================================================================

    let tasks = loadData('tasks');
    let taskFilter = 'all';

    // --- Customizable Categories (LocalStorage) ---
    const DEFAULT_TASK_CATS = [
      { key: 'assignment', label: '大学の課題' },
      { key: 'research', label: '研究' },
      { key: 'programming', label: 'プログラミング' },
      { key: 'other', label: 'その他' }
    ];
    const DEFAULT_STUDY_SUBJECTS = ['AI', '量子力学', '英語', '数学', 'プログラミング', '物理', 'その他'];

    function getTaskCats() {
      return loadData('taskCats', DEFAULT_TASK_CATS);
    }
    function getStudySubjects() {
      return loadData('studySubjects', DEFAULT_STUDY_SUBJECTS);
    }

    const CAT_COLORS = ['cat-assignment', 'cat-research', 'cat-programming', 'cat-other'];

    function getTaskCatInfo(key) {
      const cats = getTaskCats();
      const idx = cats.findIndex(c => c.key === key);
      if (idx === -1) return { label: key, cls: 'cat-other' };
      return { label: cats[idx].label, cls: CAT_COLORS[idx % CAT_COLORS.length] };
    }

    function renderTaskCategorySelect() {
      const sel = document.getElementById('task-category');
      const cats = getTaskCats();
      sel.innerHTML = cats.map(c => `<option value="${escHtml(c.key)}">${escHtml(c.label)}</option>`).join('');
    }

    function renderStudySubjectSelect() {
      const sel = document.getElementById('study-subject');
      const subjects = getStudySubjects();
      sel.innerHTML = subjects.map(s => `<option value="${escHtml(s)}">${escHtml(s)}</option>`).join('');
    }

    // --- Customize Modal ---
    function openCustomizeModal(type) {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'customize-modal';
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

      const title = type === 'task' ? 'タスクカテゴリの編集' : '勉強科目の編集';
      const items = type === 'task' ? getTaskCats() : getStudySubjects();

      let itemsHtml;
      if (type === 'task') {
        itemsHtml = items.map((c, i) => `
                    <div class="modal-item">
                        <span>${escHtml(c.label)}</span>
                        <button class="modal-item-btn edit" onclick="editCustomItem('task', ${i})" title="編集">✏️</button>
                        <button class="modal-item-btn" onclick="deleteCustomItem('task', ${i})" title="削除">×</button>
                    </div>`).join('');
      } else {
        itemsHtml = items.map((s, i) => `
                    <div class="modal-item">
                        <span>${escHtml(s)}</span>
                        <button class="modal-item-btn edit" onclick="editCustomItem('study', ${i})" title="編集">✏️</button>
                        <button class="modal-item-btn" onclick="deleteCustomItem('study', ${i})" title="削除">×</button>
                    </div>`).join('');
      }

      overlay.innerHTML = `
                <div class="modal-box">
                    <div class="modal-title">${title}<button class="modal-close" onclick="document.getElementById('customize-modal').remove()">×</button></div>
                    <div id="modal-items">${itemsHtml}</div>
                    <div class="modal-add-row">
                        <input type="text" id="modal-new-item" placeholder="新しい項目名...">
                        <button class="btn btn-blue btn-sm" onclick="addCustomItem('${type}')">追加</button>
                    </div>
                </div>`;

      document.body.appendChild(overlay);
      document.getElementById('modal-new-item').focus();
      document.getElementById('modal-new-item').addEventListener('keydown', e => {
        if (e.key === 'Enter') addCustomItem(type);
      });
    }

    function addCustomItem(type) {
      const input = document.getElementById('modal-new-item');
      const name = input.value.trim();
      if (!name) return;

      if (type === 'task') {
        const cats = getTaskCats();
        const key = name.toLowerCase().replace(/[^a-z0-9぀-鿿]/g, '') + '_' + Date.now();
        cats.push({ key, label: name });
        saveData('taskCats', cats);
        renderTaskCategorySelect();
      } else {
        const subjects = getStudySubjects();
        subjects.push(name);
        saveData('studySubjects', subjects);
        renderStudySubjectSelect();
      }

      document.getElementById('customize-modal').remove();
      openCustomizeModal(type);
    }

    function deleteCustomItem(type, index) {
      if (type === 'task') {
        const cats = getTaskCats();
        if (cats.length <= 1) { alert('最低1つのカテゴリが必要です。'); return; }
        cats.splice(index, 1);
        saveData('taskCats', cats);
        renderTaskCategorySelect();
      } else {
        const subjects = getStudySubjects();
        if (subjects.length <= 1) { alert('最低1つの科目が必要です。'); return; }
        subjects.splice(index, 1);
        saveData('studySubjects', subjects);
        renderStudySubjectSelect();
      }

      document.getElementById('customize-modal').remove();
      openCustomizeModal(type);
    }

    function editCustomItem(type, index) {
      if (type === 'task') {
        const cats = getTaskCats();
        const newName = prompt('新しい名前:', cats[index].label);
        if (!newName || !newName.trim()) return;
        cats[index].label = newName.trim();
        saveData('taskCats', cats);
        renderTaskCategorySelect();
        renderTasks();
      } else {
        const subjects = getStudySubjects();
        const oldName = subjects[index];
        const newName = prompt('新しい名前:', oldName);
        if (!newName || !newName.trim()) return;
        subjects[index] = newName.trim();
        saveData('studySubjects', subjects);
        // Update all existing study records with old name
        studies.forEach(s => { if (s.subject === oldName) s.subject = newName.trim(); });
        saveData('studies', studies);
        renderStudySubjectSelect();
        renderStudy();
      }

      document.getElementById('customize-modal').remove();
      openCustomizeModal(type);
    }

    function addTask() {
      const inp = document.getElementById('task-input');
      const cat = document.getElementById('task-category').value;
      const text = inp.value.trim();
      const memo = document.getElementById('task-memo-input').value.trim();
      if (!text) return;

      tasks.unshift({ id: genId(), text, category: cat, done: false, createdAt: todayStr(), memo });
      saveData('tasks', tasks);
      inp.value = '';
      document.getElementById('task-memo-input').value = '';
      renderTasks();
    }

    document.getElementById('task-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') addTask();
    });

    function toggleTask(id) {
      const t = tasks.find(t => t.id === id);
      if (t) t.done = !t.done;
      saveData('tasks', tasks);
      renderTasks();
    }

    function deleteTask(id) {
      if (!confirm('このタスクを削除しますか？')) return;
      tasks = tasks.filter(t => t.id !== id);
      saveData('tasks', tasks);
      renderTasks();
    }

    function editTask(id) {
      const t = tasks.find(t => t.id === id);
      if (!t) return;
      const newText = prompt('タスクを編集:', t.text);
      if (newText === null || !newText.trim()) return;
      t.text = newText.trim();
      saveData('tasks', tasks);
      renderTasks();
    }

    function filterTasks(filter, el) {
      taskFilter = filter;
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      renderTasks();
    }

    function toggleTaskMemo(id) {
      const area = document.getElementById('task-memo-area-' + id);
      if (!area) return;
      if (area.style.display === 'none' || !area.style.display) {
        area.style.display = 'block';
        const ta = document.getElementById('task-memo-ta-' + id);
        if (ta) ta.focus();
      } else {
        area.style.display = 'none';
      }
    }

    function saveTaskMemo(id) {
      const t = tasks.find(t => t.id === id);
      if (!t) return;
      const ta = document.getElementById('task-memo-ta-' + id);
      if (!ta) return;
      t.memo = ta.value.trim();
      saveData('tasks', tasks);
      renderTasks();
    }

    function renderTasks() {
      let filtered = tasks;
      if (taskFilter === 'pending') filtered = tasks.filter(t => !t.done);
      if (taskFilter === 'done') filtered = tasks.filter(t => t.done);

      const total = tasks.length;
      const done = tasks.filter(t => t.done).length;
      document.getElementById('task-total').textContent = total;
      document.getElementById('task-done').textContent = done;
      document.getElementById('task-pending').textContent = total - done;

      const list = document.getElementById('task-list');
      if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div>${taskFilter === 'all' ? 'タスクを追加しましょう' : '該当するタスクがありません'}</div>`;
        return;
      }

      list.innerHTML = filtered.map(t => {
        const cat = getTaskCatInfo(t.category);
        const hasMemo = t.memo && t.memo.trim();
        const memoPreview = hasMemo
          ? `<div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px;padding:6px 8px;background:var(--bg-tertiary);border-radius:6px;white-space:pre-wrap;word-break:break-word;">📌 ${escHtml(t.memo)}</div>`
          : '';
        return `
    <div class="task-item">
      <div style="display:flex;align-items:center;gap:8px;">
        <div class="task-check ${t.done ? 'done' : ''}" onclick="toggleTask('${t.id}')">✓</div>
        <span class="task-text ${t.done ? 'done' : ''}">${escHtml(t.text)}</span>
        <span class="task-category ${cat.cls}">${escHtml(cat.label)}</span>
        <button class="task-delete" onclick="event.stopPropagation();toggleTaskMemo('${t.id}')" title="メモ" style="color:var(--accent-cyan);">📌</button>
        <button class="task-delete" onclick="event.stopPropagation();editTask('${t.id}')" title="編集" style="color:var(--accent-blue);">✏️</button>
        <button class="task-delete" onclick="event.stopPropagation();deleteTask('${t.id}')" title="削除">×</button>
      </div>
      ${memoPreview}
      <div id="task-memo-area-${t.id}" style="display:none;margin-top:6px;">
        <textarea id="task-memo-ta-${t.id}" rows="3"
          style="width:100%;background:var(--bg-tertiary);border:1px solid var(--accent-cyan);border-radius:8px;padding:10px;color:var(--text-primary);font-family:var(--font);font-size:0.85rem;line-height:1.6;resize:vertical;"
          placeholder="メモ・詳細・手順など">${escHtml(t.memo || '')}</textarea>
        <div style="display:flex;gap:8px;margin-top:4px;justify-content:flex-end;">
          <button class="btn btn-sm" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);" onclick="event.stopPropagation();toggleTaskMemo('${t.id}')">キャンセル</button>
          <button class="btn btn-blue btn-sm" onclick="event.stopPropagation();saveTaskMemo('${t.id}')">💾 保存</button>
        </div>
      </div>
    </div>`;
      }).join('');
    }

    // ===================================================================
    //  2. STUDY LOG
    // ===================================================================

    let studies = loadData('studies');

    function addStudy() {
      const subject = document.getElementById('study-subject').value;
      const minutes = parseInt(document.getElementById('study-minutes').value);
      const date = document.getElementById('study-date').value || todayStr();
      const memo = document.getElementById('study-memo').value.trim();

      if (!minutes || minutes < 1) return;

      studies.unshift({ id: genId(), subject, minutes, date, memo });
      saveData('studies', studies);
      document.getElementById('study-minutes').value = '';
      document.getElementById('study-memo').value = '';
      renderStudy();
    }

    document.getElementById('study-minutes').addEventListener('keydown', e => {
      if (e.key === 'Enter') addStudy();
    });

    function deleteStudy(id) {
      if (!confirm('この学習記録を削除しますか？')) return;
      studies = studies.filter(s => s.id !== id);
      saveData('studies', studies);
      renderStudy();
    }

    function editStudy(id) {
      const s = studies.find(s => s.id === id);
      if (!s) return;
      const newMinutes = prompt('学習時間（分）:', s.minutes);
      if (newMinutes === null) return;
      const mins = parseInt(newMinutes);
      if (!mins || mins < 1) { alert('正しい数値を入力してください。'); return; }
      const newMemo = prompt('メモ:', s.memo || '');
      if (newMemo !== null) s.memo = newMemo.trim();
      s.minutes = mins;
      saveData('studies', studies);
      renderStudy();
    }

    function minutesToHM(m) {
      const h = Math.floor(m / 60);
      const mins = m % 60;
      return h > 0 ? `${h}h ${mins}m` : `${mins}m`;
    }

    function renderStudy() {
      const today = todayStr();
      const todayMin = studies.filter(s => s.date === today).reduce((a, s) => a + s.minutes, 0);

      // Week calculation
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      const weekMin = studies.filter(s => s.date >= weekStartStr && s.date <= today).reduce((a, s) => a + s.minutes, 0);

      document.getElementById('study-today').textContent = minutesToHM(todayMin);
      document.getElementById('study-week').textContent = minutesToHM(weekMin);
      document.getElementById('study-total-count').textContent = studies.length;

      // Subject breakdown
      const subjectTotals = {};
      studies.forEach(s => {
        subjectTotals[s.subject] = (subjectTotals[s.subject] || 0) + s.minutes;
      });

      const breakdown = document.getElementById('study-breakdown');
      const subjects = Object.entries(subjectTotals).sort((a, b) => b[1] - a[1]);
      const maxMin = subjects.length > 0 ? subjects[0][1] : 1;

      if (subjects.length === 0) {
        breakdown.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div>学習記録がありません</div>';
      } else {
        const colors = ['var(--accent-purple)', 'var(--accent-blue)', 'var(--accent-cyan)', 'var(--accent-green)', 'var(--accent-orange)', 'var(--accent-pink)', 'var(--accent-red)'];
        breakdown.innerHTML = subjects.map(([subj, mins], i) => {
          const pct = Math.max(8, (mins / maxMin) * 100);
          const color = colors[i % colors.length];
          return `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px;">
          <span style="font-weight:500;">${escHtml(subj)}</span>
          <span style="color:var(--text-muted);">${minutesToHM(mins)}</span>
        </div>
        <div style="height:6px;background:var(--bg-card);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 0.5s ease;"></div>
        </div>
      </div>`;
        }).join('');
      }

      // History
      const list = document.getElementById('study-list');
      const recent = studies.slice(0, 30);
      if (recent.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">📖</div>学習を記録しましょう</div>';
        return;
      }

      const subjectIcons = { 'AI': '🤖', '量子力学': '⚛️', '英語': '🌍', '数学': '📐', 'プログラミング': '💻', '物理': '🔬', 'その他': '📝' };
      list.innerHTML = recent.map(s => {
        const memoHtml = s.memo ? `<div class="study-memo-preview">📝 ${escHtml(s.memo)}</div>` : '';
        return `
    <div class="record-item" style="cursor:pointer;" onclick="openStudyDetail('${s.id}')" title="タップで詳細表示">
      <div class="record-icon" style="background:rgba(188,140,255,0.12);">${subjectIcons[s.subject] || '📝'}</div>
      <div class="record-info">
        <div class="record-main">${escHtml(s.subject)}</div>
        <div class="record-sub">${formatDate(s.date)}</div>
        ${memoHtml}
      </div>
      <span class="record-value" style="color:var(--accent-purple);">${minutesToHM(s.minutes)}</span>
      <button class="record-delete" onclick="event.stopPropagation();editStudy('${s.id}')" title="編集" style="color:var(--accent-blue);">&#x270f;&#xfe0f;</button>
      <button class="record-delete" onclick="event.stopPropagation();deleteStudy('${s.id}')" title="削除">×</button>
    </div>`;
      }).join('');
    }

    // ===================================================================
    //  3. FINANCE
    // ===================================================================

    let finances = loadData('finances');
    let financeType = 'income';
    let financeMonth = new Date(); // Tracks currently viewed month

    const INCOME_CATS = ['武田塾', '大学バイト', 'その他収入'];
    const EXPENSE_CATS = ['食費', 'プロテイン', 'ゲーム', '交際費', '交通費', '日用品', 'その他'];

    function setFinanceType(type) {
      financeType = type;
      const incBtn = document.getElementById('finance-type-income');
      const expBtn = document.getElementById('finance-type-expense');
      incBtn.className = 'toggle-btn' + (type === 'income' ? ' active-income' : '');
      expBtn.className = 'toggle-btn' + (type === 'expense' ? ' active-expense' : '');
      updateFinanceCategories();
    }

    function updateFinanceCategories() {
      const sel = document.getElementById('finance-category');
      const cats = financeType === 'income' ? INCOME_CATS : EXPENSE_CATS;
      sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    function addFinance() {
      const category = document.getElementById('finance-category').value;
      const amount = parseInt(document.getElementById('finance-amount').value);
      const memo = document.getElementById('finance-memo').value.trim();
      const date = document.getElementById('finance-date').value || todayStr();

      if (!amount || amount < 1) return;

      finances.unshift({ id: genId(), type: financeType, category, amount, memo, date });
      saveData('finances', finances);
      document.getElementById('finance-amount').value = '';
      document.getElementById('finance-memo').value = '';
      renderFinance();
    }

    function deleteFinance(id) {
      if (!confirm('この収支記録を削除しますか？')) return;
      finances = finances.filter(f => f.id !== id);
      saveData('finances', finances);
      renderFinance();
    }

    function editFinance(id) {
      const f = finances.find(f => f.id === id);
      if (!f) return;
      const newAmount = prompt('金額:', f.amount);
      if (newAmount === null) return;
      const amt = parseInt(newAmount);
      if (!amt || amt < 1) { alert('正しい金額を入力してください。'); return; }
      const newMemo = prompt('メモ:', f.memo || '');
      if (newMemo !== null) f.memo = newMemo.trim();
      f.amount = amt;
      saveData('finances', finances);
      renderFinance();
    }

    function changeFinanceMonth(delta) {
      financeMonth.setMonth(financeMonth.getMonth() + delta);
      renderFinance();
    }

    function renderFinance() {
      const y = financeMonth.getFullYear();
      const m = financeMonth.getMonth();
      const monthStr = `${y}年${m + 1}月`;
      document.getElementById('finance-month-label').textContent = monthStr;

      const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
      const monthItems = finances.filter(f => f.date.startsWith(monthPrefix));

      const incomeTotal = monthItems.filter(f => f.type === 'income').reduce((a, f) => a + f.amount, 0);
      const expenseTotal = monthItems.filter(f => f.type === 'expense').reduce((a, f) => a + f.amount, 0);
      const balance = incomeTotal - expenseTotal;

      document.getElementById('finance-balance').textContent = `¥${balance.toLocaleString()}`;
      document.getElementById('finance-balance').className = 'balance-amount ' + (balance >= 0 ? 'balance-positive' : 'balance-negative');
      document.getElementById('finance-income-total').textContent = `¥${incomeTotal.toLocaleString()}`;
      document.getElementById('finance-expense-total').textContent = `¥${expenseTotal.toLocaleString()}`;

      // Render chart
      renderFinanceChart(monthItems);

      const list = document.getElementById('finance-list');
      if (monthItems.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">💰</div>この月の記録はありません</div>';
        return;
      }

      const incomeIcons = { '武田塾': '🏫', '大学バイト': '🎓', 'その他収入': '💵' };
      const expenseIcons = { '食費': '🍙', 'プロテイン': '💪', 'ゲーム': '🎮', '交際費': '🍻', '交通費': '🚃', '日用品': '🛒', 'その他': '📦' };

      list.innerHTML = monthItems.map(f => {
        const isIncome = f.type === 'income';
        const icon = isIncome ? (incomeIcons[f.category] || '💵') : (expenseIcons[f.category] || '📦');
        const bgColor = isIncome ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)';
        return `
    <div class="record-item">
      <div class="record-icon" style="background:${bgColor};">${icon}</div>
      <div class="record-info">
        <div class="record-main">${escHtml(f.category)}${f.memo ? ' — ' + escHtml(f.memo) : ''}</div>
        <div class="record-sub">${formatDate(f.date)}</div>
      </div>
      <span class="record-value ${isIncome ? 'income' : 'expense'}">${isIncome ? '+' : '-'}¥${f.amount.toLocaleString()}</span>
      <button class="record-delete" onclick="editFinance('${f.id}')" title="編集" style="color:var(--accent-blue);">&#x270f;&#xfe0f;</button>
      <button class="record-delete" onclick="deleteFinance('${f.id}')" title="削除">×</button>
    </div>`;
      }).join('');
    }

    // ===================================================================
    //  4. DIARY
    // ===================================================================

    let diaryDate = todayStr();
    let diaryView = 'editor';
    let calMonth = new Date();

    let currentRating = null; // S, A, B, C, D

    function setDiaryRating(rating) {
      currentRating = currentRating === rating ? null : rating;
      document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.rating === currentRating);
      });
    }

    function setDiaryView(view) {
      diaryView = view;
      document.getElementById('diary-view-editor').classList.toggle('active', view === 'editor');
      document.getElementById('diary-view-calendar').classList.toggle('active', view === 'calendar');
      document.getElementById('diary-editor-panel').style.display = view === 'editor' ? 'block' : 'none';
      document.getElementById('diary-calendar-panel').style.display = view === 'calendar' ? 'block' : 'none';
      if (view === 'calendar') renderCalendar();
    }

    // --- Calendar ---
    function changeCalMonth(delta) {
      calMonth.setMonth(calMonth.getMonth() + delta);
      renderCalendar();
    }

    function renderCalendar() {
      const y = calMonth.getFullYear();
      const m = calMonth.getMonth();
      document.getElementById('cal-month-label').textContent = `${y}年${m + 1}月`;

      const diaries = loadData('diaries', {});
      const firstDay = new Date(y, m, 1).getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const todayS = todayStr();

      const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];
      let html = dayHeaders.map((d, i) => {
        let cls = 'cal-day-header';
        if (i === 0) cls += ' sun';
        if (i === 6) cls += ' sat';
        return `<div class="${cls}">${d}</div>`;
      }).join('');

      for (let i = 0; i < firstDay; i++) {
        html += '<div class="cal-day empty"></div>';
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasEntry = diaries[dateStr];
        const isToday = dateStr === todayS;
        const isSelected = dateStr === diaryDate;
        let cls = 'cal-day';
        if (isToday) cls += ' today';
        if (isSelected) cls += ' selected';
        const dot = hasEntry
          ? (hasEntry.rating
            ? `<div class="cal-rating rate-${hasEntry.rating}">${hasEntry.rating}</div>`
            : '<div class="cal-dot"></div>')
          : '';
        html += `<div class="${cls}" onclick="selectCalDay('${dateStr}')">${day}${dot}</div>`;
      }

      document.getElementById('calendar-grid').innerHTML = html;
    }

    function selectCalDay(dateStr) {
      diaryDate = dateStr;
      renderDiary();
      setDiaryView('editor');
    }

    // --- Date Nav ---
    function changeDiaryDate(delta) {
      const d = new Date(diaryDate + 'T00:00:00');
      d.setDate(d.getDate() + delta);
      diaryDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      renderDiary();
    }


    // --- Save / Load ---
    function saveDiary() {
      const content = document.getElementById('diary-content').value.trim();
      let diaries = loadData('diaries', {});
      if (typeof diaries !== 'object' || Array.isArray(diaries)) diaries = {};

      // 削除フラグが立っているか判定
      const isRemovingImage = window.diaryRemovingImage === true;
      const existing = diaries[diaryDate] || {};

      if (content || currentRating || existing.imageUrl) {
        diaries[diaryDate] = {
          content,
          rating: currentRating || existing.rating || null,
          imageUrl: isRemovingImage ? null : existing.imageUrl || null,
          updatedAt: new Date().toISOString()
        };
        if (isRemovingImage) { window.diaryRemovingImage = false; }
      } else {
        delete diaries[diaryDate];
      }

      // クリーニングアップ: UUIDなど YYYY-MM-DD 形式ではないキーを削除（GAS側にも反映させる）
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      Object.keys(diaries).forEach(k => {
        if (!dateRegex.test(k)) {
          delete diaries[k];
        }
      });

      try {
        saveData('diaries', diaries);
      } catch (e) {
        if (e.name === 'QuotaExceededError' || e.toString().includes('quota')) {
          alert('LocalStorageの容量が不足しています。古い日記を削除してください。');
          return;
        }
        throw e;
      }

      const msg = document.getElementById('diary-saved-msg');
      msg.classList.add('show');
      setTimeout(() => msg.classList.remove('show'), 2000);
      renderDiaryHistory();
    }

    function renderDiary() {
      const d = new Date(diaryDate + 'T00:00:00');
      const days = ['日', '月', '火', '水', '木', '金', '土'];
      document.getElementById('diary-date-label').textContent =
        `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;

      // タイトルを動的に変更
      const titleEl = document.getElementById('diary-editor-title');
      if (titleEl) {
        titleEl.textContent = diaryDate === todayStr() ? '今日のふりかえり' : `${formatDateFull(diaryDate)}のふりかえり`;
      }

      const diaries = loadData('diaries', {});
      const entry = diaries[diaryDate];
      document.getElementById('diary-content').value = entry ? entry.content : '';
      currentRating = entry && entry.rating ? entry.rating : null;
      document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.rating === currentRating);
      });

      // 画像の表示
      const imgPreview = document.getElementById('diary-image-preview');
      const imgEl = document.getElementById('diary-preview-img');
      const inpFile = document.getElementById('diary-image-input');

      pendingImageData = null;
      pendingImageFile = null;
      window.diaryRemovingImage = false; // 初期化
      if (inpFile) inpFile.value = '';

      if (entry && entry.imageUrl) {
        imgEl.src = entry.imageUrl;
        imgPreview.style.display = 'block';
      } else {
        imgEl.src = '';
        imgPreview.style.display = 'none';
      }

      renderDiaryHistory();
    }

    function renderDiaryHistory() {
      const diaries = loadData('diaries', {});
      // 日付フォーマット(YYYY-MM-DD)に合致するキーのみを抽出してソート
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const dates = Object.keys(diaries)
        .filter(k => dateRegex.test(k))
        .sort()
        .reverse()
        .slice(0, 10);
      const container = document.getElementById('diary-history');

      if (dates.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">✏️</div>まだ日記がありません</div>';
        return;
      }

      container.innerHTML = dates.map(date => {
        const entry = diaries[date];
        const preview = entry.content.length > 80 ? entry.content.slice(0, 80) + '…' : entry.content;
        const isActive = date === diaryDate;

        const ratingBadge = entry.rating ? `<span class="history-rating rate-${entry.rating}">${entry.rating}</span>` : '';
        return `
    <div class="record-item" style="cursor:pointer;${isActive ? 'border-color:var(--accent-orange);' : ''}"
         onclick="editDiary('${date}')">
      <div class="record-icon" style="background:rgba(210,153,34,0.12);">📝</div>
      <div class="record-info">
        <div class="record-main">${formatDateFull(date)}${ratingBadge}</div>
        <div class="record-sub">${escHtml(preview)}</div>
      </div>
    </div>`;
      }).join('');
    }

    // ===================================================================
    //  UTILITIES
    // ===================================================================

    function escHtml(str) {
      const d = document.createElement('div');
      d.textContent = str;
      return d.innerHTML;
    }

    // ===================================================================
    //  FINANCE CHART (SVG Donut)
    // ===================================================================

    let chartType = 'income';
    const CHART_COLORS = ['#58a6ff', '#bc8cff', '#3fb950', '#d29922', '#f85149', '#39d2c0', '#f778ba', '#8b949e', '#da3633', '#388bfd'];

    function setChartType(type) {
      chartType = type;
      document.getElementById('chart-toggle-expense').classList.toggle('active', type === 'expense');
      document.getElementById('chart-toggle-income').classList.toggle('active', type === 'income');
      renderFinance();
    }

    function renderFinanceChart(monthItems) {
      const container = document.getElementById('finance-chart');
      const items = monthItems.filter(f => f.type === chartType);

      if (items.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">${chartType === 'expense' ? '💸' : '💰'}</div>${chartType === 'expense' ? '支出' : '収入'}の記録がありません</div>`;
        return;
      }

      // Aggregate by category
      const catTotals = {};
      items.forEach(f => { catTotals[f.category] = (catTotals[f.category] || 0) + f.amount; });
      const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((a, [, v]) => a + v, 0);

      // Build SVG donut
      const r = 55, cx = 70, cy = 70, strokeWidth = 20;
      const circumference = 2 * Math.PI * r;
      let offset = 0;
      const paths = sorted.map(([cat, amount], i) => {
        const pct = amount / total;
        const dashLength = pct * circumference;
        const dashGap = circumference - dashLength;
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const path = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${dashLength} ${dashGap}" stroke-dashoffset="${-offset}" style="transition:all 0.5s ease;"/>`;
        offset += dashLength;
        return path;
      }).join('');

      const svg = `<svg viewBox="0 0 140 140" width="140" height="140" style="transform:rotate(-90deg);">${paths}</svg>`;

      const legend = sorted.map(([cat, amount], i) => {
        const pct = ((amount / total) * 100).toFixed(1);
        const color = CHART_COLORS[i % CHART_COLORS.length];
        return `<div class="legend-item">
                    <div class="legend-dot" style="background:${color};"></div>
                    <span class="legend-label">${escHtml(cat)}</span>
                    <span class="legend-value">¥${amount.toLocaleString()}</span>
                    <span style="color:var(--text-muted);font-size:0.7rem;">${pct}%</span>
                </div>`;
      }).join('');

      container.innerHTML = `
                <div class="chart-container">
                    <div class="chart-svg-wrap">
                        ${svg}
                        <div class="chart-center-text">
                            <div class="chart-center-amount" style="color:${chartType === 'expense' ? 'var(--accent-red)' : 'var(--accent-green)'}">¥${total.toLocaleString()}</div>
                            <div class="chart-center-label">${chartType === 'expense' ? '支出合計' : '収入合計'}</div>
                        </div>
                    </div>
                    <div class="chart-legend">${legend}</div>
                </div>`;
    }

    // ===================================================================
    //  5. QUESTIONS
    // ===================================================================

    let questions = loadData('questions');
    let questionFilter = 'all';

    function addQuestion() {
      const inp = document.getElementById('q-input');
      const text = inp.value.trim();
      if (!text) return;
      questions.unshift({ id: genId(), text, solved: false, answer: '', createdAt: todayStr() });
      saveData('questions', questions);
      inp.value = '';
      renderQuestions();
    }

    document.getElementById('q-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') addQuestion();
    });

    function toggleQuestion(id) {
      const q = questions.find(q => q.id === id);
      if (q) q.solved = !q.solved;
      saveData('questions', questions);
      renderQuestions();
    }

    function deleteQuestion(id) {
      if (!confirm('この疑問を削除しますか？')) return;
      questions = questions.filter(q => q.id !== id);
      saveData('questions', questions);
      renderQuestions();
    }

    function editQuestion(id) {
      const q = questions.find(q => q.id === id);
      if (!q) return;
      const newText = prompt('疑問を編集:', q.text);
      if (newText === null || !newText.trim()) return;
      q.text = newText.trim();
      saveData('questions', questions);
      renderQuestions();
    }

    function addAnswer(id) {
      // インライン入力欄のトグル表示
      toggleAnswerInput(id);
    }

    function toggleAnswerInput(id) {
      const area = document.getElementById('answer-area-' + id);
      if (!area) return;
      if (area.style.display === 'none' || area.style.display === '') {
        area.style.display = 'block';
        const ta = document.getElementById('answer-ta-' + id);
        if (ta) ta.focus();
      } else {
        area.style.display = 'none';
      }
    }

    function saveAnswer(id) {
      const q = questions.find(q => q.id === id);
      if (!q) return;
      const ta = document.getElementById('answer-ta-' + id);
      if (!ta) return;
      q.answer = ta.value.trim();
      saveData('questions', questions);
      renderQuestions();
    }

    function openQuestionDetail(id) {
      const q = questions.find(x => x.id === id);
      if (!q) return;
      const statusLabel = q.solved ? '✅ 解決済み' : '❓ 未解決';
      const body = q.answer ? q.answer : '（まだ解答・メモがありません）';
      openDetailModal({
        title: q.text,
        date: formatDateFull(q.createdAt),
        meta: [statusLabel],
        body
      });
    }

    function filterQuestions(filter, el) {
      questionFilter = filter;
      document.querySelectorAll('#panel-questions .filter-chip').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      renderQuestions();
    }

    function renderQuestions() {
      const total = questions.length;
      const solved = questions.filter(q => q.solved).length;
      document.getElementById('q-total').textContent = total;
      document.getElementById('q-open').textContent = total - solved;
      document.getElementById('q-solved').textContent = solved;

      let filtered = questions;
      if (questionFilter === 'open') filtered = questions.filter(q => !q.solved);
      if (questionFilter === 'solved') filtered = questions.filter(q => q.solved);

      const list = document.getElementById('question-list');
      if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">❓</div>${questionFilter === 'all' ? '疑問や調べたいことを追加しましょう' : '該当する項目がありません'}</div>`;
        return;
      }

      list.innerHTML = filtered.map(q => {
        const hasAnswer = q.answer && q.answer.trim();
        const answerPreview = hasAnswer
          ? `<div class="question-answer" style="cursor:pointer;" onclick="event.stopPropagation();openQuestionDetail('${q.id}')">${escHtml(q.answer)}</div>`
          : '';
        return `
    <div class="question-item ${q.solved ? 'solved' : ''}">
      <div class="question-header" style="cursor:pointer;" onclick="openQuestionDetail('${q.id}')">
        <div class="question-check ${q.solved ? 'done' : ''}" onclick="event.stopPropagation();toggleQuestion('${q.id}')">✓</div>
        <span class="question-text ${q.solved ? 'done' : ''}">${escHtml(q.text)}</span>
        <button class="question-delete" onclick="event.stopPropagation();editQuestion('${q.id}')" title="編集" style="color:var(--accent-blue);">✏️</button>
        <button class="question-delete" onclick="event.stopPropagation();deleteQuestion('${q.id}')" title="削除">×</button>
      </div>
      <div class="question-meta">
        <span class="question-date">${formatDate(q.createdAt)}</span>
        <button class="question-answer-btn" onclick="event.stopPropagation();toggleAnswerInput('${q.id}')">${hasAnswer ? '✏️ 解答編集' : '💡 解答を入力'}</button>
      </div>
      ${answerPreview}
      <div id="answer-area-${q.id}" style="display:none;margin-top:8px;">
        <textarea id="answer-ta-${q.id}" rows="4"
          style="width:100%;background:var(--bg-tertiary);border:1px solid var(--accent-cyan);border-radius:8px;padding:10px;color:var(--text-primary);font-family:var(--font);font-size:0.875rem;line-height:1.6;resize:vertical;"
          placeholder="解答・メモを入力&#10;例）○○という概念は〜から来ており、〜に使われる。">${escHtml(q.answer || '')}</textarea>
        <div style="display:flex;gap:8px;margin-top:6px;justify-content:flex-end;">
          <button class="btn btn-sm" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);" onclick="event.stopPropagation();toggleAnswerInput('${q.id}')">キャンセル</button>
          <button class="btn btn-cyan btn-sm" onclick="event.stopPropagation();saveAnswer('${q.id}')">💾 保存</button>
        </div>
      </div>
    </div>`;
      }).join('');
    }

    // ===================================================================
    //  INIT
    // ===================================================================

    (function init() {
      document.getElementById('study-date').value = todayStr();
      document.getElementById('finance-date').value = todayStr();

      renderTaskCategorySelect();
      renderStudySubjectSelect();
      updateFinanceCategories();

      renderTasks();
      renderStudy();
      renderFinance();
      renderDiary();
      renderQuestions();
    })();

    // ===================================================================
    //  DETAIL MODAL
    // ===================================================================

    function openDetailModal({ title, date, meta = [], body }) {
      document.getElementById('detail-modal-title').textContent = title;
      document.getElementById('detail-modal-date').textContent = date;
      document.getElementById('detail-modal-meta').innerHTML = meta.map(m =>
        `<span class="detail-modal-tag">${m}</span>`
      ).join('');
      document.getElementById('detail-modal-body').textContent = body;
      const overlay = document.getElementById('detail-modal-overlay');
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    function closeDetailModal(e) {
      if (e && e.target !== document.getElementById('detail-modal-overlay')) return;
      closeDetailModalDirect();
    }

    function closeDetailModalDirect() {
      document.getElementById('detail-modal-overlay').style.display = 'none';
      document.body.style.overflow = '';
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDetailModalDirect();
    });

    function openStudyDetail(id) {
      const s = studies.find(x => x.id === id);
      if (!s) return;
      const subjectIcons = { 'AI': '🤖', '量子力学': '⚛️', '英語': '🌍', '数学': '📐', 'プログラミング': '💻', '物理': '🔬', 'その他': '📝' };
      openDetailModal({
        title: (subjectIcons[s.subject] || '📝') + ' ' + s.subject,
        date: formatDateFull(s.date),
        meta: [minutesToHM(s.minutes)],
        body: s.memo || '（メモなし）'
      });
    }

    function editDiary(date) {
      diaryDate = date;
      setDiaryView('editor');
      renderDiary();
      const panel = document.getElementById('diary-editor-panel');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // ===================================================================
    //  STUDY CALENDAR
    // ===================================================================

    let studyCalYear = new Date().getFullYear();
    let studyCalMonth = new Date().getMonth(); // 0-indexed

    function changeStudyCal(delta) {
      studyCalMonth += delta;
      if (studyCalMonth > 11) { studyCalMonth = 0; studyCalYear++; }
      if (studyCalMonth < 0) { studyCalMonth = 11; studyCalYear--; }
      renderStudyCal();
    }

    function renderStudyCal() {
      const label = document.getElementById('study-cal-month-label');
      if (!label) return;
      label.textContent = `${studyCalYear}年${studyCalMonth + 1}月`;

      // Build day→minutes map
      const dayMap = {};
      studies.forEach(s => {
        const d = new Date(s.date + 'T00:00:00');
        if (d.getFullYear() === studyCalYear && d.getMonth() === studyCalMonth) {
          dayMap[d.getDate()] = (dayMap[d.getDate()] || 0) + s.minutes;
        }
      });

      const maxMins = Math.max(1, ...Object.values(dayMap));
      const today = new Date();
      const todayY = today.getFullYear(), todayM = today.getMonth(), todayD = today.getDate();

      const firstDay = new Date(studyCalYear, studyCalMonth, 1).getDay(); // 0=Sun
      const daysInMonth = new Date(studyCalYear, studyCalMonth + 1, 0).getDate();

      const grid = document.getElementById('study-cal-grid');
      const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
      let html = dayLabels.map(d => `<div class="study-cal-day-label">${d}</div>`).join('');

      // Empty cells before first day
      for (let i = 0; i < firstDay; i++) {
        html += `<div class="study-cal-day empty"></div>`;
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const mins = dayMap[d] || 0;
        const isToday = todayY === studyCalYear && todayM === studyCalMonth && todayD === d;
        let bg = '';
        let dotLabel = '';
        if (mins > 0) {
          const ratio = mins / maxMins;
          // Color: light purple (low) → vivid purple (high)
          const lightness = Math.round(70 - ratio * 40); // 70% → 30%
          const alpha = 0.35 + ratio * 0.65;
          bg = `background:hsla(270,80%,${lightness}%,${alpha});`;
          dotLabel = `<div class="study-cal-day-dot">${minutesToHM(mins)}</div>`;
        }
        const dateStr = `${studyCalYear}-${String(studyCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cls = ['study-cal-day', isToday ? 'today' : '', mins > 0 ? 'has-study' : ''].filter(Boolean).join(' ');
        html += `<div class="${cls}" style="${bg}" onclick="openStudyDayDetail('${dateStr}')" title="${dateStr}">
                    <div class="study-cal-day-num">${d}</div>
                    ${dotLabel}
                </div>`;
      }

      grid.innerHTML = html;
    }

    function openStudyDayDetail(dateStr) {
      const dayStudies = studies.filter(s => s.date === dateStr);
      if (dayStudies.length === 0) return;
      const totalMins = dayStudies.reduce((a, s) => a + s.minutes, 0);
      const body = dayStudies.map(s =>
        `【${s.subject}】 ${minutesToHM(s.minutes)}${s.memo ? '\n' + s.memo : ''}`
      ).join('\n\n');
      openDetailModal({
        title: '📅 ' + formatDateFull(dateStr),
        date: '合計: ' + minutesToHM(totalMins),
        meta: dayStudies.map(s => s.subject),
        body
      });
    }

    // Init study calendar on tab switch
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab === 'study') {
          studyCalYear = new Date().getFullYear();
          studyCalMonth = new Date().getMonth();
          renderStudyCal();
        }
      });
    });

    // Initial render if study tab is active
    if (document.querySelector('.tab-btn[data-tab="study"]')?.classList.contains('active')) {
      renderStudyCal();
    }

    // ===================================================================
    //  FINANCE CALENDAR
    // ===================================================================

    let financeCalYear = new Date().getFullYear();
    let financeCalMonth = new Date().getMonth(); // 0-indexed

    function changeFinanceCal(delta) {
      financeCalMonth += delta;
      if (financeCalMonth > 11) { financeCalMonth = 0; financeCalYear++; }
      if (financeCalMonth < 0) { financeCalMonth = 11; financeCalYear--; }
      renderFinanceCal();
    }

    function renderFinanceCal() {
      const label = document.getElementById('finance-cal-month-label');
      if (!label) return;
      label.textContent = `${financeCalYear}年${financeCalMonth + 1}月`;

      // Build day → { income, expense } map
      const dayMap = {};
      const allFinances = loadData('finances', []);
      allFinances.forEach(f => {
        const d = new Date(f.date + 'T00:00:00');
        if (d.getFullYear() !== financeCalYear || d.getMonth() !== financeCalMonth) return;
        const day = d.getDate();
        if (!dayMap[day]) dayMap[day] = { income: 0, expense: 0 };
        if (f.type === 'income') dayMap[day].income += f.amount;
        else dayMap[day].expense += f.amount;
      });

      const maxIncome = Math.max(1, ...Object.values(dayMap).map(v => v.income));
      const maxExpense = Math.max(1, ...Object.values(dayMap).map(v => v.expense));

      const today = new Date();
      const todayY = today.getFullYear(), todayM = today.getMonth(), todayD = today.getDate();

      const firstDay = new Date(financeCalYear, financeCalMonth, 1).getDay();
      const daysInMonth = new Date(financeCalYear, financeCalMonth + 1, 0).getDate();

      const grid = document.getElementById('finance-cal-grid');
      const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
      let html = dayLabels.map(d => `<div class="study-cal-day-label">${d}</div>`).join('');

      // Empty cells
      for (let i = 0; i < firstDay; i++) html += `<div class="study-cal-day empty"></div>`;

      for (let d = 1; d <= daysInMonth; d++) {
        const entry = dayMap[d] || { income: 0, expense: 0 };
        const isToday = todayY === financeCalYear && todayM === financeCalMonth && todayD === d;
        const dateStr = `${financeCalYear}-${String(financeCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        let bg = '', amtLabel = '', cls = ['study-cal-day'];

        if (entry.income > 0 && entry.expense > 0) {
          // 両方ある日：収支差額で判断
          const net = entry.income - entry.expense;
          if (net >= 0) {
            const ratio = entry.income / maxIncome;
            bg = `background:hsla(210,80%,${Math.round(60 - ratio * 30)}%,${0.35 + ratio * 0.6});`;
          } else {
            const ratio = entry.expense / maxExpense;
            bg = `background:hsla(0,80%,${Math.round(60 - ratio * 30)}%,${0.35 + ratio * 0.6});`;
          }
          const net2 = entry.income - entry.expense;
          amtLabel = `<div class="study-cal-day-dot">${net2 >= 0 ? '+' : ''}${(net2 / 10000 >= 1 ? (net2 / 10000).toFixed(1) + '万' : net2.toLocaleString())}</div>`;
          cls.push('has-study');
        } else if (entry.income > 0) {
          const ratio = entry.income / maxIncome;
          bg = `background:hsla(210,80%,${Math.round(60 - ratio * 30)}%,${0.35 + ratio * 0.6});`;
          const amt = entry.income;
          amtLabel = `<div class="study-cal-day-dot">${amt >= 10000 ? (amt / 10000).toFixed(1) + '万' : amt.toLocaleString()}</div>`;
          cls.push('has-study');
        } else if (entry.expense > 0) {
          const ratio = entry.expense / maxExpense;
          bg = `background:hsla(0,80%,${Math.round(60 - ratio * 30)}%,${0.35 + ratio * 0.6});`;
          const amt = entry.expense;
          amtLabel = `<div class="study-cal-day-dot">-${amt >= 10000 ? (amt / 10000).toFixed(1) + '万' : amt.toLocaleString()}</div>`;
          cls.push('has-study');
        }

        if (isToday) cls.push('today');

        html += `<div class="${cls.join(' ')}" style="${bg}" onclick="openFinanceDayDetail('${dateStr}')" title="${dateStr}">
                    <div class="study-cal-day-num">${d}</div>
                    ${amtLabel}
                </div>`;
      }

      grid.innerHTML = html;
    }

    function openFinanceDayDetail(dateStr) {
      const allFinances = loadData('finances', []);
      const dayItems = allFinances.filter(f => f.date === dateStr);
      if (dayItems.length === 0) return;
      const totalIncome = dayItems.filter(f => f.type === 'income').reduce((a, f) => a + f.amount, 0);
      const totalExpense = dayItems.filter(f => f.type === 'expense').reduce((a, f) => a + f.amount, 0);
      const net = totalIncome - totalExpense;
      const body = dayItems.map(f =>
        `${f.type === 'income' ? '💰 収入' : '💸 支出'}  ${f.category}  ¥${f.amount.toLocaleString()}${f.memo ? ' — ' + f.memo : ''}`
      ).join('\n');
      openDetailModal({
        title: '💴 ' + formatDateFull(dateStr),
        date: `収入 ¥${totalIncome.toLocaleString()}  支出 ¥${totalExpense.toLocaleString()}  収支 ${net >= 0 ? '+' : ''}¥${net.toLocaleString()}`,
        meta: [],
        body
      });
    }

    // Finance calendar: tab switch init
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab === 'finance') {
          financeCalYear = new Date().getFullYear();
          financeCalMonth = new Date().getMonth();
          renderFinanceCal();
        }
      });
    });

    // Initial render if finance tab is active
    if (document.querySelector('.tab-btn[data-tab="finance"]')?.classList.contains('active')) {
      renderFinanceCal();
    }

    // ===================================================================
    //  6. CAREER
    // ===================================================================

    const DEFAULT_SKILLS = [
      { key: 'coding', label: '基礎コーディング力', current: 20, target: 90, color: '#58a6ff' },
      { key: 'ai', label: 'AI理論', current: 20, target: 80, color: '#bc8cff' },
      { key: 'robotics', label: 'ロボット制御', current: 20, target: 70, color: '#3fb950' },
      { key: 'english', label: '技術英語', current: 60, target: 85, color: '#d29922' }
    ];

    const DEFAULT_ROADMAP = [
      {
        id: 'b2spring', title: 'B2 春休み（現在）', desc: '基礎固め＆習慣形成 — B3進級準備', status: 'current',
        categories: [
          {
            name: '💻 コーディング基礎', items: [
              { text: 'AtCoder Beginners Selection 完走', done: false },
              { text: 'Python クラス設計・テストの基礎', done: false },
              { text: 'Git/GitHub のワークフロー習得', done: false },
              { text: 'Linux コマンド操作に慣れる', done: false }
            ]
          },
          {
            name: '🧮 数学・AI理論', items: [
              { text: '線形代数 復習（固有値・行列分解）', done: false },
              { text: '微分積分 復習（多変数・偏微分）', done: false },
              { text: '統計学 基礎（確率分布・仮説検定）', done: false },
              { text: 'E資格の勉強開始（DL基礎）', done: false }
            ]
          },
          {
            name: '📝 アウトプット', items: [
              { text: 'Zenn/Qiita で学習記事を1本書く', done: false },
              { text: 'GitHub に学習リポジトリを公開', done: false }
            ]
          },
          {
            name: '💪 生活習慣', items: [
              { text: '週3回以上の筋トレ習慣化', done: false },
              { text: '毎日の自己管理アプリ記録', done: false }
            ]
          }
        ]
      },
      {
        id: 'b3first', title: 'B3 前期', desc: '専門深化＆研究室選び', status: 'future',
        categories: [
          {
            name: '💻 コーディング', items: [
              { text: 'AtCoder 緑色到達', done: false },
              { text: 'Python 中級（デコレータ・ジェネレータ）', done: false },
              { text: 'データ構造とアルゴリズム（基本）', done: false }
            ]
          },
          {
            name: '🤖 AI/ロボティクス', items: [
              { text: 'PyTorch 基礎（テンソル・autograd）', done: false },
              { text: '機械学習の基本アルゴリズム実装', done: false },
              { text: 'ROS2 入門（ロボット制御シミュレーション）', done: false }
            ]
          },
          {
            name: '🔬 研究準備', items: [
              { text: '研究室訪問・教授面談', done: false },
              { text: '興味ある研究テーマの論文を3本読む', done: false },
              { text: '研究室配属決定', done: false }
            ]
          },
          {
            name: '📖 英語', items: [
              { text: 'TOEIC 700点以上取得', done: false },
              { text: '英語の技術ドキュメントを毎日読む', done: false }
            ]
          }
        ]
      },
      {
        id: 'b3second', title: 'B3 後期', desc: '実践力強化＆E資格', status: 'future',
        categories: [
          {
            name: '💻 コーディング', items: [
              { text: 'LeetCode Medium 問題50問', done: false },
              { text: 'C++ or Rust 入門（システムプログラミング）', done: false },
              { text: '個人プロジェクト完成（ポートフォリオ用）', done: false }
            ]
          },
          {
            name: '🤖 AI/ロボティクス', items: [
              { text: 'E資格 合格', done: false },
              { text: 'CNN/RNN/Transformer 実装', done: false },
              { text: 'Kaggle コンペ参加', done: false }
            ]
          },
          {
            name: '🔬 研究', items: [
              { text: '研究室でのゼミ発表（月1回）', done: false },
              { text: '先行研究のサーベイ開始', done: false }
            ]
          },
          {
            name: '📝 アウトプット', items: [
              { text: 'Zenn/Qiita 月1記事ペース', done: false },
              { text: 'GitHub 草を毎週埋める', done: false }
            ]
          }
        ]
      },
      {
        id: 'b4', title: 'B4（卒業研究）', desc: '研究本格化＋インターン挑戦', status: 'future',
        categories: [
          {
            name: '🔬 研究', items: [
              { text: '卒論テーマ決定・研究計画策定', done: false },
              { text: '実験環境構築（GPU/クラウド）', done: false },
              { text: '中間発表に向けた実験・結果整理', done: false },
              { text: '卒業論文執筆・提出', done: false }
            ]
          },
          {
            name: '💻 技術深化', items: [
              { text: 'LeetCode Top Interview 150 完了', done: false },
              { text: 'PyTorch でオリジナルモデル設計', done: false },
              { text: 'MLOps 基礎（Docker/CI/CD）', done: false }
            ]
          },
          {
            name: '🏢 インターン/就活準備', items: [
              { text: 'Google STEP/サマーインターン応募', done: false },
              { text: 'SONY R&D インターン応募', done: false },
              { text: '技術面接対策（コーディング+システム設計）', done: false }
            ]
          },
          {
            name: '📖 英語/国際化', items: [
              { text: 'TOEIC 800点以上 or IELTS 6.5+', done: false },
              { text: '英語論文を読んで要約できる', done: false },
              { text: '国際学会/ワークショップ投稿検討', done: false }
            ]
          }
        ]
      },
      {
        id: 'm1', title: 'M1（大学院前期）', desc: '研究成果＋インターン＋論文', status: 'future',
        categories: [
          {
            name: '🔬 研究', items: [
              { text: '修士研究テーマ確定', done: false },
              { text: '国内学会で発表', done: false },
              { text: '国際会議への論文投稿', done: false },
              { text: 'ジャーナル投稿目標設定', done: false }
            ]
          },
          {
            name: '🏢 インターン/就活', items: [
              { text: 'Google/SONY 長期インターン参加', done: false },
              { text: '企業説明会・OB訪問', done: false },
              { text: 'ポートフォリオサイト完成', done: false }
            ]
          },
          {
            name: '💻 技術', items: [
              { text: 'LeetCode Hard 問題にチャレンジ', done: false },
              { text: 'システム設計面接の準備', done: false },
              { text: 'OSS プロジェクトへのコントリビュート', done: false }
            ]
          },
          {
            name: '📖 英語', items: [
              { text: '英語で研究発表できる', done: false },
              { text: '英語論文を自力で書ける', done: false }
            ]
          }
        ]
      },
      {
        id: 'm2', title: 'M2（大学院後期）', desc: '就活本番＋修論完成', status: 'future',
        categories: [
          {
            name: '🏢 就活', items: [
              { text: 'Google 本選考エントリー', done: false },
              { text: 'SONY 本選考エントリー', done: false },
              { text: 'コーディング面接突破', done: false },
              { text: 'システム設計面接突破', done: false },
              { text: '内定獲得', done: false }
            ]
          },
          {
            name: '🔬 研究/修論', items: [
              { text: '修士論文執筆', done: false },
              { text: '修論審査・口頭試問合格', done: false },
              { text: '研究成果を論文として投稿', done: false }
            ]
          },
          {
            name: '🎯 準備', items: [
              { text: '入社前の技術キャッチアップ', done: false },
              { text: '引っ越し・新生活準備', done: false }
            ]
          }
        ]
      }
    ];

    // skillEffects: each action maps to skill keys and their point gain
    const DEFAULT_WEEKLY_ACTIONS = [
      { id: 'w1', label: '🧮 数学復習（線形/微積/統計）', done: false, skillEffects: { coding: 1, ai: 1 } },
      { id: 'w2', label: '💻 AtCoder/LeetCode 問題演習', done: false, skillEffects: { coding: 2 } },
      { id: 'w3', label: '🐍 Python 脱・初心者演習', done: false, skillEffects: { coding: 1 } },
      { id: 'w4', label: '📝 Zenn/Qiita 記事執筆', done: false, skillEffects: { coding: 1, english: 1 } },
      { id: 'w5', label: '💪 筋トレ維持', done: false, skillEffects: {} },
      { id: 'w6', label: '📖 E資格の勉強', done: false, skillEffects: { ai: 2 } }
    ];

    const AI_CHECK_ITEMS = [
      { key: 'selfcode', title: '🚫 今日コードを自力で書いたか？', desc: 'AI にコードを生成させず、自分の頭で考えて実装した' },
      { key: 'english', title: '📖 エラーを英語で自分で読み解いたか？', desc: '公式ドキュメントやStack Overflowを英語で読んだ' },
      { key: 'explain', title: '🧠 概念を自分の言葉で説明できるか？', desc: '今日学んだことを他人に説明できるレベルで理解した' }
    ];

    function getCareerSkills() {
      const skills = loadData('careerSkills', DEFAULT_SKILLS);
      // One-time migrate: reset if values match old defaults (15,30,40,40)
      const oldDefaults = { coding: 15, ai: 30, robotics: 40, english: 40 };
      const isOld = skills.every(s => oldDefaults[s.key] !== undefined && s.current === oldDefaults[s.key]);
      if (isOld) {
        saveData('careerSkills', DEFAULT_SKILLS);
        return DEFAULT_SKILLS;
      }
      return skills;
    }
    function getRoadmap() {
      const data = loadData('careerRoadmap', DEFAULT_ROADMAP);
      // Migrate: if old format (no categories), replace with new defaults
      if (data && data.length > 0 && !data[0].categories) {
        saveData('careerRoadmap', DEFAULT_ROADMAP);
        return DEFAULT_ROADMAP;
      }
      return data;
    }
    function getWeeklyActions() {
      const actions = loadData('weeklyActions', DEFAULT_WEEKLY_ACTIONS);
      // Migrate: add skillEffects from defaults if missing
      const defaultMap = {};
      DEFAULT_WEEKLY_ACTIONS.forEach(d => { defaultMap[d.id] = d.skillEffects || {}; });
      let needsSave = false;
      actions.forEach(a => {
        if (a.skillEffects === undefined) {
          a.skillEffects = defaultMap[a.id] || {};
          needsSave = true;
        }
      });
      if (needsSave) saveData('weeklyActions', actions);
      return actions;
    }
    function getAiChecks() {
      return loadData('aiChecks', {});
    }
    function getDailyLog() {
      return loadData('careerDailyLog', {});
    }

    // ---------- Render ----------

    function renderCareer() {
      renderSkillRadar();
      renderSkillBars();
      renderRoadmap();
      renderCareerCal();
      renderWeeklyActions();
      renderAiChecker();
      updateCareerStats();
    }

    function updateCareerStats() {
      const skills = getCareerSkills();
      const totalCurrent = skills.reduce((a, s) => a + s.current, 0);
      const totalTarget = skills.reduce((a, s) => a + s.target, 0);
      const overall = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
      document.getElementById('career-overall').textContent = overall + '%';

      const roadmap = getRoadmap();
      const currentPhase = roadmap.find(p => p.status === 'current');
      document.getElementById('career-phase-label').textContent = currentPhase ? currentPhase.title.split('（')[0].split(' ')[0] : '—';

      const weekly = getWeeklyActions();
      const weeklyDone = weekly.filter(w => w.done).length;
      const weeklyRate = weekly.length > 0 ? Math.round((weeklyDone / weekly.length) * 100) : 0;
      document.getElementById('career-weekly-rate').textContent = weeklyRate + '%';
    }

    // ---------- Daily Log (saves check state per day) ----------

    function saveDailySnapshot() {
      const today = todayStr();
      const log = getDailyLog();
      const actions = getWeeklyActions();
      const aiChecks = getAiChecks();
      const todayAi = aiChecks[today] || {};

      log[today] = {
        weekly: {},
        ai: {}
      };
      actions.forEach(a => { log[today].weekly[a.id] = a.done; });
      AI_CHECK_ITEMS.forEach(item => { log[today].ai[item.key] = todayAi[item.key] || false; });
      saveData('careerDailyLog', log);
    }

    // ---------- Radar Chart ----------

    function renderSkillRadar() {
      const skills = getCareerSkills();
      const n = skills.length;
      if (n < 3) return;

      const cx = 150, cy = 150, maxR = 110;
      const angleStep = (2 * Math.PI) / n;
      const startAngle = -Math.PI / 2;

      function polarToXY(angle, r) {
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      }

      let gridHtml = '';
      [0.25, 0.5, 0.75, 1.0].forEach(frac => {
        const r = maxR * frac;
        const pts = [];
        for (let i = 0; i < n; i++) {
          const p = polarToXY(startAngle + i * angleStep, r);
          pts.push(`${p.x},${p.y}`);
        }
        gridHtml += `<polygon points="${pts.join(' ')}" fill="none" stroke="var(--border)" stroke-width="1" opacity="0.5"/>`;
      });

      for (let i = 0; i < n; i++) {
        const p = polarToXY(startAngle + i * angleStep, maxR);
        gridHtml += `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="var(--border)" stroke-width="1" opacity="0.3"/>`;
      }

      const targetPts = skills.map((s, i) => {
        const p = polarToXY(startAngle + i * angleStep, (s.target / 100) * maxR);
        return `${p.x},${p.y}`;
      }).join(' ');

      const currentPts = skills.map((s, i) => {
        const p = polarToXY(startAngle + i * angleStep, (s.current / 100) * maxR);
        return `${p.x},${p.y}`;
      }).join(' ');

      let labelsHtml = '';
      skills.forEach((s, i) => {
        const labelR = maxR + 22;
        const p = polarToXY(startAngle + i * angleStep, labelR);
        const anchor = p.x < cx - 5 ? 'end' : p.x > cx + 5 ? 'start' : 'middle';
        labelsHtml += `<text x="${p.x}" y="${p.y}" text-anchor="${anchor}" dominant-baseline="middle" fill="var(--text-secondary)" font-size="11" font-weight="600">${escHtml(s.label.length > 8 ? s.label.slice(0, 8) : s.label)}</text>`;
      });

      const svg = `<svg viewBox="0 0 300 300" width="300" height="300">
                ${gridHtml}
                <polygon points="${targetPts}" fill="rgba(255,215,0,0.08)" stroke="var(--accent-gold)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7"/>
                <polygon points="${currentPts}" fill="rgba(88,166,255,0.15)" stroke="var(--accent-blue)" stroke-width="2"/>
                ${skills.map((s, i) => {
        const p = polarToXY(startAngle + i * angleStep, (s.current / 100) * maxR);
        return `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${s.color}" stroke="#fff" stroke-width="1.5"/>`;
      }).join('')}
                ${labelsHtml}
                <text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="var(--text-muted)" font-size="9">― 目標</text>
                <text x="${cx}" y="${cy + 6}" text-anchor="middle" fill="var(--accent-blue)" font-size="9">━ 現在</text>
            </svg>`;

      document.getElementById('radar-chart').innerHTML = svg;
    }

    // ---------- Skill Bars (read-only, auto-updated) ----------

    function renderSkillBars() {
      const skills = getCareerSkills();
      const container = document.getElementById('skill-bars');

      container.innerHTML = skills.map(s => `
                <div class="skill-bar-item">
                    <div class="skill-bar-header">
                        <span class="skill-bar-label">${escHtml(s.label)}</span>
                        <div class="skill-bar-values">
                            <span style="color:${s.color};font-weight:700;">${s.current}</span>
                            <span>/</span>
                            <span>${s.target}</span>
                        </div>
                    </div>
                    <div class="skill-bar-track">
                        <div class="skill-bar-target" style="width:${s.target}%;"></div>
                        <div class="skill-bar-current" style="width:${s.current}%;background:${s.color};"></div>
                    </div>
                    <div class="skill-bar-auto-label">📈 週次アクション達成で自動更新</div>
                </div>
            `).join('');
    }

    // ---------- Auto Skill Update ----------

    function autoUpdateSkills() {
      const actions = getWeeklyActions();
      const skills = getCareerSkills();
      const aiChecks = getAiChecks();
      const today = todayStr();
      const todayAi = aiChecks[today] || {};
      const aiDone = AI_CHECK_ITEMS.filter(item => todayAi[item.key]).length;

      // Build delta map
      const delta = {};
      skills.forEach(s => { delta[s.key] = 0; });

      actions.forEach(a => {
        const effects = a.skillEffects || {};
        if (a.done) {
          // Achieved: add points
          Object.entries(effects).forEach(([sk, pts]) => {
            if (delta[sk] !== undefined) delta[sk] += pts;
          });
        } else {
          // Not achieved: -1 per affected skill
          Object.keys(effects).forEach(sk => {
            if (delta[sk] !== undefined) delta[sk] -= 1;
          });
        }
      });

      // AI check bonus
      if (aiDone === AI_CHECK_ITEMS.length) {
        if (delta.coding !== undefined) delta.coding += 1;
        if (delta.english !== undefined) delta.english += 1;
      } else if (aiDone === 0) {
        if (delta.coding !== undefined) delta.coding -= 1;
      }

      // Apply delta
      skills.forEach(s => {
        s.current = Math.max(0, Math.min(100, s.current + (delta[s.key] || 0)));
      });
      saveData('careerSkills', skills);

      // Save skill history snapshot
      const history = loadData('careerSkillHistory', {});
      history[today] = {};
      skills.forEach(s => { history[today][s.key] = s.current; });
      saveData('careerSkillHistory', history);

      return delta;
    }

    // ---------- Roadmap ----------

    function renderRoadmap() {
      const roadmap = getRoadmap();
      const container = document.getElementById('roadmap-timeline');

      container.innerHTML = roadmap.map((phase, pi) => {
        const cls = phase.status === 'current' ? 'active-phase' : phase.status === 'completed' ? 'completed-phase' : '';
        const badgeCls = phase.status === 'current' ? 'current' : 'future';
        const badgeText = phase.status === 'current' ? '現在' : phase.status === 'completed' ? '完了' : '';

        // Support both old items[] and new categories[] format
        const categories = phase.categories || [{ name: '', items: phase.items || [] }];

        // Calculate overall phase progress
        let totalItems = 0, doneItems = 0;
        categories.forEach(cat => {
          cat.items.forEach(item => { totalItems++; if (item.done) doneItems++; });
        });
        const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
        const progressColor = phase.status === 'current' ? 'var(--accent-gold)' : 'var(--accent-green)';

        // Status cycle text
        const nextStatus = phase.status === 'future' ? '現在に設定' : phase.status === 'current' ? '完了に設定' : '未来に戻す';

        // Categories with collapsible sections + edit UI
        const categoriesHtml = categories.map((cat, ci) => {
          const catDone = cat.items.filter(it => it.done).length;
          const catTotal = cat.items.length;

          const checklistHtml = cat.items.map((item, ii) => `
                        <li class="${item.done ? 'checked' : ''}">
                            <span class="phase-check-icon" onclick="toggleRoadmapItem(${pi}, ${ci}, ${ii})">✓</span>
                            <span onclick="toggleRoadmapItem(${pi}, ${ci}, ${ii})">${escHtml(item.text)}</span>
                            <span class="rm-item-del" onclick="deleteRoadmapItem(${pi}, ${ci}, ${ii})" title="削除">×</span>
                        </li>
                    `).join('');

          const addItemHtml = `
                        <div class="roadmap-add-item">
                            <input type="text" id="rm-add-${pi}-${ci}" placeholder="タスクを追加…"
                                onkeydown="if(event.key==='Enter')addRoadmapItem(${pi},${ci})">
                            <button onclick="addRoadmapItem(${pi},${ci})">+</button>
                        </div>
                    `;

          if (!cat.name) {
            return `<ul class="phase-checklist">${checklistHtml}</ul>${addItemHtml}`;
          }

          return `
                        <div class="phase-category" id="phase-cat-${pi}-${ci}">
                            <div class="phase-category-header" onclick="togglePhaseCategory(${pi}, ${ci})">
                                <span class="phase-category-arrow">▼</span>
                                ${escHtml(cat.name)}
                                <span class="phase-category-count">${catDone}/${catTotal}</span>
                                <span class="rm-cat-del" onclick="event.stopPropagation();deleteRoadmapCategory(${pi},${ci})" title="カテゴリ削除">×</span>
                            </div>
                            <ul class="phase-checklist">${checklistHtml}</ul>
                            ${addItemHtml}
                        </div>
                    `;
        }).join('');

        return `
                    <div class="roadmap-phase ${cls}">
                        <div class="phase-title">
                            ${escHtml(phase.title)}
                            ${badgeText ? `<span class="phase-badge ${badgeCls}">${badgeText}</span>` : ''}
                        </div>
                        <div class="phase-desc">${escHtml(phase.desc)}</div>
                        <div class="phase-progress">
                            <div class="phase-progress-bar">
                                <div class="phase-progress-fill" style="width:${progressPct}%;background:${progressColor};"></div>
                            </div>
                            <span class="phase-progress-text" style="color:${progressColor};">${progressPct}%</span>
                        </div>
                        ${categoriesHtml}
                        <button class="roadmap-add-cat-btn" onclick="addRoadmapCategory(${pi})">＋ カテゴリ追加</button>
                        <div class="phase-actions">
                            <button class="phase-status-btn" onclick="cyclePhaseStatus(${pi})">${nextStatus}</button>
                            <button class="phase-del-btn" onclick="deletePhase(${pi})">🗑 削除</button>
                        </div>
                    </div>
                `;
      }).join('') + `<button class="roadmap-add-phase-btn" onclick="addPhase()">＋ 新しいフェーズを追加</button>`;
    }

    function togglePhaseCategory(pi, ci) {
      const el = document.getElementById(`phase-cat-${pi}-${ci}`);
      if (el) el.classList.toggle('collapsed');
    }

    function toggleRoadmapItem(phaseIndex, categoryIndex, itemIndex) {
      const roadmap = getRoadmap();
      const phase = roadmap[phaseIndex];
      const categories = phase.categories || [{ name: '', items: phase.items || [] }];
      categories[categoryIndex].items[itemIndex].done = !categories[categoryIndex].items[itemIndex].done;
      if (phase.categories) {
        phase.categories = categories;
      } else {
        phase.items = categories[0].items;
      }
      saveData('careerRoadmap', roadmap);
      renderRoadmap();
      updateCareerStats();
    }

    // ---------- Roadmap Edit Functions ----------

    function addRoadmapItem(pi, ci) {
      const input = document.getElementById(`rm-add-${pi}-${ci}`);
      const text = (input && input.value || '').trim();
      if (!text) return;
      const roadmap = getRoadmap();
      const cats = roadmap[pi].categories || [{ name: '', items: roadmap[pi].items || [] }];
      cats[ci].items.push({ text, done: false });
      if (roadmap[pi].categories) roadmap[pi].categories = cats;
      else roadmap[pi].items = cats[0].items;
      saveData('careerRoadmap', roadmap);
      renderRoadmap();
    }

    function deleteRoadmapItem(pi, ci, ii) {
      const roadmap = getRoadmap();
      const cats = roadmap[pi].categories || [{ name: '', items: roadmap[pi].items || [] }];
      cats[ci].items.splice(ii, 1);
      if (roadmap[pi].categories) roadmap[pi].categories = cats;
      else roadmap[pi].items = cats[0].items;
      saveData('careerRoadmap', roadmap);
      renderRoadmap();
      updateCareerStats();
    }

    function addRoadmapCategory(pi) {
      const name = prompt('カテゴリ名を入力（例: 📚 読書）');
      if (!name || !name.trim()) return;
      const roadmap = getRoadmap();
      if (!roadmap[pi].categories) roadmap[pi].categories = [{ name: '', items: roadmap[pi].items || [] }];
      roadmap[pi].categories.push({ name: name.trim(), items: [] });
      saveData('careerRoadmap', roadmap);
      renderRoadmap();
    }

    function deleteRoadmapCategory(pi, ci) {
      if (!confirm('このカテゴリを削除しますか？')) return;
      const roadmap = getRoadmap();
      roadmap[pi].categories.splice(ci, 1);
      if (roadmap[pi].categories.length === 0) roadmap[pi].categories.push({ name: '📌 未分類', items: [] });
      saveData('careerRoadmap', roadmap);
      renderRoadmap();
      updateCareerStats();
    }

    function cyclePhaseStatus(pi) {
      const roadmap = getRoadmap();
      const s = roadmap[pi].status;
      roadmap[pi].status = s === 'future' ? 'current' : s === 'current' ? 'completed' : 'future';
      saveData('careerRoadmap', roadmap);
      renderRoadmap();
      updateCareerStats();
    }

    function deletePhase(pi) {
      if (!confirm('このフェーズを削除しますか？元に戻せません。')) return;
      const roadmap = getRoadmap();
      roadmap.splice(pi, 1);
      saveData('careerRoadmap', roadmap);
      renderRoadmap();
      updateCareerStats();
    }

    function addPhase() {
      const title = prompt('フェーズ名を入力（例: M1 後期）');
      if (!title || !title.trim()) return;
      const desc = prompt('説明を入力（例: 研究成果まとめ）') || '';
      const roadmap = getRoadmap();
      roadmap.push({
        id: 'custom_' + Date.now(),
        title: title.trim(),
        desc: desc.trim(),
        status: 'future',
        categories: [{ name: '📌 タスク', items: [] }]
      });
      saveData('careerRoadmap', roadmap);
      renderRoadmap();
    }

    // ---------- Career Calendar ----------

    let careerCalYear = new Date().getFullYear();
    let careerCalMonth = new Date().getMonth();

    function careerCalPrev() {
      careerCalMonth--;
      if (careerCalMonth < 0) { careerCalMonth = 11; careerCalYear--; }
      renderCareerCal();
    }
    function careerCalNext() {
      careerCalMonth++;
      if (careerCalMonth > 11) { careerCalMonth = 0; careerCalYear++; }
      renderCareerCal();
    }

    function renderCareerCal() {
      const label = document.getElementById('career-cal-month-label');
      label.textContent = `${careerCalYear}年${careerCalMonth + 1}月`;

      const grid = document.getElementById('career-cal-grid');
      const log = getDailyLog();
      const aiChecks = getAiChecks();
      const today = todayStr();

      const firstDay = new Date(careerCalYear, careerCalMonth, 1).getDay();
      const daysInMonth = new Date(careerCalYear, careerCalMonth + 1, 0).getDate();

      const dows = ['日', '月', '火', '水', '木', '金', '土'];
      let html = dows.map(d => `<div class="cal-dow">${d}</div>`).join('');

      // Empty cells before first day
      for (let i = 0; i < firstDay; i++) {
        html += '<div></div>';
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${careerCalYear}-${String(careerCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayLog = log[ds];
        const dayAi = aiChecks[ds] || {};

        let weeklyRate = 0;
        let weeklyTotal = 0;
        let weeklyDone = 0;

        if (dayLog && dayLog.weekly) {
          const keys = Object.keys(dayLog.weekly);
          weeklyTotal = keys.length;
          weeklyDone = keys.filter(k => dayLog.weekly[k]).length;
          weeklyRate = weeklyTotal > 0 ? weeklyDone / weeklyTotal : 0;
        }

        const aiDone = AI_CHECK_ITEMS.filter(item => dayAi[item.key]).length;
        const aiTotal = AI_CHECK_ITEMS.length;

        // Determine level
        let lv = 'lv0';
        if (dayLog || Object.keys(dayAi).length > 0) {
          const combinedRate = weeklyTotal > 0 ? weeklyRate : 0;
          if (combinedRate >= 1 && aiDone === aiTotal) lv = 'lv4';
          else if (combinedRate >= 1) lv = 'lv3';
          else if (combinedRate >= 0.5) lv = 'lv2';
          else if (combinedRate > 0 || aiDone > 0) lv = 'lv1';
        }

        const isToday = ds === today ? ' today' : '';

        // AI dots
        let dotsHtml = '';
        if (dayLog || Object.keys(dayAi).length > 0) {
          dotsHtml = '<div class="career-cal-dots">';
          for (let ai = 0; ai < aiTotal; ai++) {
            const key = AI_CHECK_ITEMS[ai].key;
            dotsHtml += `<div class="dot ${dayAi[key] ? '' : 'off'}"></div>`;
          }
          dotsHtml += '</div>';
        }

        html += `<div class="career-cal-cell ${lv}${isToday}" title="${ds}: 週次${weeklyDone}/${weeklyTotal} AI${aiDone}/${aiTotal}">
                    <span class="cal-day-num">${d}</span>
                    ${dotsHtml}
                </div>`;
      }

      grid.innerHTML = html;
    }

    // ---------- Weekly Actions ----------

    function renderWeeklyActions() {
      const actions = getWeeklyActions();
      const container = document.getElementById('weekly-actions');
      const done = actions.filter(a => a.done).length;
      document.getElementById('weekly-progress').textContent = `${done}/${actions.length}`;

      if (actions.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div>アクションを追加しましょう</div>';
        return;
      }

      const skillLabels = { coding: 'コーディング', ai: 'AI理論', robotics: 'ロボット制御', english: '技術英語' };

      container.innerHTML = actions.map((a, i) => {
        const effects = a.skillEffects || {};
        const effectStr = Object.entries(effects).map(([k, v]) => `${skillLabels[k] || k}+${v}`).join(', ');
        return `
                <div class="weekly-item ${a.done ? 'checked' : ''}" onclick="toggleWeeklyAction(${i})">
                    <div class="weekly-check">✓</div>
                    <div style="flex:1;">
                        <span class="weekly-label">${escHtml(a.label)}</span>
                        ${effectStr ? `<div style="font-size:0.65rem;color:var(--text-muted);margin-top:2px;">🎯 ${effectStr}</div>` : ''}
                    </div>
                    <button class="weekly-delete" onclick="event.stopPropagation();deleteWeeklyAction(${i})" title="削除">×</button>
                </div>
                `;
      }).join('');
    }

    function toggleWeeklyAction(index) {
      const actions = getWeeklyActions();
      actions[index].done = !actions[index].done;
      saveData('weeklyActions', actions);
      saveDailySnapshot();
      renderWeeklyActions();
      renderCareerCal();
      updateCareerStats();
    }

    function addWeeklyAction() {
      const input = document.getElementById('weekly-new-input');
      const skillSelect = document.getElementById('weekly-skill-select');
      const text = input.value.trim();
      if (!text) return;
      const actions = getWeeklyActions();
      const effects = {};
      if (skillSelect.value) {
        effects[skillSelect.value] = 1;
      }
      actions.push({ id: genId(), label: text, done: false, skillEffects: effects });
      saveData('weeklyActions', actions);
      input.value = '';
      skillSelect.value = '';
      renderWeeklyActions();
      updateCareerStats();
    }

    document.getElementById('weekly-new-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') addWeeklyAction();
    });

    function deleteWeeklyAction(index) {
      const actions = getWeeklyActions();
      actions.splice(index, 1);
      saveData('weeklyActions', actions);
      renderWeeklyActions();
      updateCareerStats();
    }

    function resetWeeklyActions() {
      if (!confirm('今週をリセットしてスキルを自動更新しますか？\n\n✅ 達成 → スキル UP\n❌ 未達成 → スキル DOWN')) return;

      // Save daily snapshot first
      saveDailySnapshot();

      // Auto update skills based on weekly achievement
      const delta = autoUpdateSkills();

      // Build result message
      const skills = getCareerSkills();
      const skillLabels = { coding: 'コーディング', ai: 'AI理論', robotics: 'ロボット制御', english: '技術英語' };
      let msg = 'スキル更新結果:\n';
      Object.entries(delta).forEach(([k, v]) => {
        const s = skills.find(s => s.key === k);
        const sign = v >= 0 ? '+' : '';
        msg += `${skillLabels[k] || k}: ${sign}${v} → 現在 ${s ? s.current : '?'}\n`;
      });

      // Reset weekly checks
      const actions = getWeeklyActions();
      actions.forEach(a => a.done = false);
      saveData('weeklyActions', actions);

      alert(msg);
      renderCareer();
    }

    // ---------- AI Dependency Checker ----------

    function renderAiChecker() {
      const today = todayStr();
      const checks = getAiChecks();
      const todayChecks = checks[today] || {};

      const container = document.getElementById('ai-check-list');
      container.innerHTML = AI_CHECK_ITEMS.map(item => {
        const isChecked = todayChecks[item.key] || false;
        return `
                    <div class="ai-check-item ${isChecked ? 'checked' : ''}" onclick="toggleAiCheck('${item.key}')">
                        <div class="ai-check-icon">✓</div>
                        <div class="ai-check-text">
                            <div class="ai-check-title">${item.title}</div>
                            <div class="ai-check-desc">${escHtml(item.desc)}</div>
                        </div>
                    </div>
                `;
      }).join('');

      renderAiWeeklyStats();
    }

    function toggleAiCheck(key) {
      const today = todayStr();
      const checks = getAiChecks();
      if (!checks[today]) checks[today] = {};
      checks[today][key] = !checks[today][key];
      saveData('aiChecks', checks);
      saveDailySnapshot();
      renderAiChecker();
      renderCareerCal();
    }

    function renderAiWeeklyStats() {
      const checks = getAiChecks();
      const now = new Date();

      let totalChecks = 0;
      let possibleChecks = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayChecks = checks[ds] || {};
        AI_CHECK_ITEMS.forEach(item => {
          possibleChecks++;
          if (dayChecks[item.key]) totalChecks++;
        });
      }

      const rate = possibleChecks > 0 ? Math.round((totalChecks / possibleChecks) * 100) : 0;
      const todayChecks = checks[todayStr()] || {};
      const todayDone = AI_CHECK_ITEMS.filter(item => todayChecks[item.key]).length;

      const statsContainer = document.getElementById('ai-weekly-stats');
      statsContainer.innerHTML = `
                <div class="ai-stat-mini">
                    <div class="stat-value ${todayDone === AI_CHECK_ITEMS.length ? 'green' : 'orange'}">${todayDone}/${AI_CHECK_ITEMS.length}</div>
                    <div class="stat-label">今日の達成</div>
                </div>
                <div class="ai-stat-mini">
                    <div class="stat-value" style="color:var(--accent-gold);">${rate}%</div>
                    <div class="stat-label">週間達成率</div>
                </div>
                <div class="ai-stat-mini">
                    <div class="stat-value cyan">${totalChecks}</div>
                    <div class="stat-label">7日間チェック数</div>
                </div>
            `;
    }

    // Career tab: tab switch init
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab === 'career') {
          renderCareer();
        }
      });
    });

    // Initial render of career
    renderCareer();



    // ===================================================================
    //  GAS SYNC LAYER
    //  ここにGASウェブアプリのURLを貼り付けてください
    // ===================================================================

    const GAS_APP_URL = 'https://script.google.com/macros/s/AKfycbxkPmTXbQhRPp73bggEDEMq1iUem7JbDe8AQuKI-V7rWIcYZ1E_VC1RJFZU-gSnPobJ/exec'; // ← デプロイしたURLに書き換え

    // 元のsaveDataを保存
    const _origSaveData = saveData;

    // GAS APIへのPOSTヘルパー（バックグラウンド）
    async function gasPost(body) {
      if (!GAS_APP_URL || GAS_APP_URL.includes('YOUR_')) return;
      try {
        await fetch(GAS_APP_URL, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'text/plain' } // CORSプリフライトを回避
        });
      } catch (e) { console.warn('GAS POST error:', e); }
    }

    // API送信中フラグ（無限ループ防止）
    let isSyncing = false;

    // saveDataをオーバーライド → LocalStorage保存 + GASへ非同期同期
    saveData = function (key, data) {
      _origSaveData(key, data); // まずLocalStorageに保存（即時）
      if (!isSyncing) {
        syncToGAS(key, data).catch(console.warn); // GASへ非同期
      }
    };

    const CONFIG_KEYS = ['careerSkills', 'careerRoadmap', 'weeklyActions',
      'aiChecks', 'careerDailyLog', 'careerSkillHistory',
      'taskCats', 'studySubjects'];
    const SHEET_MAP = {
      tasks: 'Tasks', studies: 'Study',
      finances: 'Finance', questions: 'Questions'
    };

    async function syncToGAS(key, data) {
      if (!GAS_APP_URL || GAS_APP_URL.includes('YOUR_')) return;

      // Config系（キャリア/カスタム設定）
      if (CONFIG_KEYS.includes(key)) {
        await gasPost({ action: 'setConfig', key, value: data });
        return;
      }
      // Diary（日付キーのオブジェクト）
      if (key === 'diaries') {
        await gasPost({ action: 'saveAllDiaries', sheet: 'Diary', entries: data });
        return;
      }
      // 通常のテーブルデータ（全件置換）
      const sheet = SHEET_MAP[key];
      if (sheet) {
        await gasPost({ action: 'replaceAll', sheet, rows: data });
      }
    }

    // 画像アップロード
    let pendingImageData = null;
    let pendingImageFile = null;

    const diaryImageInput = document.getElementById('diary-image-input');
    if (diaryImageInput) {
      diaryImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        pendingImageFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
          pendingImageData = ev.target.result;
          document.getElementById('diary-preview-img').src = pendingImageData;
          document.getElementById('diary-image-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
      });
    }

    window.diaryRemovingImage = false;
    function removeDiaryImage() {
      pendingImageData = null;
      pendingImageFile = null;
      window.diaryRemovingImage = true; // 既存の画像を削除するフラグ
      const inp = document.getElementById('diary-image-input');
      if (inp) inp.value = '';
      document.getElementById('diary-image-preview').style.display = 'none';
      document.getElementById('diary-preview-img').src = '';
    }

    // 日記保存：画像がある場合はGASにアップロードしてURLを取得してから保存
    const _origSaveDiary = saveDiary;
    saveDiary = async function () {
      if (!pendingImageData || !GAS_APP_URL || GAS_APP_URL.includes('YOUR_')) {
        _origSaveDiary(); // 画像なし or GASnot設定 → 元の処理
        return;
      }
      try {
        const res = await fetch(GAS_APP_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'uploadImage',
            imageData: pendingImageData,
            fileName: 'diary_' + diaryDate + '_' + Date.now() + '.' +
              (pendingImageFile.name.split('.').pop() || 'jpg')
          }),
          headers: { 'Content-Type': 'text/plain' } // CORS制限を回避するためtext/plainにする
        });
        const d = await res.json();
        if (d.ok) {
          // fetch完了後に元データのimageUrlを一時変域に記録する
          let diaries = loadData('diaries', {});
          if (!diaries[diaryDate]) diaries[diaryDate] = {};
          diaries[diaryDate].imageUrl = d.imageUrl;
          _origSaveData('diaries', diaries);
        }
      } catch (e) { console.warn('Image upload error:', e); }

      // 画像アップロード完了（または未指定）後、_origSaveDiary を呼んでテキスト系を保存
      _origSaveDiary();
      // 上書きされた後に、もう一度 localStorage から最新の imageUrl を引っ張ってきて結合する
      let finalDiaries = loadData('diaries', {});
      if (finalDiaries[diaryDate] && pendingImageData) {
        // GASから取得した最新の画像を引っ張ってくる手当て
        // _origSaveDiary では既存の imageUrl は保持されるように直したため、これで画像は残るはず
      }
      removeDiaryImage();
    }

    // ===================================================================
    //  起動時にGASからデータを取得してLocalStorageを更新する
    // ===================================================================
    async function syncFromGAS() {
      if (!GAS_APP_URL || GAS_APP_URL.includes('YOUR_')) return;

      const banner = document.createElement('div');
      banner.id = 'gas-sync-banner';
      banner.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0',
        'background:var(--accent-blue)', 'color:#fff',
        'text-align:center', 'font-size:0.8rem',
        'padding:6px 12px', 'z-index:9999',
        'font-family:var(--font)'
      ].join(';');
      banner.textContent = '☁️ サーバーからデータを同期中...';
      document.body.prepend(banner);

      // JSONP方式でGASからデータ取得（CORSの影響を受けない）
      const cbName = '_gasSyncCb_' + Date.now();
      const timeout = setTimeout(() => {
        cleanup();
        banner.style.background = '#6e4c18';
        banner.textContent = '⚠ GAS同期タイムアウト（ローカルデータで動作中）';
        setTimeout(() => banner.remove(), 2500);
      }, 15000); // 15秒タイムアウト

      function cleanup() {
        clearTimeout(timeout);
        delete window[cbName];
        const s = document.getElementById('gas-jsonp-script');
        if (s) s.remove();
      }

      window[cbName] = function (d) {
        cleanup();
        try {
          if (!d.ok) throw new Error(d.error || 'Fetch failed');

          isSyncing = true; // render時の追加同期を防止

          // 配列データ
          if (d.tasks && Array.isArray(d.tasks)) {
            d.tasks.forEach(t => { t.done = t.done === 'true' || t.done === true; });
            _origSaveData('tasks', d.tasks); tasks = d.tasks;
          }
          if (d.studies && Array.isArray(d.studies)) {
            d.studies.forEach(s => { s.minutes = Number(s.minutes) || 0; });
            _origSaveData('studies', d.studies); studies = d.studies;
          }
          if (d.finances && Array.isArray(d.finances)) {
            d.finances.forEach(f => { f.amount = Number(f.amount) || 0; });
            _origSaveData('finances', d.finances); finances = d.finances;
          }
          if (d.questions && Array.isArray(d.questions)) {
            d.questions.forEach(q => { q.solved = q.solved === 'true' || q.solved === true; });
            _origSaveData('questions', d.questions); questions = d.questions;
          }
          if (d.diary && typeof d.diary === 'object') {
            const cleanDiary = {};
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            Object.keys(d.diary).forEach(k => {
              if (dateRegex.test(k)) cleanDiary[k] = d.diary[k];
            });
            _origSaveData('diaries', cleanDiary);
          }

          // Config系
          const cfg = d.config || {};
          CONFIG_KEYS.forEach(k => {
            if (cfg[k] !== undefined) _origSaveData(k, cfg[k]);
          });

          // 全再描画
          renderTaskCategorySelect();
          renderStudySubjectSelect();
          updateFinanceCategories();
          renderTasks(); renderStudy(); renderFinance();
          renderDiary(); renderQuestions(); renderCareer();
          renderStudyCal(); renderFinanceCal();

          banner.style.background = 'var(--accent-green)';
          banner.textContent = '✓ データを同期しました';
        } catch (e) {
          console.error('syncFromGAS error:', e);
          banner.style.background = '#6e4c18';
          banner.textContent = '⚠ GAS同期エラー: ' + e.message;
        } finally {
          isSyncing = false; // 同期完了（または失敗）したらフラグを下ろす
        }
        setTimeout(() => banner.remove(), 10000); // エラーが読めるように10秒残す
      };

      // scriptタグを挿入してJSONPリクエスト
      const script = document.createElement('script');
      script.id = 'gas-jsonp-script';
      script.src = GAS_APP_URL + '?callback=' + cbName + '&nocache=' + Date.now();
      script.onerror = function (e) {
        console.error('JSONP script load error!', {
          src: script.src,
          event: e
        });
        cleanup();
        banner.style.background = '#6e4c18';
        banner.textContent = '⚠ GAS接続エラー（コンソールを確認してください）';
        setTimeout(() => banner.remove(), 4000);
      };
      document.body.appendChild(script);
    }

    // 起動時GAS同期（新規利用開始のためスキップ）
    // PCでfile://から直接開く場合はCORSでブロックされるため無効
    // サーバー（GitHub Pages等）にホストした場合は下の行を有効化してください
    syncFromGAS();

  