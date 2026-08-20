/* ==========================================================================
   Slack Remind Builder — script.js
   完全クライアントサイド / 外部ライブラリなし
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * -1. 多言語対応 (i18n)
   * ------------------------------------------------------------------ */

  let currentLang = 'ja'; // 'ja' | 'en'
  let refreshLearnUI = null; // 言語切替時にコマンドを学ぶページを再描画するためのフック
  let refreshBuildUI = null; // 言語切替時に簡単作成ページを再描画するためのフック
  let refreshNaturalUI = null; // 言語切替時に自然文から作成ページを再描画するためのフック

  // 値が {ja, en} オブジェクトならその言語の文字列を、単なる文字列ならそのまま返す
  function pick(field) {
    if (field == null) return '';
    if (typeof field === 'string') return field;
    return field[currentLang] != null ? field[currentLang] : field.ja;
  }

  // UI文言辞書。data-i18n="key" を持つ要素の textContent、
  // data-i18n-placeholder="key" を持つ要素の placeholder、
  // data-i18n-aria-label="key" を持つ要素の aria-label に反映される。
  const UI_STRINGS = {
    themeToggleAriaLabel: { ja: 'ダークモード切替', en: 'Toggle dark mode' },
    langToggleAriaLabel: { ja: '言語切替', en: 'Switch language' },
    langToggleAriaLabelCurrent: { ja: '言語切替(現在: 日本語)', en: 'Switch language (current: English)' },
    modeTabsAriaLabel: { ja: 'モード選択', en: 'Select mode' },
    tabBuild: { ja: '簡単作成', en: 'Quick Build' },
    tabLearn: { ja: 'コマンドを学ぶ', en: 'Learn' },
    tabNatural: { ja: '自然文から作成', en: 'From a Sentence' },
    heroPrefix: { ja: 'Slackの ', en: "Build Slack's " },
    heroSuffix: { ja: ' を簡単に作って、楽しく学ぶ。', en: ' the easy way — and have fun learning it.' },

    buildCardTitle: { ja: 'リマインドを作成', en: 'Create a Reminder' },
    labelTarget: { ja: '宛先', en: 'Send to' },
    targetChannelBtn: { ja: 'チャンネル', en: 'Channel' },
    targetUserBtn: { ja: 'ユーザー', en: 'User' },
    targetMeBtn: { ja: '自分', en: 'Me' },
    channelPlaceholder: { ja: '#general', en: '#general' },
    userPlaceholder: { ja: '@tanaka', en: '@username' },
    hintTargetChannel: { ja: 'チャンネルの全員に向けてリマインドを送ります。「#」は自動的に付きます。', en: 'Sends the reminder to everyone in the channel. The "#" is added automatically.' },
    mentionInsertLabel: { ja: '特殊通知をメッセージに挿入:', en: 'Insert a special mention:' },
    mentionInsertHint: { ja: '@here/@channelはチャンネルの全メンバーに通知します。@everyoneは #general チャンネルでのみ利用できます。', en: '@here/@channel notify everyone in the channel. @everyone only works in the #general channel.' },
    mentionEveryoneWarning: { ja: '⚠ @everyone は #general チャンネルでのみ通知されます。このチャンネルでは通知されない可能性があります。', en: '⚠ @everyone only notifies in the #general channel. It may not notify anyone in this channel.' },
    mentionDuplicateWarning: { ja: '⚠ 「{mention}」が2回以上使われています。意図した内容か確認してください。', en: '⚠ "{mention}" appears more than once. Make sure that\'s intentional.' },
    toastMentionAlreadyPresent: { ja: '「{mention}」はすでに入っています', en: '"{mention}" is already in the message' },
    hintTargetUser: { ja: 'ユーザー名を「@」から入力してください。※ワークスペースの設定によっては、個人宛リマインドが利用できない場合があります。', en: 'Enter the username starting with "@". Note: depending on workspace settings, reminders to individual users may not be supported.' },
    hintTargetMe: { ja: '自分自身だけに届くリマインドです。', en: 'A reminder only you will receive.' },
    labelMessage: { ja: 'メッセージ', en: 'Message' },
    messagePlaceholder: { ja: '会議資料を確認してください', en: 'Please review the meeting materials' },
    labelSchedule: { ja: '実行タイミング', en: 'When' },
    scheduleOnceBtn: { ja: '1回のみ', en: 'Once' },
    scheduleRepeatBtn: { ja: '繰り返し', en: 'Repeat' },
    labelDate: { ja: '日付', en: 'Date' },
    datePickerPlaceholder: { ja: '日付を選択', en: 'Select a date' },
    labelTime: { ja: '時刻', en: 'Time' },
    labelRepeatType: { ja: '繰り返しパターン', en: 'Repeat pattern' },
    repeatDay: { ja: '毎日', en: 'Every day' },
    repeatWeekday: { ja: '平日(月〜金)', en: 'Weekdays (Mon–Fri)' },
    repeatWeekend: { ja: '休日(土日)', en: 'Weekends (Sat–Sun)' },
    repeatWeek: { ja: '毎週', en: 'Weekly' },
    repeatBiweekly: { ja: '隔週', en: 'Every 2 weeks' },
    repeatMonth: { ja: '毎月', en: 'Monthly' },
    repeatYear: { ja: '毎年', en: 'Yearly' },
    weekdayPickerLabelWeek: { ja: '曜日を選択(複数可)', en: 'Select day(s) of the week' },
    weekdayPickerLabelBiweekly: { ja: '曜日を選択(隔週で繰り返す曜日)', en: 'Select day(s) (repeats every 2 weeks)' },
    labelMonthDay: { ja: '日付(毎月の何日)', en: 'Date (day of the month)' },
    labelYearDate: { ja: '日付(毎年の月日)', en: 'Date (month & day, every year)' },
    btnReset: { ja: 'リセット', en: 'Reset' },
    labelExplainTitle: { ja: 'このコマンドの意味', en: 'What this command means' },
    explainDesc: { ja: '色ごとに「コマンド/宛先/メッセージ/繰り返し/時刻」を表しています。', en: 'Each color represents a part: command / target / message / frequency / time.' },
    explainPlaceholder: { ja: '宛先・メッセージ・時刻を入力すると、ここに解説が表示されます。', en: 'Fill in the target, message, and time to see the explanation here.' },
    nextRunTitle: { ja: '次回実行プレビュー', en: 'Upcoming Occurrences' },
    nextRunDesc: { ja: 'この設定で、実際にいつ実行されるかを確認できます(概算です)。', en: 'See when this reminder will actually fire (an estimate).' },
    nextRunEmptyNote: { ja: '宛先・メッセージ・日時を入力すると、ここに次回実行の予定が表示されます。', en: 'Fill in the target, message, and time to preview upcoming occurrences here.' },
    nextRunOnceLabel: { ja: '実行日時', en: 'Scheduled for' },
    nextRunFirstLabel: { ja: '次回実行', en: 'Next' },
    nextRunThenLabel: { ja: 'その次', en: 'Then' },
    nextRunTzLabel: { ja: 'タイムゾーン: {tz}(このブラウザの設定)。', en: 'Timezone: {tz} (this browser\'s setting).' },
    nextRunTzCaution: { ja: 'Slackは実際には各ユーザーのSlackアカウント設定のタイムゾーンで実行されるため、実際の時刻とズレる場合があります。', en: 'Slack reminders actually run in each user\'s own Slack account timezone, which may differ from this.' },
    nextRunBiweeklyNote: { ja: '⚠「隔週」の起点はSlack側が決めるため、この日程は今日を起点とした概算です。', en: '⚠ Slack determines the actual start point for "every 2 weeks", so these dates are only an estimate based on today.' },
    nextRunMonthSkipNote: { ja: '⚠ その日付が存在しない月はスキップされます(例: 31日は2月・4月・6月・9月・11月に存在しません)。', en: '⚠ Months without that date are skipped (e.g. the 31st doesn\'t exist in Feb, Apr, Jun, Sep, or Nov).' },
    nextRunYearSkipNote: { ja: '⚠ 2月29日は、うるう年以外はスキップされます。', en: '⚠ Feb 29 is skipped in years that aren\'t leap years.' },
    btnOpenSlack: { ja: 'Slackを開く', en: 'Open Slack' },
    pasteHintMac: { ja: 'コピーしたら、開いたSlackに ⌘V で貼り付けてください。', en: 'After copying, paste it into Slack with ⌘V.' },
    pasteHintWin: { ja: 'コピーしたら、開いたSlackに Ctrl+V で貼り付けてください。', en: 'After copying, paste it into Slack with Ctrl+V.' },
    labelTemplates: { ja: 'よく使うテンプレート', en: 'Quick templates' },
    templatesDesc: { ja: 'クリックすると左のフォームに反映されます。', en: 'Click one to fill in the form on the left.' },
    errNoMessage: { ja: '⚠ メッセージを入力してください', en: '⚠ Please enter a message' },
    errNoUser: { ja: '⚠ ユーザー名を入力してください(例: @tanaka)', en: '⚠ Please enter a username (e.g. @username)' },
    errNoChannel: { ja: '⚠ チャンネル名を入力してください(例: #general)', en: '⚠ Please enter a channel name (e.g. #general)' },
    errNoTime: { ja: '⚠ リマインドする時刻を指定してください', en: '⚠ Please specify a time for the reminder' },
    errNoWeekday: { ja: '⚠ 曜日を1つ以上選択してください', en: '⚠ Please select at least one day of the week' },
    toastCopied: { ja: '✓ コピーしました', en: '✓ Copied to clipboard' },
    toastCopiedShort: { ja: '✓ コピー済み', en: '✓ Copied' },
    toastCopyFailed: { ja: 'コピーに失敗しました', en: 'Copy failed' },
    toastReset: { ja: 'フォームをリセットしました', en: 'Form has been reset' },
    btnExplain: { ja: 'コマンドを分解して見る', en: 'Show breakdown' },
    btnExplainClose: { ja: 'コマンドの分解を閉じる', en: 'Hide breakdown' },

    learnDecomposeTitle: { ja: 'コマンドを分解してみよう', en: 'Break Down a Command' },
    learnDecomposeDesc: { ja: '下のコマンドの各パーツをクリックすると、意味が表示されます。', en: 'Click each part of the command below to see what it means.' },
    decomposeEmptyNote: { ja: 'パーツをクリックすると、ここに説明が表示されます', en: 'Click a part above to see its explanation here' },
    grammarCardsTitle: { ja: '文法カード', en: 'Grammar Cards' },
    builderTitle: { ja: '文法を組み立ててみよう', en: 'Build Your Own Grammar' },
    builderDesc: { ja: 'パーツを選ぶと、Slackコマンドの文法が完成します。', en: 'Choose the parts to build a piece of Slack command syntax.' },
    builderYourPhrase: { ja: 'あなたが作った文法', en: 'The grammar you built' },
    labelMeaning: { ja: '意味', en: 'Meaning' },
    dictTitle: { ja: 'Slack Remind 文法辞典', en: 'Slack Remind Glossary' },
    dictNote: { ja: '※ Slackの仕様は更新される場合があります。個人ユーザー宛のリマインドは現在サポートされていない可能性があるため、実際に使う前に最新のSlackヘルプもご確認ください。', en: "Note: Slack's syntax may change over time, and reminders to individual users may no longer be supported. Please check Slack's latest help docs before relying on this." },
    dictLabel: { ja: '文法', en: 'Syntax' },

    naturalInputTitle: { ja: '日本語で入力してください', en: 'Type in English' },
    naturalPlaceholder: { ja: '例：\n毎週金曜日の17時に売上報告を確認', en: 'e.g.\nEvery Friday at 5pm, review the sales report' },
    btnGenerate: { ja: 'コマンドを生成', en: 'Generate command' },
    btnClear: { ja: 'クリア', en: 'Clear' },
    labelSamples: { ja: 'サンプルを試す', en: 'Try a sample' },
    clarifyTitle: { ja: 'いつリマインドしますか？', en: 'When should this remind you?' },
    parseResultTitle: { ja: '解析結果', en: 'Parsed result' },
    parseCellFreq: { ja: '🔄 繰り返し', en: '🔄 Repeats' },
    parseCellDay: { ja: '📅 曜日/日付', en: '📅 Day/Date' },
    parseCellTime: { ja: '🕐 時刻', en: '🕐 Time' },
    parseCellMessage: { ja: '📝 内容', en: '📝 Message' },
    naturalCouldNotParse: { ja: '内容を読み取れませんでした。もう少し具体的に入力してください。', en: "Couldn't quite parse that — try being a bit more specific." },
    naturalAmbiguousPrefix: { ja: '「', en: '"' },
    naturalAmbiguousSuffix: { ja: '」だけでは、いつリマインドすればよいか分かりませんでした。タイミングを選んでください。', en: '" alone doesn\'t tell us when to remind you. Please choose a timing.' },
    clarifyDaily: { ja: '毎日', en: 'Daily' },
    clarifyTomorrow: { ja: '明日', en: 'Tomorrow' },
    clarifyWeekly: { ja: '毎週', en: 'Weekly' },
    clarifySpecify: { ja: '日時を指定', en: 'Pick date & time' },
    toastSwitchToBuild: { ja: '「簡単作成」で続きを設定してください', en: 'Continue setting it up in "Quick Build"' },

    generatedCommandLabel: { ja: '生成されたコマンド', en: 'Generated command' },
    btnCopy: { ja: 'コピー', en: 'Copy' },

    tokenLabelCommand: { ja: 'コマンド', en: 'Command' },
    tokenLabelTarget: { ja: '宛先', en: 'Target' },
    tokenLabelMessage: { ja: 'リマインド内容', en: 'Message' },
    tokenLabelFrequency: { ja: '繰り返し', en: 'Frequency' },
    tokenLabelTime: { ja: '実行時刻', en: 'Time' },

    freqOnce: { ja: '1回のみ', en: 'One-time' },
    freqEveryWeek: { ja: '毎週', en: 'Weekly' },
    freqNext: { ja: '次回', en: 'Next occurrence' },
    freqEveryDay: { ja: '毎日', en: 'Daily' },
    freqEveryWeekdayGeneric: { ja: '平日毎日', en: 'Every weekday' },
    freqEveryMonth: { ja: '毎月', en: 'Monthly' },
    freqEveryYear: { ja: '毎年', en: 'Yearly' },
    freqRelative: { ja: '相対時間', en: 'Relative time' },
    labelToday: { ja: '今日', en: 'Today' },
    labelTomorrow: { ja: '明日', en: 'Tomorrow' },
    labelDayAfterTomorrow: { ja: '明後日', en: 'The day after tomorrow' },
    minutesLater: { ja: '分後', en: ' min later' },
    hoursLater: { ja: '時間後', en: ' hr later' },
    defaultValueSuffix: { ja: '(初期値)', en: ' (default)' },
    calPrevMonth: { ja: '前の月', en: 'Previous month' },
    calNextMonth: { ja: '次の月', en: 'Next month' },
    toastTemplateApplied: { ja: '「{label}」を反映しました', en: '"{label}" applied' }
  };

  function t(key) {
    const entry = UI_STRINGS[key];
    if (!entry) return key;
    return pick(entry);
  }

  function applyStaticTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach(elNode => {
      elNode.textContent = t(elNode.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(elNode => {
      elNode.setAttribute('placeholder', t(elNode.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(elNode => {
      elNode.setAttribute('aria-label', t(elNode.getAttribute('data-i18n-aria-label')));
    });
    document.querySelectorAll('.day-chip').forEach(chip => {
      chip.textContent = weekdayChipLabel(chip.dataset.day);
    });
  }

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
  const WEEKDAY_EN_SHORT_LABEL = {
    mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
  };
  function weekdayChipLabel(key) {
    return currentLang === 'en' ? WEEKDAY_EN_SHORT_LABEL[key] : WEEKDAY_JA_LABEL[key];
  }
  const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  // JS の Date.getDay() (0=日曜〜6=土曜) から weekday キーを引くための対応表
  const WEEKDAY_KEY_BY_JS_INDEX = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

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
  // 英語の曜日名(小文字) → key
  const EN_DAY_WORD_TO_KEY = { monday: 'mon', tuesday: 'tue', wednesday: 'wed', thursday: 'thu', friday: 'fri', saturday: 'sat', sunday: 'sun' };

  const TARGET_DESC = {
    channel: { ja: 'このチャンネルの全員にリマインドを送ります。', en: 'Sends the reminder to everyone in this channel.' },
    user: { ja: '指定したユーザーにリマインドを送ります(※ワークスペースの設定によっては個人宛リマインドが利用できない場合があります)。', en: 'Sends the reminder to the specified user (individual reminders may not be supported on some workspaces).' },
    me: { ja: '自分自身だけに届くリマインドです。', en: 'A reminder only you will receive.' }
  };

  const TOKEN_DESC = {
    command: { ja: 'これから何かをリマインドする、という命令です。', en: 'Tells Slack you want to set a reminder.' },
    target: { ja: '誰(どこ)にリマインドを送るかを表します。', en: 'Who (or where) the reminder is sent to.' },
    message: { ja: 'リマインドしてほしい内容です。ダブルクォートで囲むと、スペースを含む文章でも正しく認識されます。', en: 'The content you want to be reminded about. Wrapping it in double quotes keeps multi-word text together.' },
    frequency: { ja: 'いつ・どれくらいの頻度で実行するかを表します。', en: 'When, or how often, the reminder runs.' },
    time: { ja: '実行される時刻です(24時間表記)。', en: 'The time the reminder runs (24-hour format).' }
  };

  // 文法カード(#10)
  const GRAMMAR_CARDS = [
    { syntax: 'every Monday', meaning: { ja: '毎週月曜日', en: 'Every Monday' }, example: '/remind me "meeting" every Monday at 09:00' },
    { syntax: 'at 09:00', meaning: { ja: '午前9時に', en: 'At 9am' }, example: '/remind me "check email" every weekday at 09:00' },
    { syntax: 'in 30 minutes', meaning: { ja: '30分後に', en: 'In 30 minutes' }, example: '/remind me "take a break" in 30 minutes' },
    { syntax: 'next Monday', meaning: { ja: '次の月曜日', en: 'Next Monday' }, example: '/remind me "meeting" next Monday at 09:00' }
  ];

  // 文法辞典(#11)
  const GRAMMAR_DICT = [
    { syntax: 'every day', meaning: { ja: '毎日', en: 'Every day' }, detail: { ja: '毎日同じ時刻にリマインドを繰り返します。例: every day at 08:00', en: 'Repeats the reminder at the same time every day. Example: every day at 08:00' } },
    { syntax: 'every weekday', meaning: { ja: '平日毎日', en: 'Every weekday' }, detail: { ja: '月曜日から金曜日までの平日だけリマインドします。土日はスキップされます。', en: 'Reminds you only on weekdays, Monday through Friday. Saturdays and Sundays are skipped.' } },
    { syntax: 'every Monday', meaning: { ja: '毎週月曜日', en: 'Every Monday' }, detail: { ja: '指定した曜日に毎週リマインドします。他の曜日名(Tuesday, Wednesdayなど)にも置き換えられます。', en: 'Reminds you every week on the day you specify. You can swap in other day names (Tuesday, Wednesday, etc.).' } },
    { syntax: 'every Friday', meaning: { ja: '毎週金曜日', en: 'Every Friday' }, detail: { ja: '金曜日に毎週リマインドします。週次レポートの提出などに便利です。', en: 'Reminds you every Friday. Handy for weekly report submissions.' } },
    { syntax: 'every 2 weeks', meaning: { ja: '2週間ごと(隔週)', en: 'Every 2 weeks (biweekly)' }, detail: { ja: '2週間に1回のペースでリマインドします。隔週ミーティングの準備などに便利です。', en: 'Reminds you once every two weeks. Handy for biweekly meeting prep.' } },
    { syntax: 'at 09:00', meaning: { ja: '午前9時', en: '9am' }, detail: { ja: '24時間表記で時刻を指定します。"9am" のような12時間表記も利用できます。', en: 'Specifies the time in 24-hour format. 12-hour formats like "9am" also work.' } },
    { syntax: 'in 30 minutes', meaning: { ja: '30分後', en: 'In 30 minutes' }, detail: { ja: '現在時刻からの相対時間でリマインドします。1回だけ実行されます。', en: 'Reminds you a relative amount of time from now. Runs only once.' } },
    { syntax: 'in 2 hours', meaning: { ja: '2時間後', en: 'In 2 hours' }, detail: { ja: '相対時間の指定。分・時間の単位で「〇〇後」を表現できます。', en: 'A relative time offset — express "in X" using minutes or hours.' } },
    { syntax: 'tomorrow', meaning: { ja: '明日', en: 'Tomorrow' }, detail: { ja: '翌日の同じ時刻、または指定した時刻にリマインドします。1回だけ実行されます。', en: 'Reminds you tomorrow, at the same time or a time you specify. Runs only once.' } },
    { syntax: 'next Monday', meaning: { ja: '次の月曜日', en: 'Next Monday' }, detail: { ja: '直近の月曜日に1回だけリマインドします。毎週繰り返したい場合は every Monday を使います。', en: 'Reminds you once, on the nearest Monday. Use "every Monday" if you want it weekly.' } },
    { syntax: 'next week', meaning: { ja: '来週', en: 'Next week' }, detail: { ja: '来週の同じ曜日にリマインドします。1回だけ実行されます。', en: 'Reminds you next week on the same day. Runs only once.' } }
  ];

  // サンプル(#21) — 自然文入力の例。JAとENでは解析エンジンが異なるため、
  // それぞれの言語として自然な例文を用意する。
  const SAMPLES = [
    { label: { ja: '毎朝', en: 'Every morning' }, text: { ja: '毎朝9時にメールを確認', en: 'Every morning at 9am, check email' } },
    { label: { ja: '毎週', en: 'Weekly' }, text: { ja: '毎週金曜日の17時に売上報告を確認', en: 'Every Friday at 5pm, review the sales report' } },
    { label: { ja: '30分後', en: 'In 30 min' }, text: { ja: '30分後に休憩する', en: 'In 30 minutes, take a break' } },
    { label: { ja: '次回', en: 'Next time' }, text: { ja: '次の月曜日の10時に会議', en: 'Next Monday at 10am, team meeting' } }
  ];

  // 簡単作成モードの「よく使うテンプレート」(#右側パネル)
  // 6種類の繰り返しパターンを一通り体験できるように選定
  const QUICK_TEMPLATES = [
    { label: { ja: '毎朝の朝会', en: 'Morning standup' }, icon: '☀️', meta: { ja: '毎日', en: 'Daily' }, targetType: 'channel', targetChannel: '#general', message: { ja: '朝会の準備をする', en: 'Prepare for the morning standup' }, scheduleType: 'repeat', repeatType: 'day', time: '09:00' },
    { label: { ja: '退勤前の日報', en: 'End-of-day report' }, icon: '📝', meta: { ja: '平日', en: 'Weekdays' }, targetType: 'channel', targetChannel: '#general', message: { ja: '日報を提出する', en: 'Submit the daily report' }, scheduleType: 'repeat', repeatType: 'weekday', time: '17:30' },
    { label: { ja: '週次レビュー', en: 'Weekly review' }, icon: '📊', meta: { ja: '毎週金', en: 'Fridays' }, targetType: 'channel', targetChannel: '#team', message: { ja: '週次レビューを行う', en: 'Run the weekly review' }, scheduleType: 'repeat', repeatType: 'week', weekdays: ['fri'], time: '16:00' },
    { label: { ja: '隔週の1on1', en: 'Biweekly 1-on-1' }, icon: '🤝', meta: { ja: '隔週月', en: 'Every 2 wks' }, targetType: 'channel', targetChannel: '#1on1', message: { ja: '1on1の準備をする', en: 'Prepare for the 1-on-1' }, scheduleType: 'repeat', repeatType: 'biweekly', weekdays: ['mon'], time: '10:00' },
    { label: { ja: '月初の請求処理', en: 'Monthly invoicing' }, icon: '💰', meta: { ja: '毎月1日', en: 'Day 1' }, targetType: 'me', message: { ja: '請求書を処理する', en: 'Process the invoices' }, scheduleType: 'repeat', repeatType: 'month', monthDay: 1, time: '10:00' },
    { label: { ja: '誕生日のお祝い', en: 'Birthday shoutout' }, icon: '🎂', meta: { ja: '毎年8/21', en: 'Aug 21' }, targetType: 'me', message: { ja: '誕生日のお祝いメッセージを送る', en: 'Send a birthday message' }, scheduleType: 'repeat', repeatType: 'year', yearMonth: 8, yearDay: 21, time: '09:00' }
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

  // トグル式ボタン(宛先・実行タイミング・曜日チップなど)の選択状態を、
  // 見た目(is-active)とスクリーンリーダー向け(aria-pressed)の両方に反映する。
  // アクセシビリティ改善: 色だけでなく aria-pressed でも状態を伝える。
  function setPressed(elNode, isActive) {
    elNode.classList.toggle('is-active', isActive);
    elNode.setAttribute('aria-pressed', String(!!isActive));
  }
  function setPressedGroup(buttons, predicate) {
    buttons.forEach(b => setPressed(b, predicate(b)));
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

  function timeToLocale(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    if (currentLang === 'en') {
      const period = h < 12 ? 'am' : 'pm';
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      return `${h12}:${pad2(m)}${period}`;
    }
    const period = h < 12 ? '午前' : '午後';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${period}${h12}時${m > 0 ? m + '分' : ''}`;
  }

  function durationToLocale(value) {
    if (currentLang === 'en') return value; // 値自体が既に英語表記 ("30 minutes" など)
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
      else dateFragment = `on ${target.getMonth() + 1}/${target.getDate()}/${target.getFullYear()}`;
    } else {
      dateFragment = 'today';
    }
    parts.push({ type: 'time', text: `${dateFragment} at ${time}`, desc: { ja: '実行される日時です。', en: 'The date and time the reminder runs.' } });
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
        freqText = 'every day';
        freqDesc = { ja: '毎日繰り返します。', en: 'Repeats every day.' };
        break;
      case 'weekday':
        freqText = 'every weekday';
        freqDesc = { ja: '月〜金の平日のみ繰り返します。', en: 'Repeats only on weekdays, Monday through Friday.' };
        break;
      case 'weekend':
        freqText = 'every Saturday, Sunday';
        freqDesc = { ja: '土曜日と日曜日(休日)に繰り返します。', en: 'Repeats on Saturdays and Sundays.' };
        break;
      case 'week': {
        const days = state.weekdays.length ? state.weekdays : ['mon'];
        freqText = 'every ' + days.map(d => WEEKDAY_JA_TO_EN[d]).join(', ');
        freqDesc = {
          ja: `毎週 ${days.map(d => WEEKDAY_JA_LABEL[d]).join('・')}曜日 に繰り返します。`,
          en: `Repeats every week on ${days.map(d => WEEKDAY_JA_TO_EN[d]).join(', ')}.`
        };
        break;
      }
      case 'biweekly': {
        const days = state.weekdays.length ? state.weekdays : ['mon'];
        freqText = `every 2 weeks on ${days.map(d => WEEKDAY_JA_TO_EN[d]).join(', ')}`;
        freqDesc = {
          ja: `2週間に1回、${days.map(d => WEEKDAY_JA_LABEL[d]).join('・')}曜日に繰り返します(隔週)。`,
          en: `Repeats every 2 weeks on ${days.map(d => WEEKDAY_JA_TO_EN[d]).join(', ')}.`
        };
        break;
      }
      case 'month': {
        const day = state.monthDay || 1;
        freqText = `on the ${day}${ordinalSuffix(day)} of every month`;
        freqDesc = { ja: `毎月${day}日に繰り返します。`, en: `Repeats on day ${day} of every month.` };
        break;
      }
      case 'year': {
        const month = state.yearMonth || 1;
        const day = state.yearDay || 1;
        freqText = `on ${MONTH_EN[month - 1]} ${day} every year`;
        freqDesc = { ja: `毎年${MONTH_JA[month - 1]}${day}日に繰り返します。`, en: `Repeats every year on ${MONTH_EN[month - 1]} ${day}.` };
        break;
      }
      default:
        freqText = 'every day';
        freqDesc = { ja: '毎日繰り返します。', en: 'Repeats every day.' };
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
      errors.message = t('errNoMessage');
    }
    if (state.targetType === 'user' && !state.targetUser.trim()) {
      errors.target = t('errNoUser');
    }
    if (state.targetType === 'channel' && state.targetChannel.trim().replace(/^#+/, '') === '') {
      errors.target = t('errNoChannel');
    }
    if (state.scheduleType === 'once' && !state.onceDate) {
      // 日付未指定は「today」として扱うため必須ではないが、時刻は必須
      if (!state.onceTime) errors.schedule = t('errNoTime');
    }
    if (state.scheduleType === 'repeat' && (state.repeatType === 'week' || state.repeatType === 'biweekly') && state.weekdays.length === 0) {
      errors.schedule = t('errNoWeekday');
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
   * 2.5 次回実行プレビュー
   * このアプリだけで完結する概算計算です(サーバー側の起点を知らないため、
   * 「隔週」は今日を起点とした概算、日付はブラウザのタイムゾーンで計算しています)。
   * ------------------------------------------------------------------ */

  function computeNextOccurrences(state, count) {
    const now = new Date();
    const notes = new Set();
    const results = [];

    function timeParts(t) {
      const [h, m] = (t || '09:00').split(':').map(Number);
      return { h: h || 0, m: m || 0 };
    }

    if (state.scheduleType === 'once') {
      if (!state.onceDate) return { results, notes };
      const [y, mo, d] = state.onceDate.split('-').map(Number);
      const { h, m } = timeParts(state.onceTime);
      if (!y || !mo || !d) return { results, notes };
      results.push(new Date(y, mo - 1, d, h, m));
      return { results, notes };
    }

    const { h, m } = timeParts(state.repeatTime);
    const type = state.repeatType;

    if (type === 'month') {
      const day = state.monthDay || 1;
      let y = now.getFullYear();
      let mo = now.getMonth(); // 0-11
      let guard = 0;
      while (results.length < count && guard < 60) {
        const daysInThisMonth = new Date(y, mo + 1, 0).getDate();
        if (day <= daysInThisMonth) {
          const candidate = new Date(y, mo, day, h, m);
          if (candidate > now) results.push(candidate);
        } else {
          notes.add('monthSkip');
        }
        mo += 1;
        if (mo > 11) { mo = 0; y += 1; }
        guard += 1;
      }
      return { results, notes };
    }

    if (type === 'year') {
      const day = state.yearDay || 1;
      const month = (state.yearMonth || 1) - 1; // 0-11
      let y = now.getFullYear();
      let guard = 0;
      while (results.length < count && guard < 30) {
        const daysInThisMonth = new Date(y, month + 1, 0).getDate();
        if (day <= daysInThisMonth) {
          const candidate = new Date(y, month, day, h, m);
          if (candidate > now) results.push(candidate);
        } else {
          notes.add('yearSkip'); // 例: うるう年以外の2月29日
        }
        y += 1;
        guard += 1;
      }
      return { results, notes };
    }

    // day / weekday / weekend / week / biweekly は1日ずつ進めながら条件に合う日を探す
    let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    if (cursor <= now) cursor.setDate(cursor.getDate() + 1);
    const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let targetDayIndices = null;
    if (type === 'week' || type === 'biweekly') {
      const days = (state.weekdays && state.weekdays.length) ? state.weekdays : ['mon'];
      targetDayIndices = days.map(d => WEEKDAY_KEY_BY_JS_INDEX.indexOf(d));
    }
    if (type === 'biweekly') notes.add('biweeklyApprox');

    let guard = 0;
    while (results.length < count && guard < 400) {
      const dow = cursor.getDay();
      let matches = false;
      if (type === 'day') matches = true;
      else if (type === 'weekday') matches = dow !== 0 && dow !== 6;
      else if (type === 'weekend') matches = dow === 0 || dow === 6;
      else if (type === 'week') matches = targetDayIndices.includes(dow);
      else if (type === 'biweekly') {
        if (targetDayIndices.includes(dow)) {
          const daysSinceAnchor = Math.round((new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()) - anchor) / 86400000);
          matches = Math.floor(daysSinceAnchor / 7) % 2 === 0;
        }
      }
      if (matches) results.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
    return { results, notes };
  }

  function formatOccurrenceDate(date) {
    const y = date.getFullYear(), mo = pad2(date.getMonth() + 1), d = pad2(date.getDate());
    const hh = pad2(date.getHours()), mm = pad2(date.getMinutes());
    const wd = currentLang === 'en' ? EN_WEEKDAY_SHORT_BY_INDEX[date.getDay()] : JP_WEEKDAY_BY_INDEX[date.getDay()];
    return `${y}-${mo}-${d} ${hh}:${mm} (${wd})`;
  }

  function renderNextRunPreview(state) {
    const listEl = document.getElementById('nextRunList');
    const noteEl = document.getElementById('nextRunNote');
    if (!listEl || !noteEl) return;
    listEl.innerHTML = '';

    const isOnce = state.scheduleType === 'once';
    const { results, notes } = computeNextOccurrences(state, isOnce ? 1 : 5);

    if (results.length === 0) {
      listEl.appendChild(el('p', { class: 'empty-note', text: t('nextRunEmptyNote') }));
      noteEl.textContent = '';
      return;
    }

    results.forEach((date, i) => {
      const label = isOnce ? t('nextRunOnceLabel') : (i === 0 ? t('nextRunFirstLabel') : t('nextRunThenLabel'));
      listEl.appendChild(el('div', { class: 'next-run-row' }, [
        el('span', { class: 'next-run-row-label', text: label }),
        el('span', { class: 'next-run-row-date', text: formatOccurrenceDate(date) })
      ]));
    });

    let tz = 'UTC';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { /* noop */ }
    const noteParts = [t('nextRunTzLabel').replace('{tz}', tz), t('nextRunTzCaution')];
    if (notes.has('biweeklyApprox')) noteParts.push(t('nextRunBiweeklyNote'));
    if (notes.has('monthSkip')) noteParts.push(t('nextRunMonthSkipNote'));
    if (notes.has('yearSkip')) noteParts.push(t('nextRunYearSkipNote'));
    noteEl.textContent = noteParts.join(' ');
  }

  function renderCommandCard(container, parts, options = {}) {
    container.innerHTML = '';
    const tpl = document.getElementById('tpl-command-card');
    const node = tpl.content.cloneNode(true);
    const commandText = node.querySelector('.command-text');
    commandText.textContent = partsToString(parts); // textContent のみ使用(XSS対策)

    // テンプレートの静的文言は言語切替のたびに再クローンされるため、
    // ここで明示的に翻訳し直す(以前は初期HTMLの日本語のまま固定されていたバグを修正)
    node.querySelector('.command-card-label').textContent = t('generatedCommandLabel');

    const copyBtn = node.querySelector('.btn-copy');
    copyBtn.textContent = t('btnCopy');
    copyBtn.addEventListener('click', () => copyCommand(partsToString(parts), copyBtn));

    const openSlackBtn = node.querySelector('.btn-open-slack');
    openSlackBtn.textContent = t('btnOpenSlack');
    openSlackBtn.addEventListener('click', () => {
      window.open('https://app.slack.com/client', '_blank', 'noopener');
    });

    // Slackには「コマンドを貼り付け済みの状態で開く」ような公開のディープリンクが無いため、
    // 「開く→自分で貼り付ける」ことを前提に、OSに応じた貼り付けショートカットだけ案内する
    const pasteHintEl = node.querySelector('.paste-hint');
    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');
    pasteHintEl.textContent = isMac ? t('pasteHintMac') : t('pasteHintWin');

    const explainBtn = node.querySelector('.btn-explain');
    const explainBlock = node.querySelector('.explain-block');
    if (options.hideExplainToggle) {
      explainBtn.remove();
      explainBlock.remove();
    } else {
      explainBtn.textContent = t('btnExplain');
      explainBtn.setAttribute('aria-expanded', 'false');
      explainBtn.addEventListener('click', () => {
        const isHidden = explainBlock.classList.contains('is-hidden');
        if (isHidden) {
          explainCommand(parts, explainBlock);
          explainBlock.classList.remove('is-hidden');
          explainBtn.textContent = t('btnExplainClose');
          explainBtn.setAttribute('aria-expanded', 'true');
        } else {
          explainBlock.classList.add('is-hidden');
          explainBtn.textContent = t('btnExplain');
          explainBtn.setAttribute('aria-expanded', 'false');
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
        el('span', { class: 'explain-text', text: pick(part.desc) })
      ]);
      container.appendChild(step);
    });
  }

  /* ------------------------------------------------------------------ *
   * 4. コピー機能 (#7)
   * ------------------------------------------------------------------ */

  function copyCommand(text, btnEl) {
    const done = () => {
      showToast(t('toastCopied'));
      if (btnEl) {
        const original = btnEl.textContent;
        btnEl.textContent = t('toastCopiedShort');
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
    try { document.execCommand('copy'); done(); } catch (e) { showToast(t('toastCopyFailed')); }
    document.body.removeChild(ta);
  }

  /* ------------------------------------------------------------------ *
   * 5. 履歴管理 (#26, localStorage)
   * ------------------------------------------------------------------ */

  const LS_KEYS = {
    darkMode: 'srb_dark_mode',
    mode: 'srb_current_mode',
    form: 'srb_form_state',
    lang: 'srb_lang'
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
  const EN_WEEKDAY_SHORT_BY_INDEX = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let onceDatePickerCtrl = null;
  let yearDatePickerCtrl = null;

  // 日付ピッカーのトリガー表示テキストを言語に応じて整形する
  function formatFullDateDisplay(year, month, day) {
    const weekdayIdx = new Date(year, month - 1, day).getDay();
    if (currentLang === 'en') {
      return `${MONTH_EN[month - 1]} ${day}, ${year} (${EN_WEEKDAY_SHORT_BY_INDEX[weekdayIdx]})`;
    }
    return `${year}年${month}月${day}日(${JP_WEEKDAY_BY_INDEX[weekdayIdx]})`;
  }
  function formatMonthDayDisplay(month, day) {
    if (currentLang === 'en') return `${MONTH_EN[month - 1]} ${day}`;
    return `${month}月${day}日`;
  }

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
      const prevBtn = el('button', { class: 'cal-nav', attrs: { type: 'button', 'aria-label': t('calPrevMonth') }, text: '‹' });
      const label = el('span', { class: 'cal-label', text: currentLang === 'en' ? `${MONTH_EN[viewMonth - 1]} ${viewYear}` : `${viewYear}年${viewMonth}月` });
      const nextBtn = el('button', { class: 'cal-nav', attrs: { type: 'button', 'aria-label': t('calNextMonth') }, text: '›' });
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
      const weekdayRow = currentLang === 'en' ? EN_WEEKDAY_SHORT_BY_INDEX : JP_WEEKDAY_BY_INDEX;
      weekdayRow.forEach(w => grid.appendChild(el('div', { class: 'cal-weekday', text: w })));

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
        const dayBtn = el('button', {
          class: classes.join(' '),
          attrs: isSelected ? { type: 'button', 'aria-current': 'date' } : { type: 'button' },
          text: String(d)
        });
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
      triggerBtn.setAttribute('aria-expanded', 'true');
    }
    function closePopover(opts = {}) {
      const wasOpen = !popoverEl.classList.contains('is-hidden');
      popoverEl.classList.add('is-hidden');
      triggerBtn.setAttribute('aria-expanded', 'false');
      // Escキーで閉じた時だけ、トリガーボタンにフォーカスを戻す(キーボード操作で迷子にならないように)
      if (wasOpen && opts.returnFocus) triggerBtn.focus();
    }
    function togglePopover(e) {
      e.stopPropagation();
      if (triggerBtn.disabled) return;
      if (popoverEl.classList.contains('is-hidden')) openPopover(); else closePopover();
    }

    triggerBtn.setAttribute('aria-haspopup', 'dialog');
    triggerBtn.setAttribute('aria-expanded', 'false');
    if (popoverEl.id) triggerBtn.setAttribute('aria-controls', popoverEl.id);
    popoverEl.setAttribute('role', 'group');
    triggerBtn.addEventListener('click', togglePopover);
    document.addEventListener('click', (e) => {
      if (!popoverEl.contains(e.target) && e.target !== triggerBtn && !triggerBtn.contains(e.target)) closePopover();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePopover({ returnFocus: true });
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
    const mentionInsertRow = document.getElementById('mentionInsertRow');
    const mentionChips = document.querySelectorAll('.mention-chip');
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
    function populateNumberOptions(selectEl, count) {
      const prevValue = selectEl.value;
      selectEl.innerHTML = '';
      for (let i = 1; i <= count; i++) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = currentLang === 'en' ? `${i}${ordinalSuffix(i)}` : `${i}日`;
        selectEl.appendChild(opt);
      }
      if (prevValue) selectEl.value = prevValue;
    }
    populateNumberOptions(monthDaySelect, 31);

    // 「1回のみ」の日付ピッカー(年月日+曜日を表示)
    onceDatePickerCtrl = createCalendarPicker({
      triggerBtn: onceDateTrigger,
      triggerTextEl: onceDateTriggerText,
      popoverEl: onceDatePopover,
      mode: 'full',
      onSelect: (value) => {
        buildState.onceDate = `${value.year}-${pad2(value.month)}-${pad2(value.day)}`;
        onceDateTriggerText.textContent = formatFullDateDisplay(value.year, value.month, value.day);
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
        yearDateTriggerText.textContent = formatMonthDayDisplay(value.month, value.day);
        renderBuild();
      }
    });
    yearDatePickerCtrl.setSelected({ month: buildState.yearMonth || 1, day: buildState.yearDay || 1 });

    targetTypeBtns.forEach(btn => btn.addEventListener('click', () => {
      setPressedGroup(targetTypeBtns, b => b === btn);
      buildState.targetType = btn.dataset.target;
      targetChannelInput.classList.toggle('is-hidden', buildState.targetType !== 'channel');
      targetUserInput.classList.toggle('is-hidden', buildState.targetType !== 'user');
      mentionInsertRow.classList.toggle('is-hidden', buildState.targetType !== 'channel');
      if (buildState.targetType === 'channel' && !targetChannelInput.value) {
        targetChannelInput.value = '#';
      }
      if (buildState.targetType === 'user' && !targetUserInput.value) {
        targetUserInput.value = '@';
      }
      buildState.targetChannel = targetChannelInput.value;
      buildState.targetUser = targetUserInput.value;
      targetHint.textContent = buildState.targetType === 'channel'
        ? t('hintTargetChannel')
        : buildState.targetType === 'user'
          ? t('hintTargetUser')
          : t('hintTargetMe');
      renderBuild();
    }));

    mentionChips.forEach(chip => chip.addEventListener('click', () => {
      const mention = chip.dataset.mention;
      const alreadyPresent = new RegExp(`(^|\\s)${mention}(\\s|$)`).test(messageInput.value);
      if (alreadyPresent) {
        showToast(t('toastMentionAlreadyPresent').replace('{mention}', mention));
        return;
      }
      const start = messageInput.selectionStart != null ? messageInput.selectionStart : messageInput.value.length;
      const end = messageInput.selectionEnd != null ? messageInput.selectionEnd : messageInput.value.length;
      const before = messageInput.value.slice(0, start);
      const after = messageInput.value.slice(end);
      // 直前が空白や文頭でなければ、スペースを挟んでから挿入する
      const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
      const insertText = (needsLeadingSpace ? ' ' : '') + mention + ' ';
      messageInput.value = before + insertText + after;
      const caretPos = (before + insertText).length;
      messageInput.focus();
      messageInput.setSelectionRange(caretPos, caretPos);
      buildState.message = messageInput.value;
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
        ? t('weekdayPickerLabelBiweekly')
        : t('weekdayPickerLabelWeek');
      monthDayPicker.classList.toggle('is-hidden', type !== 'month');
      yearDatePicker.classList.toggle('is-hidden', type !== 'year');
    }

    scheduleBtns.forEach(btn => btn.addEventListener('click', () => {
      setPressedGroup(scheduleBtns, b => b === btn);
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
      setPressed(chip, !chip.classList.contains('is-active'));
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

    const mentionInsertHintEl = document.getElementById('mentionInsertHint');
    // メッセージ内に同じ特殊メンションが2回以上「単語として」出現していないか調べる。
    // トークン単位の完全一致で判定するため、「@hereford」のような文字列の一部を誤検知しない。
    function findDuplicateMention(message) {
      const tokens = (message || '').split(/\s+/);
      const mentions = ['@here', '@channel', '@everyone'];
      for (const m of mentions) {
        const count = tokens.filter(tok => tok === m).length;
        if (count >= 2) return m;
      }
      return null;
    }

    function updateMentionHint() {
      const channelName = (buildState.targetType === 'channel' ? buildState.targetChannel : '').replace(/^#+/, '').toLowerCase();
      const dupMention = findDuplicateMention(buildState.message);
      const hasEveryone = /@everyone\b/i.test(buildState.message || '');
      if (dupMention) {
        mentionInsertHintEl.textContent = t('mentionDuplicateWarning').replace('{mention}', dupMention);
        mentionInsertHintEl.classList.add('is-warning');
      } else if (hasEveryone && channelName !== 'general') {
        mentionInsertHintEl.textContent = t('mentionEveryoneWarning');
        mentionInsertHintEl.classList.add('is-warning');
      } else {
        mentionInsertHintEl.textContent = t('mentionInsertHint');
        mentionInsertHintEl.classList.remove('is-warning');
      }
    }

    function renderBuild() {
      messageError.textContent = '';
      updateMentionHint();
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
        liveExplainBlock.appendChild(el('p', { class: 'empty-note', text: t('explainPlaceholder') }));
        document.getElementById('nextRunList').innerHTML = '';
        document.getElementById('nextRunList').appendChild(el('p', { class: 'empty-note', text: t('nextRunEmptyNote') }));
        document.getElementById('nextRunNote').textContent = '';
        return;
      }
      renderCommandCard(output, result.parts, { hideExplainToggle: true });
      explainCommand(result.parts, liveExplainBlock);
      renderNextRunPreview(buildState);
      persistFormState();
    }

    // 復元されたフォーム状態があれば、日付ピッカーの表示にも反映する
    if (buildState.onceDate) {
      const [y, m, d] = buildState.onceDate.split('-').map(Number);
      const parsed = new Date(y, (m || 1) - 1, d || 1);
      if (!isNaN(parsed.getTime())) {
        onceDateTriggerText.textContent = formatFullDateDisplay(y, m, d);
        onceDateTriggerText.classList.remove('is-placeholder');
        onceDatePickerCtrl.setSelected({ year: y, month: m, day: d });
      }
    }
    monthDaySelect.value = String(buildState.monthDay || 1);
    yearDateTriggerText.textContent = formatMonthDayDisplay(buildState.yearMonth || 1, buildState.yearDay || 1);

    // --- よく使うテンプレート ---
    function applyTemplate(tpl) {
      // 宛先
      buildState.targetType = tpl.targetType;
      setPressedGroup(targetTypeBtns, b => b.dataset.target === tpl.targetType);
      targetChannelInput.classList.toggle('is-hidden', tpl.targetType !== 'channel');
      targetUserInput.classList.toggle('is-hidden', tpl.targetType !== 'user');
      mentionInsertRow.classList.toggle('is-hidden', tpl.targetType !== 'channel');
      if (tpl.targetType === 'channel') {
        targetChannelInput.value = tpl.targetChannel || '#';
        buildState.targetChannel = targetChannelInput.value;
      } else if (tpl.targetType === 'user') {
        targetUserInput.value = tpl.targetUser || '@';
        buildState.targetUser = targetUserInput.value;
      }
      targetHint.textContent = tpl.targetType === 'channel'
        ? t('hintTargetChannel')
        : tpl.targetType === 'user'
          ? t('hintTargetUser')
          : t('hintTargetMe');

      // メッセージ
      messageInput.value = pick(tpl.message);
      buildState.message = pick(tpl.message);

      // 実行タイミング
      buildState.scheduleType = tpl.scheduleType;
      setPressedGroup(scheduleBtns, b => b.dataset.schedule === tpl.scheduleType);
      onceBlock.classList.toggle('is-hidden', tpl.scheduleType !== 'once');
      repeatBlock.classList.toggle('is-hidden', tpl.scheduleType !== 'repeat');

      if (tpl.scheduleType === 'repeat') {
        buildState.repeatType = tpl.repeatType;
        repeatTypeSelect.value = tpl.repeatType;

        buildState.weekdays = tpl.weekdays ? [...tpl.weekdays] : [];
        setPressedGroup(dayChips, chip => buildState.weekdays.includes(chip.dataset.day));

        if (tpl.monthDay) {
          buildState.monthDay = tpl.monthDay;
          monthDaySelect.value = String(tpl.monthDay);
        }
        if (tpl.yearMonth && tpl.yearDay) {
          buildState.yearMonth = tpl.yearMonth;
          buildState.yearDay = tpl.yearDay;
          yearDateTriggerText.textContent = formatMonthDayDisplay(tpl.yearMonth, tpl.yearDay);
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
      showToast(t('toastTemplateApplied').replace('{label}', pick(tpl.label)));
    }

    const templateListEl = document.getElementById('templateList');
    function renderTemplateList() {
      templateListEl.innerHTML = '';
      QUICK_TEMPLATES.forEach(tpl => {
        const item = el('button', { class: 'template-item', attrs: { type: 'button' } }, [
          el('span', { class: 'template-item-icon', text: tpl.icon }),
          el('span', { class: 'template-item-label', text: pick(tpl.label) }),
          el('span', { class: 'template-item-meta', text: pick(tpl.meta) })
        ]);
        item.addEventListener('click', () => applyTemplate(tpl));
        templateListEl.appendChild(item);
      });
    }
    renderTemplateList();

    // 初期表示時点でも aria-pressed が正しい状態になるよう同期する
    setPressedGroup(targetTypeBtns, b => b.classList.contains('is-active'));
    setPressedGroup(scheduleBtns, b => b.classList.contains('is-active'));

    updateRepeatSubFieldsVisibility();
    updateScheduleAvailability();
    renderBuild();

    refreshBuildUI = () => {
      // targetHint は data-i18n による静的な再翻訳(チャンネル用の文言)で
      // 上書きされてしまうため、現在選択中の宛先タイプに応じて再設定する
      targetHint.textContent = buildState.targetType === 'channel'
        ? t('hintTargetChannel')
        : buildState.targetType === 'user'
          ? t('hintTargetUser')
          : t('hintTargetMe');

      // 日付ピッカー・毎月の日にちセレクトを現在の言語で再描画する(選択値は維持)
      populateNumberOptions(monthDaySelect, 31);
      monthDaySelect.value = String(buildState.monthDay || 1);
      if (buildState.onceDate) {
        const [y, m, d] = buildState.onceDate.split('-').map(Number);
        onceDateTriggerText.textContent = formatFullDateDisplay(y, m, d);
      } else {
        onceDateTriggerText.textContent = t('datePickerPlaceholder');
      }
      yearDateTriggerText.textContent = formatMonthDayDisplay(buildState.yearMonth || 1, buildState.yearDay || 1);

      renderTemplateList();
      renderBuild();
    };
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
    document.querySelectorAll('.day-chip').forEach(c => setPressed(c, false));
    document.querySelectorAll('#targetType .seg-btn').forEach((b, i) => setPressed(b, i === 0));
    document.querySelectorAll('#scheduleType .seg-btn').forEach((b, i) => setPressed(b, i === 0));
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
      item.appendChild(el('span', { class: 'sample-label', text: pick(sample.label) }));
      item.appendChild(document.createTextNode(pick(sample.text)));
      item.addEventListener('click', () => onPick(pick(sample.text)));
      container.appendChild(item);
    });
  }

  /* ------------------------------------------------------------------ *
   * 8. 学習モード:「コマンドを学ぶ」
   * ------------------------------------------------------------------ */

  const DECOMPOSE_EXAMPLE = [
    { type: 'command', text: '/remind', desc: TOKEN_DESC.command },
    { type: 'target', text: '#general', desc: TOKEN_DESC.target },
    { type: 'message', text: { ja: '"会議資料を確認"', en: '"review meeting notes"' }, desc: TOKEN_DESC.message },
    { type: 'frequency', text: 'every Monday', desc: { ja: '毎週月曜日に繰り返す、という意味です。', en: 'Means it repeats every Monday.' } },
    { type: 'time', text: 'at 09:00', desc: TOKEN_DESC.time }
  ];

  const DECOMPOSE_LABEL = {
    command: 'tokenLabelCommand', target: 'tokenLabelTarget', message: 'tokenLabelMessage',
    frequency: 'tokenLabelFrequency', time: 'tokenLabelTime'
  };

  function initLearnMode() {
    const row = document.getElementById('decomposeRow');
    const detail = document.getElementById('decomposeDetail');
    const sourceTextEl = document.getElementById('decomposeSourceText');
    const cardsContainer = document.getElementById('grammarCards');
    const dictTable = document.getElementById('dictTable');
    const dictDetail = document.getElementById('dictDetail');

    // --- コマンド分解 ---
    function renderDecompose() {
      sourceTextEl.textContent = DECOMPOSE_EXAMPLE.map(p => pick(p.text)).join(' ');
      row.innerHTML = '';
      detail.innerHTML = '';
      detail.appendChild(el('p', { class: 'empty-note', text: t('decomposeEmptyNote') }));

      DECOMPOSE_EXAMPLE.forEach(part => {
        const chip = el('button', {
          class: 'decompose-chip',
          attrs: {
            type: 'button',
            'data-token': part.type,
            'aria-pressed': 'false',
            'aria-label': `${t(DECOMPOSE_LABEL[part.type])}: ${pick(part.text)}`
          },
          text: pick(part.text)
        });
        chip.addEventListener('click', () => {
          row.querySelectorAll('.decompose-chip').forEach(c => {
            c.classList.remove('is-selected');
            c.setAttribute('aria-pressed', 'false');
          });
          chip.classList.add('is-selected');
          chip.setAttribute('aria-pressed', 'true');
          detail.innerHTML = '';
          detail.appendChild(el('strong', { text: `${pick(part.text)} → ${t(DECOMPOSE_LABEL[part.type])}` }));
          detail.appendChild(el('span', { text: pick(part.desc) }));
        });
        row.appendChild(chip);
      });
    }

    // --- 文法カード ---
    function renderGrammarCards() {
      cardsContainer.innerHTML = '';
      GRAMMAR_CARDS.forEach(card => {
        cardsContainer.appendChild(el('div', { class: 'grammar-card' }, [
          el('div', { class: 'grammar-syntax', text: card.syntax }),
          el('div', { class: 'grammar-meaning', text: pick(card.meaning) }),
          el('code', { class: 'grammar-example', text: card.example })
        ]));
      });
    }

    // --- 文法辞典 ---
    function renderGrammarDict() {
      dictTable.innerHTML = '';
      dictDetail.classList.remove('is-visible');
      dictDetail.textContent = '';
      if (!dictDetail.id) dictDetail.id = 'dictDetail';
      GRAMMAR_DICT.forEach(entry => {
        const rowBtn = el('button', {
          class: 'dict-row',
          attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': dictDetail.id }
        }, [
          el('span', { class: 'dict-syntax', text: entry.syntax }),
          el('span', { class: 'dict-meaning', text: pick(entry.meaning) })
        ]);
        rowBtn.addEventListener('click', () => {
          dictTable.querySelectorAll('.dict-row').forEach(r => r.setAttribute('aria-expanded', 'false'));
          rowBtn.setAttribute('aria-expanded', 'true');
          dictDetail.textContent = pick(entry.detail);
          dictDetail.classList.add('is-visible');
        });
        dictTable.appendChild(rowBtn);
      });
    }

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
        { value: 'day', jaSuffix: '毎日' },
        { value: 'weekday', jaSuffix: '平日' },
        { value: 'Monday', jaSuffix: '月曜日' },
        { value: 'Tuesday', jaSuffix: '火曜日' },
        { value: 'Wednesday', jaSuffix: '水曜日' },
        { value: 'Thursday', jaSuffix: '木曜日' },
        { value: 'Friday', jaSuffix: '金曜日' },
        { value: 'Saturday', jaSuffix: '土曜日' },
        { value: 'Sunday', jaSuffix: '日曜日' }
      ],
      next: [
        { value: 'Monday', jaSuffix: '月曜日' },
        { value: 'Tuesday', jaSuffix: '火曜日' },
        { value: 'Wednesday', jaSuffix: '水曜日' },
        { value: 'Thursday', jaSuffix: '木曜日' },
        { value: 'Friday', jaSuffix: '金曜日' },
        { value: 'Saturday', jaSuffix: '土曜日' },
        { value: 'Sunday', jaSuffix: '日曜日' }
      ],
      in: [
        { value: '15 minutes', jaSuffix: '15分後' },
        { value: '30 minutes', jaSuffix: '30分後' },
        { value: '1 hour', jaSuffix: '1時間後' },
        { value: '2 hours', jaSuffix: '2時間後' }
      ],
      at: [] // at は時刻だけで完結するため2つ目のセレクトは使わない
    };

    function populateDayOptions(keyword) {
      const options = DAY_OPTIONS_BY_KEYWORD[keyword] || [];
      const prevValue = buildDay.value;
      buildDay.innerHTML = '';
      options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = currentLang === 'en' ? opt.value : `${opt.value}(${opt.jaSuffix})`;
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
      const isEn = currentLang === 'en';

      // 「in」のときは時刻(at HH:MM)を使わないので非表示にする
      buildTimeWrap.classList.toggle('is-hidden', kw === 'in');

      if (kw === 'in') {
        const value = dayVal || '30 minutes';
        phrase = `in ${value}`;
        meaning = isEn ? `Runs in ${durationToLocale(value)}` : `${durationToLocale(value)}後に実行`;
      } else if (kw === 'at') {
        phrase = `at ${time}`;
        meaning = isEn ? `Runs at ${timeToLocale(time)}` : `${timeToLocale(time)}に実行`;
      } else if (kw === 'next') {
        const dayLabel = dayVal || 'Monday';
        phrase = `next ${dayLabel} at ${time}`;
        meaning = isEn ? `Runs next ${dayEnToLocaleFull(dayLabel)} at ${timeToLocale(time)}` : `次の${dayEnToLocaleFull(dayLabel)}の${timeToLocale(time)}に実行`;
      } else {
        // every
        if (dayVal === 'day') {
          phrase = `every day at ${time}`;
          meaning = isEn ? `Runs every day at ${timeToLocale(time)}` : `毎日${timeToLocale(time)}に実行`;
        } else if (dayVal === 'weekday') {
          phrase = `every weekday at ${time}`;
          meaning = isEn ? `Runs every weekday at ${timeToLocale(time)}` : `平日毎日${timeToLocale(time)}に実行`;
        } else {
          const dayLabel = dayVal || 'Monday';
          phrase = `every ${dayLabel} at ${time}`;
          meaning = isEn ? `Runs every ${dayEnToLocaleFull(dayLabel)} at ${timeToLocale(time)}` : `毎週${dayEnToLocaleFull(dayLabel)}の${timeToLocale(time)}に実行`;
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
    refreshLearnUI = () => {
      renderDecompose();
      renderGrammarCards();
      renderGrammarDict();
      updateBuilderPhrase();
    };
    refreshLearnUI();
  }

  function dayEnToLocaleFull(enDay) {
    if (currentLang === 'en') return enDay;
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

  // ---- 英語版の自然文解析ヘルパー ----

  function stripFillerWordsEN(str) {
    let s = (str || '').trim();
    for (let i = 0; i < 3; i++) {
      const before = s;
      s = s.replace(/^(please\s+)?remind\s+me\s+to\s+/i, '');
      s = s.replace(/^(please|to|that|for)\s+/i, '');
      s = s.replace(/^[,.\s]+/, '');
      s = s.replace(/[,.\s]+$/, '');
      if (s === before) break;
    }
    return s.replace(/\s{2,}/g, ' ').trim();
  }

  // 時刻表現を抽出する(英語)。「at」が前についていれば一緒に取り除く。
  function extractTimeEN(text) {
    let m;
    if ((m = text.match(/\b(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)\b/i))) {
      let h = parseInt(m[1], 10) % 12;
      if (/pm/i.test(m[3])) h += 12;
      return { hour: h, minute: parseInt(m[2], 10), matchText: m[0] };
    }
    if ((m = text.match(/\b(?:at\s+)?(\d{1,2})\s*(am|pm)\b/i))) {
      let h = parseInt(m[1], 10) % 12;
      if (/pm/i.test(m[2])) h += 12;
      return { hour: h, minute: 0, matchText: m[0] };
    }
    if ((m = text.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/))) {
      return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10), matchText: m[0] };
    }
    return null;
  }

  // 頻度・曜日・相対表現を抽出する(英語)
  function extractFrequencyEN(text) {
    let m;
    const DAY = '(monday|tuesday|wednesday|thursday|friday|saturday|sunday)';
    if ((m = text.match(new RegExp(`\\bevery\\s+${DAY}\\b`, 'i')))) {
      return { kind: 'every-weekday', dayKey: EN_DAY_WORD_TO_KEY[m[1].toLowerCase()], matchText: m[0] };
    }
    if ((m = text.match(new RegExp(`\\bnext\\s+${DAY}\\b`, 'i')))) {
      return { kind: 'next-weekday', dayKey: EN_DAY_WORD_TO_KEY[m[1].toLowerCase()], matchText: m[0] };
    }
    if ((m = text.match(/\bevery\s+week\b/i))) {
      return { kind: 'every-week', matchText: m[0] };
    }
    if ((m = text.match(/\bevery\s+(?:day|morning|evening|night)\b/i))) {
      return { kind: 'every-day', matchText: m[0] };
    }
    if ((m = text.match(/\bevery\s+weekday\b|\bon\s+weekdays\b|\bweekdays\b/i))) {
      return { kind: 'every-weekday-generic', matchText: m[0] };
    }
    if ((m = text.match(/\bevery\s+month\b/i))) {
      return { kind: 'every-month', matchText: m[0] };
    }
    if ((m = text.match(/\bevery\s+year\b/i))) {
      return { kind: 'every-year', matchText: m[0] };
    }
    if ((m = text.match(/\bin\s+(\d+)\s*(?:minutes?|mins?)\b/i))) {
      return { kind: 'in-minutes', value: parseInt(m[1], 10), matchText: m[0] };
    }
    if ((m = text.match(/\bin\s+(\d+)\s*(?:hours?|hrs?)\b/i))) {
      return { kind: 'in-hours', value: parseInt(m[1], 10), matchText: m[0] };
    }
    if ((m = text.match(/\bday after tomorrow\b/i))) {
      return { kind: 'in-2-days', matchText: m[0] };
    }
    if ((m = text.match(/\btomorrow\b/i))) {
      return { kind: 'tomorrow', matchText: m[0] };
    }
    if ((m = text.match(/\btoday\b/i))) {
      return { kind: 'today', matchText: m[0] };
    }
    if ((m = text.match(new RegExp(`\\b${DAY}\\b`, 'i')))) {
      return { kind: 'bare-weekday', dayKey: EN_DAY_WORD_TO_KEY[m[1].toLowerCase()], matchText: m[0] };
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
          freqLabel = '次回'; weekdayLabel = dayEnToLocaleFull(en);
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
          freqLabel = '1回のみ'; weekdayLabel = dayEnToLocaleFull(en);
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

  // ---- 英語版: 自然文から作成(#18の英語対応) ----
  function parseNaturalLanguageEN(rawInput, explicitTarget) {
    const input = (rawInput || '').trim();
    if (!input) return { ok: false, reason: 'empty' };

    let target = 'me';
    let textAfterTarget = input;
    if (explicitTarget && explicitTarget.type !== 'me' && explicitTarget.value && explicitTarget.value.length > 1) {
      target = explicitTarget.value;
    } else {
      const channelMatch = input.match(/#([a-zA-Z0-9_-]+)/);
      if (channelMatch) {
        target = `#${channelMatch[1]}`;
        textAfterTarget = input.replace(channelMatch[0], '');
      }
    }

    // 1. 時刻を抽出して取り除く("at"も一緒に)
    const timeMatch = extractTimeEN(textAfterTarget);
    let textAfterTime = textAfterTarget;
    if (timeMatch) {
      textAfterTime = textAfterTarget.replace(timeMatch.matchText, ' ');
    }

    // 2. 頻度・曜日・相対表現を抽出して取り除く
    const freqMatch = extractFrequencyEN(textAfterTime);
    let remainder = textAfterTime;
    if (freqMatch) {
      remainder = remainder.replace(freqMatch.matchText, ' ');
    }

    // 3. 残りをメッセージとして整形
    const message = stripFillerWordsEN(remainder);

    if (!freqMatch && !timeMatch) {
      return { ok: false, reason: 'ambiguous', message: stripFillerWordsEN(remainder || input) };
    }
    if (!message) {
      return { ok: false, reason: 'no-message', message: '' };
    }

    const time = timeMatch ? formatTime(timeMatch.hour, timeMatch.minute) : null;
    let fragment = '';
    let freqLabel = t('freqOnce');
    let weekdayLabel = '-';

    if (freqMatch) {
      switch (freqMatch.kind) {
        case 'every-weekday':
          fragment = `every ${WEEKDAY_JA_TO_EN[freqMatch.dayKey]}` + (time ? ` at ${time}` : '');
          freqLabel = t('freqEveryWeek'); weekdayLabel = WEEKDAY_JA_TO_EN[freqMatch.dayKey];
          break;
        case 'next-weekday': {
          const en = WEEKDAY_JA_TO_EN[freqMatch.dayKey];
          fragment = `next ${en}` + (time ? ` at ${time}` : '');
          freqLabel = t('freqNext'); weekdayLabel = en;
          break;
        }
        case 'every-week':
          fragment = 'every week' + (time ? ` at ${time}` : '');
          freqLabel = t('freqEveryWeek');
          break;
        case 'every-day':
          fragment = 'every day' + (time ? ` at ${time}` : '');
          freqLabel = t('freqEveryDay');
          break;
        case 'every-weekday-generic':
          fragment = 'every weekday' + (time ? ` at ${time}` : '');
          freqLabel = t('freqEveryWeekdayGeneric');
          break;
        case 'every-month':
          fragment = 'every month' + (time ? ` at ${time}` : '');
          freqLabel = t('freqEveryMonth');
          break;
        case 'every-year':
          fragment = 'every year' + (time ? ` at ${time}` : '');
          freqLabel = t('freqEveryYear');
          break;
        case 'in-minutes':
          fragment = `in ${freqMatch.value} minutes`;
          freqLabel = t('freqRelative'); weekdayLabel = `${freqMatch.value}${t('minutesLater')}`;
          break;
        case 'in-hours':
          fragment = `in ${freqMatch.value} hours`;
          freqLabel = t('freqRelative'); weekdayLabel = `${freqMatch.value}${t('hoursLater')}`;
          break;
        case 'in-2-days':
          fragment = 'in 2 days' + (time ? ` at ${time}` : '');
          freqLabel = t('freqOnce'); weekdayLabel = t('labelDayAfterTomorrow');
          break;
        case 'tomorrow':
          fragment = 'tomorrow' + (time ? ` at ${time}` : '');
          freqLabel = t('freqOnce'); weekdayLabel = t('labelTomorrow');
          break;
        case 'today':
          fragment = 'today' + (time ? ` at ${time}` : '');
          freqLabel = t('freqOnce'); weekdayLabel = t('labelToday');
          break;
        case 'bare-weekday': {
          const en = WEEKDAY_JA_TO_EN[freqMatch.dayKey];
          fragment = `${en}` + (time ? ` at ${time}` : '');
          freqLabel = t('freqOnce'); weekdayLabel = en;
          break;
        }
        default:
          fragment = time ? `today at ${time}` : 'today';
      }
    } else if (time) {
      fragment = `today at ${time}`;
      freqLabel = t('freqOnce'); weekdayLabel = t('labelToday');
    }

    const parts = [
      { type: 'command', text: '/remind', desc: TOKEN_DESC.command },
      { type: 'target', text: target, desc: target === 'me' ? TARGET_DESC.me : (target.startsWith('#') ? TARGET_DESC.channel : TARGET_DESC.user) },
      { type: 'message', text: `"${message}"`, desc: TOKEN_DESC.message },
      { type: 'frequency', text: fragment, desc: { ja: '入力された英語から自動的に読み取った実行タイミングです。', en: 'The timing automatically parsed from your English sentence.' } }
    ];

    return {
      ok: true,
      parts,
      message,
      freqLabel,
      weekdayLabel,
      timeLabel: time ? time : `09:00${t('defaultValueSuffix')}`
    };
  }

  // 将来 AI API に差し替えるためのフック(#18)
  // 例: window.parseNaturalLanguageImpl = parseNaturalLanguageWithAI;
  function parseNaturalLanguageEntry(text, explicitTarget) {
    if (typeof window.parseNaturalLanguageImpl === 'function') {
      return window.parseNaturalLanguageImpl(text, explicitTarget);
    }
    return currentLang === 'en'
      ? parseNaturalLanguageEN(text, explicitTarget)
      : parseNaturalLanguage(text, explicitTarget);
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

    naturalTargetState.type = 'channel';
    setPressedGroup(targetTypeBtns, b => b.classList.contains('is-active'));

    targetTypeBtns.forEach(btn => btn.addEventListener('click', () => {
      setPressedGroup(targetTypeBtns, b => b === btn);
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
        showToast(t('naturalCouldNotParse'));
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
      const subject = message || originalText;
      clarifyText.textContent = `${t('naturalAmbiguousPrefix')}${subject}${t('naturalAmbiguousSuffix')}`;
      clarifyOptions.innerHTML = '';

      const options = currentLang === 'en' ? [
        { label: t('clarifyDaily'), build: () => `every day at 9am ${subject}` },
        { label: t('clarifyTomorrow'), build: () => `tomorrow at 9am ${subject}` },
        { label: t('clarifyWeekly'), build: () => `every Monday at 9am ${subject}` },
        { label: t('clarifySpecify'), build: null }
      ] : [
        { label: t('clarifyDaily'), build: () => `毎日9時に${subject}` },
        { label: t('clarifyTomorrow'), build: () => `明日9時に${subject}` },
        { label: t('clarifyWeekly'), build: () => `毎週月曜日の9時に${subject}` },
        { label: t('clarifySpecify'), build: null }
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
            buildState.message = subject;
            switchMode('build');
            document.getElementById('messageInput').value = buildState.message;
            document.getElementById('messageInput').dispatchEvent(new Event('input'));
            showToast(t('toastSwitchToBuild'));
          }
        });
        clarifyOptions.appendChild(btn);
      });
    }

    function renderResult(result) {
      resultCard.style.display = 'block';
      parseResult.innerHTML = '';

      const cells = [
        { label: t('parseCellFreq'), value: result.freqLabel },
        { label: t('parseCellDay'), value: result.weekdayLabel || '-' },
        { label: t('parseCellTime'), value: result.timeLabel },
        { label: t('parseCellMessage'), value: result.message }
      ];
      cells.forEach(c => {
        parseResult.appendChild(el('div', { class: 'parse-cell' }, [
          el('div', { class: 'parse-cell-label', text: c.label }),
          el('div', { class: 'parse-cell-value', text: c.value })
        ]));
      });

      renderCommandCard(naturalOutput, result.parts);
    }

    refreshNaturalUI = () => {
      renderSampleList('sampleListNatural', (text) => {
        input.value = text;
        runParse(text);
      });
      // 表示中の解析結果・確認カードは切り替え前の言語の内容なので、
      // 誤解を防ぐためいったん隠す(入力テキスト自体はそのまま残す)
      clarifyCard.style.display = 'none';
      resultCard.style.display = 'none';
    };
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
   * 12. 言語切替 (JA / EN)
   * ------------------------------------------------------------------ */

  function initLanguageToggle() {
    const toggle = document.getElementById('langToggle');
    const options = toggle.querySelectorAll('.lang-toggle-option');

    function updateToggleVisual() {
      options.forEach(o => o.classList.toggle('is-active', o.dataset.langOpt === currentLang));
      toggle.setAttribute('aria-label', t('langToggleAriaLabelCurrent'));
    }
    updateToggleVisual();

    toggle.addEventListener('click', () => {
      currentLang = currentLang === 'ja' ? 'en' : 'ja';
      try { localStorage.setItem(LS_KEYS.lang, currentLang); } catch (e) { /* noop */ }
      updateToggleVisual();
      applyStaticTranslations();
      if (refreshBuildUI) refreshBuildUI();
      if (refreshLearnUI) refreshLearnUI();
      if (refreshNaturalUI) refreshNaturalUI();
    });
  }

  /* ------------------------------------------------------------------ *
   * 13. 初期化
   * ------------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', () => {
    // 言語設定は他のどの描画よりも先に確定させる(最初の描画から正しい言語にするため)
    try { currentLang = localStorage.getItem(LS_KEYS.lang) || 'ja'; } catch (e) { /* noop */ }
    applyStaticTranslations();

    purgeLegacyHistory();
    loadFormState();
    initModeTabs();
    initDarkMode();
    initBuildMode();
    initLearnMode();
    initNaturalMode();
    initLanguageToggle();
  });

})();
