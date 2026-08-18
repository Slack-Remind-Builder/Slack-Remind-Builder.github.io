/* ==========================================================================
   Slack Remind Builder — script.js
   完全クライアントサイド / 外部ライブラリなし
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 0. 共通データ
   * ------------------------------------------------------------------ */

  const WEEKDAY_JA_TO_EN = {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
    fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
  };
  const WEEKDAY_JA_LABEL = {
    mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日'
  };
  const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTH_JA = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  function ordinalSuffix(n) {
    const j = n % 10, k = n % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  // 自然文の「月」「火」...から Slack の英語曜日名 / 日本語表記を引く
  const KANJI_DAY_TO_KEY = { '月': 'mon', '火': 'tue', '水': 'wed', '木': 'thu', '金': 'fri', '土': 'sat', '日': 'sun' };
  const KANJI_DAY_TO_JP_FULL = { '月': '月曜日', '火': '火曜日', '水': '水曜日', '木': '木曜日', '金': '金曜日', '土': '土曜日', '日': '日曜日' };

  const TARGET_DESC = {
    channel: 'このチャンネルの全員にリマインドを送ります。',
    user: '指定したユーザーにリマインドを送ります(※ワークスペースの設定によっては個人宛リマインドが利用できない場合があります)。',
    me: '自分自身だけに届くリマインドです。'
  };

  const TOKEN_DESC = {
    command: 'これから何かをリマインドする、という命令です。',
    target: '誰(どこ)にリマインドを送るかを表します。',
    message: 'リマインドしてほしい内容です。ダブルクォートで囲むと、スペースを含む文章でも正しく認識されます。',
    frequency: 'いつ・どれくらいの頻度で実行するかを表します。',
    time: '実行される時刻です(24時間表記)。'
  };

  // 文法カード(#10)
  const GRAMMAR_CARDS = [
    { syntax: 'every Monday', meaning: '毎週月曜日', example: '/remind me "会議" every Monday at 09:00' },
    { syntax: 'at 09:00', meaning: '午前9時に', example: '/remind me "メール確認" every weekday at 09:00' },
    { syntax: 'in 30 minutes', meaning: '30分後に', example: '/remind me "休憩してください" in 30 minutes' },
    { syntax: 'next Monday', meaning: '次の月曜日', example: '/remind me "会議" next Monday at 09:00' }
  ];

  // 文法辞典(#11)
  const GRAMMAR_DICT = [
    { syntax: 'every day', meaning: '毎日', detail: '毎日同じ時刻にリマインドを繰り返します。例: every day at 08:00' },
    { syntax: 'every weekday', meaning: '平日毎日', detail: '月曜日から金曜日までの平日だけリマインドします。土日はスキップされます。' },
    { syntax: 'every Monday', meaning: '毎週月曜日', detail: '指定した曜日に毎週リマインドします。他の曜日名(Tuesday, Wednesdayなど)にも置き換えられます。' },
    { syntax: 'every Friday', meaning: '毎週金曜日', detail: '金曜日に毎週リマインドします。週次レポートの提出などに便利です。' },
    { syntax: 'every 2 weeks', meaning: '2週間ごと(隔週)', detail: '2週間に1回のペースでリマインドします。隔週ミーティングの準備などに便利です。' },
    { syntax: 'at 09:00', meaning: '午前9時', detail: '24時間表記で時刻を指定します。"9am" のような12時間表記も利用できます。' },
    { syntax: 'in 30 minutes', meaning: '30分後', detail: '現在時刻からの相対時間でリマインドします。1回だけ実行されます。' },
    { syntax: 'in 2 hours', meaning: '2時間後', detail: '相対時間の指定。分・時間の単位で「〇〇後」を表現できます。' },
    { syntax: 'tomorrow', meaning: '明日', detail: '翌日の同じ時刻、または指定した時刻にリマインドします。1回だけ実行されます。' },
    { syntax: 'next Monday', meaning: '次の月曜日', detail: '直近の月曜日に1回だけリマインドします。毎週繰り返したい場合は every Monday を使います。' },
    { syntax: 'next week', meaning: '来週', detail: '来週の同じ曜日にリマインドします。1回だけ実行されます。' }
  ];

  // サンプル(#21)
  const SAMPLES = [
    { label: '毎朝', text: '毎朝9時にメールを確認' },
    { label: '毎週', text: '毎週金曜日の17時に売上報告を確認' },
    { label: '30分後', text: '30分後に休憩する' },
    { label: '次回', text: '次の月曜日の10時に会議' }
  ];

  // 簡単作成モードの「よく使うテンプレート」(#右側パネル)
  // 6種類の繰り返しパターンを一通り体験できるように選定
  const QUICK_TEMPLATES = [
    { label: '毎朝の朝会', icon: '☀️', meta: '毎日', targetType: 'channel', targetChannel: '#general', message: '朝会の準備をする', scheduleType: 'repeat', repeatType: 'day', time: '09:00' },
    { label: '退勤前の日報', icon: '📝', meta: '平日', targetType: 'channel', targetChannel: '#general', message: '日報を提出する', scheduleType: 'repeat', repeatType: 'weekday', time: '17:30' },
    { label: '週次レビュー', icon: '📊', meta: '毎週金', targetType: 'channel', targetChannel: '#team', message: '週次レビューを行う', scheduleType: 'repeat', repeatType: 'week', weekdays: ['fri'], time: '16:00' },
    { label: '隔週の1on1', icon: '🤝', meta: '隔週月', targetType: 'channel', targetChannel: '#1on1', message: '1on1の準備をする', scheduleType: 'repeat', repeatType: 'biweekly', weekdays: ['mon'], time: '10:00' },
    { label: '月初の請求処理', icon: '💰', meta: '毎月1日', targetType: 'me', message: '請求書を処理する', scheduleType: 'repeat', repeatType: 'month', monthDay: 1, time: '10:00' },
    { label: '誕生日のお祝い', icon: '🎂', meta: '毎年8/21', targetType: 'me', message: '誕生日のお祝いメッセージを送る', scheduleType: 'repeat', repeatType: 'year', yearMonth: 8, yearDay: 21, time: '09:00' }
  ];

  /* ------------------------------------------------------------------ *
   * 1. ユーティリティ
   * ------------------------------------------------------------------ */

  function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    if (opts.class) node.className = opts.class;
    if (opts.attrs) Object.entries(opts.attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (opts.text !== undefined) node.textContent = opts.text; // XSS対策: 常に textContent を使用
    if (opts.onClick) node.addEventListener('click', opts.onClick);
    children.forEach(c => node.appendChild(c));
    return node;
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatTime(hour, minute) {
    const h = Math.max(0, Math.min(23, parseInt(hour, 10) || 0));
    const m = Math.max(0, Math.min(59, parseInt(minute, 10) || 0));
    return `${pad2(h)}:${pad2(m)}`;
  }

  function timeToJapanese(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h < 12 ? '午前' : '午後';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${period}${h12}時${m > 0 ? m + '分' : ''}`;
  }

  function durationToJapanese(value) {
    // "30 minutes" -> "30分", "2 hours" -> "2時間"
    const m = value.match(/^(\d+)\s*minutes?$/);
    if (m) return `${m[1]}分`;
    const h = value.match(/^(\d+)\s*hours?$/);
    if (h) return `${h[1]}時間`;
    return value;
  }

  /* ------------------------------------------------------------------ *
   * 2. コマンド生成 (簡単作成モード / #29 指定の関数群)
   * ------------------------------------------------------------------ */

  // parts: [{type:'command'|'target'|'message'|'frequency'|'time', text, desc}]

  function buildTargetPart(state) {
    let text, desc;
    if (state.targetType === 'channel') {
      text = state.targetChannel.trim() || '#';
      desc = TARGET_DESC.channel;
    } else if (state.targetType === 'user') {
      text = state.targetUser.trim() || '@';
      desc = TARGET_DESC.user;
    } else {
      text = 'me';
      desc = TARGET_DESC.me;
    }
    return { type: 'target', text, desc };
  }

  function generateOnceCommand(state) {
    const parts = [{ type: 'command', text: '/remind', desc: TOKEN_DESC.command }];
    parts.push(buildTargetPart(state));
    parts.push({ type: 'message', text: `"${state.message.trim()}"`, desc: TOKEN_DESC.message });

    const time = state.onceTime || '09:00';
    let dateFragment = '';
    if (state.onceDate) {
      const today = new Date();
      const target = new Date(state.onceDate + 'T00:00:00');
      const diffDays = Math.round((target - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
      if (diffDays === 0) dateFragment = 'today';
      else if (diffDays === 1) dateFragment = 'tomorrow';
      else dateFragment = `on ${target.getMonth() + 1}/${target.getDate()}`;
    } else {
      dateFragment = 'today';
    }
    parts.push({ type: 'time', text: `${dateFragment} at ${time}`, desc: '実行される日時です。' });
    return parts;
  }

  function generateRepeatCommand(state) {
    const parts = [{ type: 'command', text: '/remind', desc: TOKEN_DESC.command }];
    parts.push(buildTargetPart(state));
    parts.push({ type: 'message', text: `"${state.message.trim()}"`, desc: TOKEN_DESC.message });

    let freqText = '';
    let freqDesc = '';
    switch (state.repeatType) {
      case 'day':
        freqText = 'every day'; freqDesc = '毎日繰り返します。'; break;
      case 'weekday':
        freqText = 'every weekday'; freqDesc = '月〜金の平日のみ繰り返します。'; break;
      case 'weekend':
        freqText = 'every Saturday, Sunday'; freqDesc = '土曜日と日曜日(休日)に繰り返します。'; break;
      case 'week': {
        const days = state.weekdays.length ? state.weekdays : ['mon'];
        freqText = 'every ' + days.map(d => WEEKDAY_JA_TO_EN[d]).join(', ');
        freqDesc = `毎週 ${days.map(d => WEEKDAY_JA_LABEL[d]).join('・')}曜日 に繰り返します。`;
        break;
      }
      case 'biweekly': {
        const days = state.weekdays.length ? state.weekdays : ['mon'];
        freqText = `every 2 weeks on ${days.map(d => WEEKDAY_JA_TO_EN[d]).join(', ')}`;
        freqDesc = `2週間に1回、${days.map(d => WEEKDAY_JA_LABEL[d]).join('・')}曜日に繰り返します(隔週)。`;
        break;
      }
      case 'month': {
        const day = state.monthDay || 1;
        freqText = `on the ${day}${ordinalSuffix(day)} of every month`;
        freqDesc = `毎月${day}日に繰り返します。`;
        break;
      }
      case 'year': {
        const month = state.yearMonth || 1;
        const day = state.yearDay || 1;
        freqText = `on ${MONTH_EN[month - 1]} ${day} every year`;
        freqDesc = `毎年${MONTH_JA[month - 1]}${day}日に繰り返します。`;
        break;
      }
      default:
        freqText = 'every day'; freqDesc = '毎日繰り返します。';
    }
    parts.push({ type: 'frequency', text: freqText, desc: freqDesc });
    parts.push({ type: 'time', text: `at ${state.repeatTime || '09:00'}`, desc: TOKEN_DESC.time });
    return parts;
  }

  function partsToString(parts) {
    return parts.map(p => p.text).join(' ');
  }

  function validateForm(state) {
    const errors = {};
    if (!state.message || !state.message.trim()) {
      errors.message = '⚠ メッセージを入力してください';
    }
    if (state.targetType === 'user' && !state.targetUser.trim()) {
      errors.target = '⚠ ユーザー名を入力してください(例: @tanaka)';
    }
    if (state.targetType === 'channel' && state.targetChannel.trim().replace(/^#+/, '') === '') {
      errors.target = '⚠ チャンネル名を入力してください(例: #general)';
    }
    if (state.scheduleType === 'once' && !state.onceDate) {
      // 日付未指定は「today」として扱うため必須ではないが、時刻は必須
      if (!state.onceTime) errors.schedule = '⚠ リマインドする時刻を指定してください';
    }
    if (state.scheduleType === 'repeat' && (state.repeatType === 'week' || state.repeatType === 'biweekly') && state.weekdays.length === 0) {
      errors.schedule = '⚠ 曜日を1つ以上選択してください';
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function generateSlackCommand(state) {
    const validation = validateForm(state);
    if (!validation.valid) return { ok: false, errors: validation.errors };
    const parts = state.scheduleType === 'once' ? generateOnceCommand(state) : generateRepeatCommand(state);
    return { ok: true, parts, text: partsToString(parts) };
  }

  /* ------------------------------------------------------------------ *
   * 3. コマンドカードの描画 (3モード共通 / #19, #20, #28)
   * ------------------------------------------------------------------ */

  function renderCommandCard(container, parts, options = {}) {
    container.innerHTML = '';
    const tpl = document.getElementById('tpl-command-card');
    const node = tpl.content.cloneNode(true);
    const commandText = node.querySelector('.command-text');
    commandText.textContent = partsToString(parts); // textContent のみ使用(XSS対策)

    const copyBtn = node.querySelector('.btn-copy');
    copyBtn.addEventListener('click', () => copyCommand(partsToString(parts), copyBtn));

    const explainBtn = node.querySelector('.btn-explain');
    const explainBlock = node.querySelector('.explain-block');
    if (options.hideExplainToggle) {
      explainBtn.remove();
      explainBlock.remove();
    } else {
      explainBtn.addEventListener('click', () => {
        const isHidden = explainBlock.classList.contains('is-hidden');
        if (isHidden) {
          explainCommand(parts, explainBlock);
          explainBlock.classList.remove('is-hidden');
          explainBtn.textContent = 'コマンドの分解を閉じる';
        } else {
          explainBlock.classList.add('is-hidden');
          explainBtn.textContent = 'コマンドを分解して見る';
        }
      });
    }

    container.appendChild(node);
  }

  function explainCommand(parts, container) {
    container.innerHTML = '';
    parts.forEach(part => {
      const step = el('div', { class: 'explain-step' }, [
        el('span', { class: 'explain-chip', attrs: { 'data-token': part.type }, text: part.text }),
        el('span', { class: 'explain-text', text: part.desc })
      ]);
      container.appendChild(step);
    });
  }

  /* ------------------------------------------------------------------ *
   * 4. コピー機能 (#7)
   * ------------------------------------------------------------------ */

  function copyCommand(text, btnEl) {
    const done = () => {
      showToast('✓ コピーしました');
      if (btnEl) {
        const original = btnEl.textContent;
        btnEl.textContent = '✓ コピー済み';
        setTimeout(() => { btnEl.textContent = original; }, 1500);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { showToast('コピーに失敗しました'); }
    document.body.removeChild(ta);
  }

  /* ------------------------------------------------------------------ *
   * 5. 履歴管理 (#26, localStorage)
   * ------------------------------------------------------------------ */

  const LS_KEYS = {
    darkMode: 'srb_dark_mode',
    mode: 'srb_current_mode',
    form: 'srb_form_state'
  };

  // 過去バージョンで保存された「最近作ったコマンド」履歴が残っていれば削除する(個人情報保護のため)
  function purgeLegacyHistory() {
    try { localStorage.removeItem('srb_history'); } catch (e) { /* noop */ }
  }

  /* ------------------------------------------------------------------ *
   * 6. 簡単作成モード: フォーム状態管理
   * ------------------------------------------------------------------ */

  const buildState = {
    targetType: 'channel',
    targetChannel: '#',
    targetUser: '',
    message: '',
    scheduleType: 'once',
    onceDate: '',
    onceTime: '09:00',
    repeatType: 'day',
    weekdays: [],
    monthDay: 1,
    yearMonth: 1,
    yearDay: 1,
    repeatTime: '09:00'
  };

  const JP_WEEKDAY_BY_INDEX = ['日', '月', '火', '水', '木', '金', '土'];
  let onceDatePickerCtrl = null;
  let yearDatePickerCtrl = null;

  /* ------------------------------------------------------------------ *
   * カスタム日付ピッカー(ネイティブ <input type="date"> は環境によって
   * 曜日表示が壊れる/不安定なため、自前のカレンダーポップオーバーを使う)
   * mode: 'full'      -> 年月日をすべて扱う(1回のみの日付用、曜日を表示)
   *       'monthday'  -> 月日のみを扱う(毎年の繰り返し用、年・曜日は無視)
   * ------------------------------------------------------------------ */
  function createCalendarPicker({ triggerBtn, triggerTextEl, popoverEl, mode, onSelect }) {
    const today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth() + 1; // 1-12
    let selected = null; // { year, month, day } もしくは monthday モードでは { month, day }

    function daysInMonth(year, month) {
      return new Date(year, month, 0).getDate();
    }

    function render() {
      popoverEl.innerHTML = '';

      const header = el('div', { class: 'cal-header' });
      const prevBtn = el('button', { class: 'cal-nav', attrs: { type: 'button', 'aria-label': '前の月' }, text: '‹' });
      const label = el('span', { class: 'cal-label', text: `${viewYear}年${viewMonth}月` });
      const nextBtn = el('button', { class: 'cal-nav', attrs: { type: 'button', 'aria-label': '次の月' }, text: '›' });
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewMonth -= 1;
        if (viewMonth < 1) { viewMonth = 12; viewYear -= 1; }
        render();
      });
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewMonth += 1;
        if (viewMonth > 12) { viewMonth = 1; viewYear += 1; }
        render();
      });
      header.appendChild(prevBtn);
      header.appendChild(label);
      header.appendChild(nextBtn);
      popoverEl.appendChild(header);

      const grid = el('div', { class: 'cal-grid' });
      JP_WEEKDAY_BY_INDEX.forEach(w => grid.appendChild(el('div', { class: 'cal-weekday', text: w })));

      const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=日
      const total = daysInMonth(viewYear, viewMonth);

      for (let i = 0; i < firstWeekday; i++) {
        grid.appendChild(el('span', { class: 'cal-day is-empty', text: '' }));
      }
      for (let d = 1; d <= total; d++) {
        const isToday = mode === 'full' && viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1 && d === today.getDate();
        const isSelected = mode === 'full'
          ? (selected && selected.year === viewYear && selected.month === viewMonth && selected.day === d)
          : (selected && selected.month === viewMonth && selected.day === d);
        const classes = ['cal-day'];
        if (isToday) classes.push('is-today');
        if (isSelected) classes.push('is-selected');
        const dayBtn = el('button', { class: classes.join(' '), attrs: { type: 'button' }, text: String(d) });
        dayBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          selected = mode === 'full' ? { year: viewYear, month: viewMonth, day: d } : { month: viewMonth, day: d };
          onSelect(selected);
          closePopover();
        });
        grid.appendChild(dayBtn);
      }
      popoverEl.appendChild(grid);
    }

    function openPopover() {
      document.querySelectorAll('.date-picker-popover').forEach(p => { if (p !== popoverEl) p.classList.add('is-hidden'); });
      render();
      popoverEl.classList.remove('is-hidden');
    }
    function closePopover() {
      popoverEl.classList.add('is-hidden');
    }
    function togglePopover(e) {
      e.stopPropagation();
      if (triggerBtn.disabled) return;
      if (popoverEl.classList.contains('is-hidden')) openPopover(); else closePopover();
    }

    triggerBtn.addEventListener('click', togglePopover);
    document.addEventListener('click', (e) => {
      if (!popoverEl.contains(e.target) && e.target !== triggerBtn && !triggerBtn.contains(e.target)) closePopover();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePopover();
    });

    return {
      setSelected(value) {
        selected = value;
        if (value) { viewYear = value.year || viewYear; viewMonth = value.month; }
      },
      setViewToToday() {
        viewYear = today.getFullYear();
        viewMonth = today.getMonth() + 1;
      },
      close: closePopover
    };
  }

  function enforcePrefix(inputEl, prefix) {
    const value = inputEl.value;
    const pos = inputEl.selectionStart === null ? value.length : inputEl.selectionStart;
    const stripped = value.replace(new RegExp('^\\' + prefix + '+'), '');
    const newVal = prefix + stripped;
    if (newVal !== value) {
      const diff = newVal.length - value.length;
      inputEl.value = newVal;
      let newPos = Math.max(prefix.length, pos + diff);
      try { inputEl.setSelectionRange(newPos, newPos); } catch (e) { /* noop */ }
    }
    return inputEl.value;
  }

  function initBuildMode() {
    const targetTypeBtns = document.querySelectorAll('#targetType .seg-btn');
    const targetChannelInput = document.getElementById('targetChannel');
    const targetUserInput = document.getElementById('targetUser');
    const targetHint = document.getElementById('targetHint');
    const messageInput = document.getElementById('messageInput');
    const scheduleBtns = document.querySelectorAll('#scheduleType .seg-btn');
    const onceBlock = document.getElementById('onceBlock');
    const repeatBlock = document.getElementById('repeatBlock');
    const repeatTypeSelect = document.getElementById('repeatType');
    const weekdayPicker = document.getElementById('weekdayPicker');
    const weekdayPickerLabel = document.getElementById('weekdayPickerLabel');
    const monthDayPicker = document.getElementById('monthDayPicker');
    const monthDaySelect = document.getElementById('monthDaySelect');
    const yearDatePicker = document.getElementById('yearDatePicker');
    const yearDateTrigger = document.getElementById('yearDateTrigger');
    const yearDateTriggerText = document.getElementById('yearDateTriggerText');
    const yearDatePopover = document.getElementById('yearDatePopover');
    const dayChips = document.querySelectorAll('.day-chip');
    const onceDateTrigger = document.getElementById('onceDateTrigger');
    const onceDateTriggerText = document.getElementById('onceDateTriggerText');
    const onceDatePopover = document.getElementById('onceDatePopover');
    const onceTime = document.getElementById('onceTime');
    const repeatTime = document.getElementById('repeatTime');
    const messageError = document.getElementById('messageError');

    // 「毎月」用の日付セレクトの選択肢を組み立てる(毎年はカレンダーピッカーを使う)
    function populateNumberOptions(selectEl, count, suffix) {
      selectEl.innerHTML = '';
      for (let i = 1; i <= count; i++) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = `${i}${suffix}`;
        selectEl.appendChild(opt);
      }
    }
    populateNumberOptions(monthDaySelect, 31, '日');

    // 「1回のみ」の日付ピッカー(年月日+曜日を表示)
    onceDatePickerCtrl = createCalendarPicker({
      triggerBtn: onceDateTrigger,
      triggerTextEl: onceDateTriggerText,
      popoverEl: onceDatePopover,
      mode: 'full',
      onSelect: (value) => {
        buildState.onceDate = `${value.year}-${pad2(value.month)}-${pad2(value.day)}`;
        const weekday = JP_WEEKDAY_BY_INDEX[new Date(value.year, value.month - 1, value.day).getDay()];
        onceDateTriggerText.textContent = `${value.year}年${value.month}月${value.day}日(${weekday})`;
        onceDateTriggerText.classList.remove('is-placeholder');
        renderBuild();
      }
    });

    // 「毎年」の月日ピッカー(年・曜日は無視して月日だけ扱う)
    yearDatePickerCtrl = createCalendarPicker({
      triggerBtn: yearDateTrigger,
      triggerTextEl: yearDateTriggerText,
      popoverEl: yearDatePopover,
      mode: 'monthday',
      onSelect: (value) => {
        buildState.yearMonth = value.month;
        buildState.yearDay = value.day;
        yearDateTriggerText.textContent = `${value.month}月${value.day}日`;
        renderBuild();
      }
    });
    yearDatePickerCtrl.setSelected({ month: buildState.yearMonth || 1, day: buildState.yearDay || 1 });

    targetTypeBtns.forEach(btn => btn.addEventListener('click', () => {
      targetTypeBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      buildState.targetType = btn.dataset.target;
      targetChannelInput.classList.toggle('is-hidden', buildState.targetType !== 'channel');
      targetUserInput.classList.toggle('is-hidden', buildState.targetType !== 'user');
      if (buildState.targetType === 'channel' && !targetChannelInput.value) {
        targetChannelInput.value = '#';
      }
      if (buildState.targetType === 'user' && !targetUserInput.value) {
        targetUserInput.value = '@';
      }
      buildState.targetChannel = targetChannelInput.value;
      buildState.targetUser = targetUserInput.value;
      targetHint.textContent = buildState.targetType === 'channel'
        ? 'チャンネルの全員に向けてリマインドを送ります。「#」は自動的に付きます。'
        : buildState.targetType === 'user'
          ? '「@」は自動的に付きます。続けてユーザー名を入力してください。'
          : '自分自身だけに届くリマインドです。';
      renderBuild();
    }));

    targetChannelInput.addEventListener('input', () => {
      buildState.targetChannel = enforcePrefix(targetChannelInput, '#');
      renderBuild();
    });
    targetUserInput.addEventListener('input', () => {
      buildState.targetUser = enforcePrefix(targetUserInput, '@');
      renderBuild();
    });
    messageInput.addEventListener('input', () => { buildState.message = messageInput.value; renderBuild(); });

    function updateScheduleAvailability() {
      const isOnce = buildState.scheduleType === 'once';
      onceDateTrigger.disabled = !isOnce;
      onceTime.disabled = !isOnce;
      repeatTypeSelect.disabled = isOnce;
      repeatTime.disabled = isOnce;
      const type = buildState.repeatType;
      const isWeekLike = !isOnce && (type === 'week' || type === 'biweekly');
      const isMonth = !isOnce && type === 'month';
      const isYear = !isOnce && type === 'year';
      dayChips.forEach(c => { c.disabled = !isWeekLike; });
      monthDaySelect.disabled = !isMonth;
      yearDateTrigger.disabled = !isYear;
      if (!isOnce) onceDatePickerCtrl.close();
      if (isOnce || !isYear) yearDatePickerCtrl.close();
    }

    function updateRepeatSubFieldsVisibility() {
      const type = buildState.repeatType;
      const isWeekLike = type === 'week' || type === 'biweekly';
      weekdayPicker.classList.toggle('is-hidden', !isWeekLike);
      weekdayPickerLabel.textContent = type === 'biweekly'
        ? '曜日を選択(隔週で繰り返す曜日)'
        : '曜日を選択(複数可)';
      monthDayPicker.classList.toggle('is-hidden', type !== 'month');
      yearDatePicker.classList.toggle('is-hidden', type !== 'year');
    }

    scheduleBtns.forEach(btn => btn.addEventListener('click', () => {
      scheduleBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      buildState.scheduleType = btn.dataset.schedule;
      onceBlock.classList.toggle('is-hidden', buildState.scheduleType !== 'once');
      repeatBlock.classList.toggle('is-hidden', buildState.scheduleType !== 'repeat');
      updateScheduleAvailability();
      renderBuild();
    }));

    repeatTypeSelect.addEventListener('change', () => {
      buildState.repeatType = repeatTypeSelect.value;
      updateRepeatSubFieldsVisibility();
      updateScheduleAvailability();
      renderBuild();
    });

    monthDaySelect.addEventListener('change', () => {
      buildState.monthDay = parseInt(monthDaySelect.value, 10);
      renderBuild();
    });

    dayChips.forEach(chip => chip.addEventListener('click', () => {
      if (chip.disabled) return;
      const day = chip.dataset.day;
      chip.classList.toggle('is-active');
      if (buildState.weekdays.includes(day)) {
        buildState.weekdays = buildState.weekdays.filter(d => d !== day);
      } else {
        buildState.weekdays.push(day);
      }
      renderBuild();
    }));

    onceTime.addEventListener('input', () => { buildState.onceTime = onceTime.value; renderBuild(); });
    repeatTime.addEventListener('input', () => { buildState.repeatTime = repeatTime.value; renderBuild(); });

    document.getElementById('resetFormBtn').addEventListener('click', resetForm);

    const liveExplainBlock = document.getElementById('liveExplainBlock');

    function renderBuild() {
      messageError.textContent = '';
      const result = generateSlackCommand(buildState);
      const output = document.getElementById('buildOutput');
      if (!result.ok) {
        const firstError = Object.values(result.errors)[0];
        messageError.textContent = firstError || '';
        output.innerHTML = '';
        output.appendChild(el('div', { class: 'card' }, [
          el('p', { class: 'field-error', text: firstError })
        ]));
        liveExplainBlock.innerHTML = '';
        liveExplainBlock.appendChild(el('p', { class: 'empty-note', text: '宛先・メッセージ・時刻を入力すると、ここに解説が表示されます。' }));
        return;
      }
      renderCommandCard(output, result.parts, { hideExplainToggle: true });
      explainCommand(result.parts, liveExplainBlock);
      persistFormState();
    }

    // 復元されたフォーム状態があれば、日付ピッカーの表示にも反映する
    if (buildState.onceDate) {
      const [y, m, d] = buildState.onceDate.split('-').map(Number);
      const parsed = new Date(y, (m || 1) - 1, d || 1);
      if (!isNaN(parsed.getTime())) {
        const weekday = JP_WEEKDAY_BY_INDEX[parsed.getDay()];
        onceDateTriggerText.textContent = `${y}年${m}月${d}日(${weekday})`;
        onceDateTriggerText.classList.remove('is-placeholder');
        onceDatePickerCtrl.setSelected({ year: y, month: m, day: d });
      }
    }
    monthDaySelect.value = String(buildState.monthDay || 1);
    yearDateTriggerText.textContent = `${buildState.yearMonth || 1}月${buildState.yearDay || 1}日`;

    // --- よく使うテンプレート ---
    function applyTemplate(tpl) {
      // 宛先
      buildState.targetType = tpl.targetType;
      targetTypeBtns.forEach(b => b.classList.toggle('is-active', b.dataset.target === tpl.targetType));
      targetChannelInput.classList.toggle('is-hidden', tpl.targetType !== 'channel');
      targetUserInput.classList.toggle('is-hidden', tpl.targetType !== 'user');
      if (tpl.targetType === 'channel') {
        targetChannelInput.value = tpl.targetChannel || '#';
        buildState.targetChannel = targetChannelInput.value;
      } else if (tpl.targetType === 'user') {
        targetUserInput.value = tpl.targetUser || '@';
        buildState.targetUser = targetUserInput.value;
      }
      targetHint.textContent = tpl.targetType === 'channel'
        ? 'チャンネルの全員に向けてリマインドを送ります。「#」は自動的に付きます。'
        : tpl.targetType === 'user'
          ? 'ユーザー名を「@」から入力してください。'
          : '自分自身だけに届くリマインドです。';

      // メッセージ
      messageInput.value = tpl.message;
      buildState.message = tpl.message;

      // 実行タイミング
      buildState.scheduleType = tpl.scheduleType;
      scheduleBtns.forEach(b => b.classList.toggle('is-active', b.dataset.schedule === tpl.scheduleType));
      onceBlock.classList.toggle('is-hidden', tpl.scheduleType !== 'once');
      repeatBlock.classList.toggle('is-hidden', tpl.scheduleType !== 'repeat');

      if (tpl.scheduleType === 'repeat') {
        buildState.repeatType = tpl.repeatType;
        repeatTypeSelect.value = tpl.repeatType;

        buildState.weekdays = tpl.weekdays ? [...tpl.weekdays] : [];
        dayChips.forEach(chip => chip.classList.toggle('is-active', buildState.weekdays.includes(chip.dataset.day)));

        if (tpl.monthDay) {
          buildState.monthDay = tpl.monthDay;
          monthDaySelect.value = String(tpl.monthDay);
        }
        if (tpl.yearMonth && tpl.yearDay) {
          buildState.yearMonth = tpl.yearMonth;
          buildState.yearDay = tpl.yearDay;
          yearDateTriggerText.textContent = `${tpl.yearMonth}月${tpl.yearDay}日`;
          yearDatePickerCtrl.setSelected({ month: tpl.yearMonth, day: tpl.yearDay });
        }

        buildState.repeatTime = tpl.time;
        repeatTime.value = tpl.time;
        updateRepeatSubFieldsVisibility();
      } else {
        buildState.onceTime = tpl.time;
        onceTime.value = tpl.time;
      }

      updateScheduleAvailability();
      renderBuild();
      showToast(`「${tpl.label}」を反映しました`);
    }

    const templateListEl = document.getElementById('templateList');
    QUICK_TEMPLATES.forEach(tpl => {
      const item = el('button', { class: 'template-item', attrs: { type: 'button' } }, [
        el('span', { class: 'template-item-icon', text: tpl.icon }),
        el('span', { class: 'template-item-label', text: tpl.label }),
        el('span', { class: 'template-item-meta', text: tpl.meta })
      ]);
      item.addEventListener('click', () => applyTemplate(tpl));
      templateListEl.appendChild(item);
    });

    updateRepeatSubFieldsVisibility();
    updateScheduleAvailability();
    renderBuild();
  }

  function resetForm() {
    buildState.targetType = 'channel';
    buildState.targetChannel = '#';
    buildState.targetUser = '';
    buildState.message = '';
    buildState.scheduleType = 'once';
    buildState.onceDate = '';
    buildState.onceTime = '09:00';
    buildState.repeatType = 'day';
    buildState.weekdays = [];
    buildState.monthDay = 1;
    buildState.yearMonth = 1;
    buildState.yearDay = 1;
    buildState.repeatTime = '09:00';
    try { localStorage.removeItem(LS_KEYS.form); } catch (e) { /* noop */ }
    document.getElementById('targetChannel').value = '#';
    document.getElementById('targetUser').value = '';
    document.getElementById('messageInput').value = '';
    document.getElementById('onceTime').value = '09:00';
    document.getElementById('repeatTime').value = '09:00';
    document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('is-active'));
    document.querySelectorAll('#targetType .seg-btn').forEach((b, i) => b.classList.toggle('is-active', i === 0));
    document.querySelectorAll('#scheduleType .seg-btn').forEach((b, i) => b.classList.toggle('is-active', i === 0));
    document.getElementById('repeatType').value = 'day';
    const monthDaySelectEl = document.getElementById('monthDaySelect');
    if (monthDaySelectEl) monthDaySelectEl.value = '1';

    const onceTriggerText = document.getElementById('onceDateTriggerText');
    if (onceTriggerText) {
      onceTriggerText.textContent = '日付を選択';
      onceTriggerText.classList.add('is-placeholder');
    }
    if (onceDatePickerCtrl) { onceDatePickerCtrl.setSelected(null); onceDatePickerCtrl.setViewToToday(); onceDatePickerCtrl.close(); }

    const yearTriggerText = document.getElementById('yearDateTriggerText');
    if (yearTriggerText) yearTriggerText.textContent = '1月1日';
    if (yearDatePickerCtrl) { yearDatePickerCtrl.setSelected({ month: 1, day: 1 }); yearDatePickerCtrl.close(); }

    document.getElementById('targetChannel').classList.remove('is-hidden');
    document.getElementById('targetUser').classList.add('is-hidden');
    document.getElementById('onceBlock').classList.remove('is-hidden');
    document.getElementById('repeatBlock').classList.add('is-hidden');
    document.getElementById('weekdayPicker').classList.add('is-hidden');
    document.getElementById('monthDayPicker').classList.add('is-hidden');
    document.getElementById('yearDatePicker').classList.add('is-hidden');
    document.getElementById('targetHint').textContent = 'チャンネルの全員に向けてリマインドを送ります。「#」は自動的に付きます。';
    const onceDateTriggerEl = document.getElementById('onceDateTrigger');
    if (onceDateTriggerEl) onceDateTriggerEl.disabled = false;
    document.getElementById('onceTime').disabled = false;
    document.getElementById('repeatType').disabled = true;
    document.getElementById('repeatTime').disabled = true;
    document.querySelectorAll('.day-chip').forEach(c => { c.disabled = true; });
    if (monthDaySelectEl) monthDaySelectEl.disabled = true;
    const yearDateTriggerEl = document.getElementById('yearDateTrigger');
    if (yearDateTriggerEl) yearDateTriggerEl.disabled = true;
    showToast('フォームをリセットしました');
    document.getElementById('messageInput').dispatchEvent(new Event('input'));
  }

  function persistFormState() {
    try { localStorage.setItem(LS_KEYS.form, JSON.stringify(buildState)); } catch (e) { /* noop */ }
  }

  function loadFormState() {
    try {
      const raw = localStorage.getItem(LS_KEYS.form);
      if (!raw) return;
      const saved = JSON.parse(raw);
      Object.assign(buildState, saved);
    } catch (e) { /* noop */ }
  }

  /* ------------------------------------------------------------------ *
   * 7. サンプル機能 (#21) — 簡単作成/自然文の両方から利用
   * ------------------------------------------------------------------ */

  function renderSampleList(containerId, onPick) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    SAMPLES.forEach(sample => {
      const item = el('button', { class: 'sample-item', attrs: { type: 'button' } });
      item.appendChild(el('span', { class: 'sample-label', text: sample.label }));
      item.appendChild(document.createTextNode(sample.text));
      item.addEventListener('click', () => onPick(sample.text));
      container.appendChild(item);
    });
  }

  /* ------------------------------------------------------------------ *
   * 8. 学習モード:「コマンドを学ぶ」
   * ------------------------------------------------------------------ */

  const DECOMPOSE_EXAMPLE = [
    { type: 'command', text: '/remind', desc: TOKEN_DESC.command },
    { type: 'target', text: '#general', desc: TOKEN_DESC.target },
    { type: 'message', text: '"会議資料を確認"', desc: TOKEN_DESC.message },
    { type: 'frequency', text: 'every Monday', desc: '毎週月曜日に繰り返す、という意味です。' },
    { type: 'time', text: 'at 09:00', desc: TOKEN_DESC.time }
  ];

  const DECOMPOSE_LABEL = {
    command: 'コマンド', target: '宛先', message: 'リマインド内容', frequency: '繰り返し', time: '実行時刻'
  };

  function initLearnMode() {
    // --- コマンド分解 ---
    const row = document.getElementById('decomposeRow');
    const detail = document.getElementById('decomposeDetail');

    row.innerHTML = '';

    DECOMPOSE_EXAMPLE.forEach((part, i) => {
      const chip = el('button', {
        class: 'decompose-chip',
        attrs: { type: 'button', 'data-token': part.type },
        text: part.text
      });
      chip.addEventListener('click', () => {
        row.querySelectorAll('.decompose-chip').forEach(c => c.classList.remove('is-selected'));
        chip.classList.add('is-selected');
        detail.innerHTML = '';
        detail.appendChild(el('strong', { text: `${part.text} → ${DECOMPOSE_LABEL[part.type]}` }));
        detail.appendChild(el('span', { text: part.desc }));
      });
      row.appendChild(chip);
    });

    // --- 文法カード ---
    const cardsContainer = document.getElementById('grammarCards');
    cardsContainer.innerHTML = '';
    GRAMMAR_CARDS.forEach(card => {
      cardsContainer.appendChild(el('div', { class: 'grammar-card' }, [
        el('div', { class: 'grammar-syntax', text: card.syntax }),
        el('div', { class: 'grammar-meaning', text: card.meaning }),
        el('code', { class: 'grammar-example', text: card.example })
      ]));
    });

    // --- 文法辞典 ---
    const dictTable = document.getElementById('dictTable');
    const dictDetail = document.getElementById('dictDetail');
    dictTable.innerHTML = '';
    GRAMMAR_DICT.forEach(entry => {
      const rowBtn = el('button', { class: 'dict-row', attrs: { type: 'button' } }, [
        el('span', { class: 'dict-syntax', text: entry.syntax }),
        el('span', { class: 'dict-meaning', text: entry.meaning })
      ]);
      rowBtn.addEventListener('click', () => {
        dictDetail.textContent = entry.detail;
        dictDetail.classList.add('is-visible');
      });
      dictTable.appendChild(rowBtn);
    });

    // --- 文法組み立てインタラクティブ ---
    const buildEvery = document.getElementById('buildEvery');
    const buildDay = document.getElementById('buildDay');
    const buildDayWrap = document.getElementById('buildDayWrap');
    const buildTime = document.getElementById('buildTime');
    const buildTimeWrap = document.getElementById('buildTimeWrap');
    const phraseOutput = document.getElementById('builderPhrase');
    const meaningOutput = document.getElementById('builderMeaning');

    // キーワードごとに、2つ目のセレクトに表示する選択肢を変える。
    // これにより「every」なのに duration が選べてしまう、
    // 「in」なのに曜日が選べてしまう、といった不整合を防ぐ。
    const DAY_OPTIONS_BY_KEYWORD = {
      every: [
        { value: 'day', label: 'day(毎日)' },
        { value: 'weekday', label: 'weekday(平日)' },
        { value: 'Monday', label: 'Monday(月曜日)' },
        { value: 'Tuesday', label: 'Tuesday(火曜日)' },
        { value: 'Wednesday', label: 'Wednesday(水曜日)' },
        { value: 'Thursday', label: 'Thursday(木曜日)' },
        { value: 'Friday', label: 'Friday(金曜日)' },
        { value: 'Saturday', label: 'Saturday(土曜日)' },
        { value: 'Sunday', label: 'Sunday(日曜日)' }
      ],
      next: [
        { value: 'Monday', label: 'Monday(月曜日)' },
        { value: 'Tuesday', label: 'Tuesday(火曜日)' },
        { value: 'Wednesday', label: 'Wednesday(水曜日)' },
        { value: 'Thursday', label: 'Thursday(木曜日)' },
        { value: 'Friday', label: 'Friday(金曜日)' },
        { value: 'Saturday', label: 'Saturday(土曜日)' },
        { value: 'Sunday', label: 'Sunday(日曜日)' }
      ],
      in: [
        { value: '15 minutes', label: '15 minutes(15分後)' },
        { value: '30 minutes', label: '30 minutes(30分後)' },
        { value: '1 hour', label: '1 hour(1時間後)' },
        { value: '2 hours', label: '2 hours(2時間後)' }
      ],
      at: [] // at は時刻だけで完結するため2つ目のセレクトは使わない
    };

    function populateDayOptions(keyword) {
      const options = DAY_OPTIONS_BY_KEYWORD[keyword] || [];
      buildDay.innerHTML = '';
      options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.label;
        buildDay.appendChild(optionEl);
      });
      buildDayWrap.classList.toggle('is-hidden', options.length === 0);
    }

    function updateBuilderPhrase() {
      const kw = buildEvery.value;
      const dayVal = buildDay.value;
      const time = buildTime.value;
      let phrase = '';
      let meaning = '';

      // 「in」のときは時刻(at HH:MM)を使わないので非表示にする
      buildTimeWrap.classList.toggle('is-hidden', kw === 'in');

      if (kw === 'in') {
        const value = dayVal || '30 minutes';
        phrase = `in ${value}`;
        meaning = `${durationToJapanese(value)}後に実行`;
      } else if (kw === 'at') {
        phrase = `at ${time}`;
        meaning = `${timeToJapanese(time)}に実行`;
      } else if (kw === 'next') {
        const dayLabel = dayVal || 'Monday';
        phrase = `next ${dayLabel} at ${time}`;
        meaning = `次の${dayEnToJaFull(dayLabel)}の${timeToJapanese(time)}に実行`;
      } else {
        // every
        if (dayVal === 'day') {
          phrase = `every day at ${time}`;
          meaning = `毎日${timeToJapanese(time)}に実行`;
        } else if (dayVal === 'weekday') {
          phrase = `every weekday at ${time}`;
          meaning = `平日毎日${timeToJapanese(time)}に実行`;
        } else {
          const dayLabel = dayVal || 'Monday';
          phrase = `every ${dayLabel} at ${time}`;
          meaning = `毎週${dayEnToJaFull(dayLabel)}の${timeToJapanese(time)}に実行`;
        }
      }
      phraseOutput.textContent = phrase;
      meaningOutput.textContent = meaning;
    }

    buildEvery.addEventListener('change', () => {
      populateDayOptions(buildEvery.value);
      updateBuilderPhrase();
    });
    buildDay.addEventListener('change', updateBuilderPhrase);
    buildTime.addEventListener('change', updateBuilderPhrase);

    populateDayOptions(buildEvery.value);
    updateBuilderPhrase();
  }

  function dayEnToJaFull(enDay) {
    const map = {
      Monday: '月曜日', Tuesday: '火曜日', Wednesday: '水曜日', Thursday: '木曜日',
      Friday: '金曜日', Saturday: '土曜日', Sunday: '日曜日'
    };
    return map[enDay] || enDay;
  }

  /* ------------------------------------------------------------------ *
   * 9. 自然文から作成モード
   * ------------------------------------------------------------------ */

  function stripParticles(str) {
    let s = str;
    const leading = /^[のにをへ、。\s]+/;
    const trailing = /[のにをへ、。\s]+$/;
    for (let i = 0; i < 4; i++) {
      const before = s;
      s = s.replace(leading, '').replace(trailing, '');
      if (s === before) break;
    }
    return s;
  }

  // 時刻表現を抽出する。見つかった場合 {hour, minute, matchText} を返す
  function extractTime(text) {
    let m;
    if ((m = text.match(/午前\s*(\d{1,2})時(?:\s*(\d{1,2})分)?/))) {
      let h = parseInt(m[1], 10) % 12;
      return { hour: h, minute: m[2] ? parseInt(m[2], 10) : 0, matchText: m[0] };
    }
    if ((m = text.match(/午後\s*(\d{1,2})時(?:\s*(\d{1,2})分)?/))) {
      let h = parseInt(m[1], 10) % 12 + 12;
      return { hour: h, minute: m[2] ? parseInt(m[2], 10) : 0, matchText: m[0] };
    }
    if ((m = text.match(/(\d{1,2})時\s*(\d{1,2})分/))) {
      return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10), matchText: m[0] };
    }
    if ((m = text.match(/(\d{1,2})時/))) {
      return { hour: parseInt(m[1], 10), minute: 0, matchText: m[0] };
    }
    return null;
  }

  // 頻度・曜日・相対表現を抽出する
  function extractFrequency(text) {
    let m;
    if ((m = text.match(/毎週(月|火|水|木|金|土|日)曜日?/))) {
      return { kind: 'every-weekday', dayKey: KANJI_DAY_TO_KEY[m[1]], matchText: m[0] };
    }
    if ((m = text.match(/次の?(月|火|水|木|金|土|日)曜日?/))) {
      return { kind: 'next-weekday', dayKey: KANJI_DAY_TO_KEY[m[1]], matchText: m[0] };
    }
    if ((m = text.match(/毎週/))) {
      return { kind: 'every-week', matchText: m[0] };
    }
    if ((m = text.match(/毎日|毎朝|毎晩|毎夜/))) {
      return { kind: 'every-day', matchText: m[0] };
    }
    if ((m = text.match(/平日/))) {
      return { kind: 'every-weekday-generic', matchText: m[0] };
    }
    if ((m = text.match(/毎月/))) {
      return { kind: 'every-month', matchText: m[0] };
    }
    if ((m = text.match(/毎年/))) {
      return { kind: 'every-year', matchText: m[0] };
    }
    if ((m = text.match(/(\d+)\s*分後/))) {
      return { kind: 'in-minutes', value: parseInt(m[1], 10), matchText: m[0] };
    }
    if ((m = text.match(/(\d+)\s*時間後/))) {
      return { kind: 'in-hours', value: parseInt(m[1], 10), matchText: m[0] };
    }
    if ((m = text.match(/明後日/))) {
      return { kind: 'in-2-days', matchText: m[0] };
    }
    if ((m = text.match(/明日/))) {
      return { kind: 'tomorrow', matchText: m[0] };
    }
    if ((m = text.match(/今日/))) {
      return { kind: 'today', matchText: m[0] };
    }
    if ((m = text.match(/(月|火|水|木|金|土|日)曜日?/))) {
      return { kind: 'bare-weekday', dayKey: KANJI_DAY_TO_KEY[m[1]], matchText: m[0] };
    }
    return null;
  }

  function parseNaturalLanguage(rawInput, explicitTarget) {
    const input = (rawInput || '').trim();
    if (!input) return { ok: false, reason: 'empty' };

    // 0. 明示的に宛先が指定されていればそれを使う(GUIの宛先セレクタ)。
    //    指定がなければ「#チャンネル名」の記述を文中から自動抽出する(例: 「#generalに売上を確認」)。
    //    どちらもなければ自分(me)宛になる。
    let target = 'me';
    let textAfterTarget = input;
    if (explicitTarget && explicitTarget.type !== 'me' && explicitTarget.value && explicitTarget.value.length > 1) {
      target = explicitTarget.value;
    } else {
      const channelMatch = input.match(/#([a-zA-Z0-9_-]+)/);
      if (channelMatch) {
        target = `#${channelMatch[1]}`;
        textAfterTarget = input.replace(channelMatch[0], '').replace(/^に/, '');
      }
    }

    // 1. 時刻を抽出して取り除く
    const timeMatch = extractTime(textAfterTarget);
    let textAfterTime = textAfterTarget;
    if (timeMatch) {
      textAfterTime = textAfterTarget.replace(timeMatch.matchText, '').replace(/^に/, '');
    }

    // 2. 頻度・曜日・相対表現を抽出して取り除く
    const freqMatch = extractFrequency(textAfterTime);
    let remainder = textAfterTime;
    if (freqMatch) {
      remainder = remainder.replace(freqMatch.matchText, '');
    }

    // 3. 残りをメッセージとして整形
    const message = stripParticles(remainder);

    if (!freqMatch && !timeMatch) {
      return { ok: false, reason: 'ambiguous', message: stripParticles(remainder || input) };
    }
    if (!message) {
      return { ok: false, reason: 'no-message', message: '' };
    }

    // 4. Slackコマンド用フラグメントと表示用ラベルを組み立て
    const time = timeMatch ? formatTime(timeMatch.hour, timeMatch.minute) : null;
    let fragment = '';
    let freqLabel = '1回のみ';
    let weekdayLabel = '-';

    if (freqMatch) {
      switch (freqMatch.kind) {
        case 'every-weekday':
          fragment = `every ${WEEKDAY_JA_TO_EN[freqMatch.dayKey]}` + (time ? ` at ${time}` : '');
          freqLabel = '毎週'; weekdayLabel = KANJI_DAY_TO_JP_FULL[Object.keys(KANJI_DAY_TO_KEY).find(k => KANJI_DAY_TO_KEY[k] === freqMatch.dayKey)];
          break;
        case 'next-weekday': {
          const en = WEEKDAY_JA_TO_EN[freqMatch.dayKey];
          fragment = `next ${en}` + (time ? ` at ${time}` : '');
          freqLabel = '次回'; weekdayLabel = dayEnToJaFull(en);
          break;
        }
        case 'every-week':
          fragment = 'every week' + (time ? ` at ${time}` : '');
          freqLabel = '毎週';
          break;
        case 'every-day':
          fragment = 'every day' + (time ? ` at ${time}` : '');
          freqLabel = '毎日';
          break;
        case 'every-weekday-generic':
          fragment = 'every weekday' + (time ? ` at ${time}` : '');
          freqLabel = '平日毎日';
          break;
        case 'every-month':
          fragment = 'every month' + (time ? ` at ${time}` : '');
          freqLabel = '毎月';
          break;
        case 'every-year':
          fragment = 'every year' + (time ? ` at ${time}` : '');
          freqLabel = '毎年';
          break;
        case 'in-minutes':
          fragment = `in ${freqMatch.value} minutes`;
          freqLabel = '相対時間'; weekdayLabel = `${freqMatch.value}分後`;
          break;
        case 'in-hours':
          fragment = `in ${freqMatch.value} hours`;
          freqLabel = '相対時間'; weekdayLabel = `${freqMatch.value}時間後`;
          break;
        case 'in-2-days':
          fragment = 'in 2 days' + (time ? ` at ${time}` : '');
          freqLabel = '1回のみ'; weekdayLabel = '明後日';
          break;
        case 'tomorrow':
          fragment = 'tomorrow' + (time ? ` at ${time}` : '');
          freqLabel = '1回のみ'; weekdayLabel = '明日';
          break;
        case 'today':
          fragment = 'today' + (time ? ` at ${time}` : '');
          freqLabel = '1回のみ'; weekdayLabel = '今日';
          break;
        case 'bare-weekday': {
          const en = WEEKDAY_JA_TO_EN[freqMatch.dayKey];
          fragment = `${en}` + (time ? ` at ${time}` : '');
          freqLabel = '1回のみ'; weekdayLabel = dayEnToJaFull(en);
          break;
        }
        default:
          fragment = time ? `today at ${time}` : 'today';
      }
    } else if (time) {
      fragment = `today at ${time}`;
      freqLabel = '1回のみ'; weekdayLabel = '今日';
    }

    const parts = [
      { type: 'command', text: '/remind', desc: TOKEN_DESC.command },
      { type: 'target', text: target, desc: target === 'me' ? TARGET_DESC.me : (target.startsWith('#') ? TARGET_DESC.channel : TARGET_DESC.user) },
      { type: 'message', text: `"${message}"`, desc: TOKEN_DESC.message },
      { type: 'frequency', text: fragment, desc: '入力された日本語から自動的に読み取った実行タイミングです。' }
    ];

    return {
      ok: true,
      parts,
      message,
      freqLabel,
      weekdayLabel,
      timeLabel: time || '09:00(初期値)'
    };
  }

  // 将来 AI API に差し替えるためのフック(#18)
  // 例: window.parseNaturalLanguageImpl = parseNaturalLanguageWithAI;
  function parseNaturalLanguageEntry(text, explicitTarget) {
    if (typeof window.parseNaturalLanguageImpl === 'function') {
      return window.parseNaturalLanguageImpl(text, explicitTarget);
    }
    return parseNaturalLanguage(text, explicitTarget);
  }

  function initNaturalMode() {
    const input = document.getElementById('naturalInput');
    const parseBtn = document.getElementById('naturalParseBtn');
    const clearBtn = document.getElementById('naturalClearBtn');
    const clarifyCard = document.getElementById('naturalClarifyCard');
    const clarifyText = document.getElementById('naturalClarifyText');
    const clarifyOptions = document.getElementById('naturalClarifyOptions');
    const resultCard = document.getElementById('naturalResultCard');
    const parseResult = document.getElementById('parseResult');
    const naturalOutput = document.getElementById('naturalOutput');

    // --- 宛先セレクタ(自分/チャンネル/ユーザー) ---
    const targetTypeBtns = document.querySelectorAll('#naturalTargetType .seg-btn');
    const targetChannelInput = document.getElementById('naturalTargetChannel');
    const targetUserInput = document.getElementById('naturalTargetUser');
    const naturalTargetState = { type: 'channel' };

    function getExplicitTarget() {
      if (naturalTargetState.type === 'channel') {
        return { type: 'channel', value: targetChannelInput.value.trim() || '#' };
      }
      if (naturalTargetState.type === 'user') {
        return { type: 'user', value: targetUserInput.value.trim() || '@' };
      }
      return { type: 'me', value: 'me' };
    }

    targetTypeBtns.forEach(btn => btn.addEventListener('click', () => {
      targetTypeBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      naturalTargetState.type = btn.dataset.target;
      targetChannelInput.classList.toggle('is-hidden', naturalTargetState.type !== 'channel');
      targetUserInput.classList.toggle('is-hidden', naturalTargetState.type !== 'user');
      if (input.value.trim()) runParse(input.value);
    }));

    targetChannelInput.addEventListener('input', () => {
      enforcePrefix(targetChannelInput, '#');
      if (input.value.trim()) runParse(input.value);
    });
    targetUserInput.addEventListener('input', () => {
      enforcePrefix(targetUserInput, '@');
      if (input.value.trim()) runParse(input.value);
    });

    renderSampleList('sampleListNatural', (text) => {
      input.value = text;
      runParse(text);
    });

    parseBtn.addEventListener('click', () => runParse(input.value));
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clarifyCard.style.display = 'none';
      resultCard.style.display = 'none';
      input.focus();
    });

    function runParse(text) {
      const result = parseNaturalLanguageEntry(text, getExplicitTarget());

      if (!result.ok && result.reason === 'ambiguous') {
        showClarify(result.message, text);
        return;
      }
      if (!result.ok) {
        showToast('内容を読み取れませんでした。もう少し具体的に入力してください。');
        clarifyCard.style.display = 'none';
        resultCard.style.display = 'none';
        return;
      }
      clarifyCard.style.display = 'none';
      renderResult(result);
    }

    function showClarify(message, originalText) {
      resultCard.style.display = 'none';
      clarifyCard.style.display = 'block';
      clarifyText.textContent = `「${message || originalText}」だけでは、いつリマインドすればよいか分かりませんでした。タイミングを選んでください。`;
      clarifyOptions.innerHTML = '';

      const options = [
        { label: '毎日', build: () => `毎日9時に${message || originalText}` },
        { label: '明日', build: () => `明日9時に${message || originalText}` },
        { label: '毎週', build: () => `毎週月曜日の9時に${message || originalText}` },
        { label: '日時を指定', build: null }
      ];

      options.forEach(opt => {
        const btn = el('button', { class: 'clarify-btn', attrs: { type: 'button' }, text: opt.label });
        btn.addEventListener('click', () => {
          if (opt.build) {
            const newText = opt.build();
            input.value = newText;
            runParse(newText);
          } else {
            // 「日時を指定」→ 簡単作成モードへ切り替えてメッセージを引き継ぐ
            buildState.message = message || originalText;
            switchMode('build');
            document.getElementById('messageInput').value = buildState.message;
            document.getElementById('messageInput').dispatchEvent(new Event('input'));
            showToast('「簡単作成」で続きを設定してください');
          }
        });
        clarifyOptions.appendChild(btn);
      });
    }

    function renderResult(result) {
      resultCard.style.display = 'block';
      parseResult.innerHTML = '';

      const cells = [
        { icon: '🔄', label: '繰り返し', value: result.freqLabel },
        { icon: '📅', label: '曜日/日付', value: result.weekdayLabel || '-' },
        { icon: '🕐', label: '時刻', value: result.timeLabel },
        { icon: '📝', label: '内容', value: result.message }
      ];
      cells.forEach(c => {
        parseResult.appendChild(el('div', { class: 'parse-cell' }, [
          el('div', { class: 'parse-cell-label', text: `${c.icon} ${c.label}` }),
          el('div', { class: 'parse-cell-value', text: c.value })
        ]));
      });

      renderCommandCard(naturalOutput, result.parts);
    }
  }

  /* ------------------------------------------------------------------ *
   * 10. モード切り替え (#2)
   * ------------------------------------------------------------------ */

  function switchMode(mode) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.mode-panel').forEach(panel => {
      panel.classList.toggle('is-active', panel.id === `panel-${mode}`);
    });
  }

  function initModeTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });
    // index.html を開いた時は常に「簡単作成」を表示する(前回のモードは復元しない)
    switchMode('build');
  }

  /* ------------------------------------------------------------------ *
   * 11. ダークモード (#24)
   * ------------------------------------------------------------------ */

  function initDarkMode() {
    const toggle = document.getElementById('themeToggle');
    const icon = toggle.querySelector('.theme-icon');
    let isDark = false;
    try { isDark = localStorage.getItem(LS_KEYS.darkMode) === '1'; } catch (e) { /* noop */ }
    applyDark(isDark);

    toggle.addEventListener('click', () => {
      isDark = !isDark;
      applyDark(isDark);
      try { localStorage.setItem(LS_KEYS.darkMode, isDark ? '1' : '0'); } catch (e) { /* noop */ }
    });

    function applyDark(dark) {
      document.documentElement.classList.toggle('dark', dark);
      icon.textContent = dark ? '☀️' : '🌙';
    }
  }

  /* ------------------------------------------------------------------ *
   * 13. 初期化
   * ------------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', () => {
    purgeLegacyHistory();
    loadFormState();
    initModeTabs();
    initDarkMode();
    initBuildMode();
    initLearnMode();
    initNaturalMode();
  });

})();
