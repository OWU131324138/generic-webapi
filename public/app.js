(() => {
  const STORAGE = { favorites: 'excuse-maker.favorites.v1', history: 'excuse-maker.history.v1' };
  const VALID_VIEWS = new Set(['home', 'create', 'results', 'favorites', 'history']);
  const root = document.getElementById('viewRoot');
  const toast = document.getElementById('toast');
  const state = {
    view: VALID_VIEWS.has(location.hash.slice(1)) ? location.hash.slice(1) : 'home',
    favorites: readList(STORAGE.favorites),
    history: readList(STORAGE.history),
    results: [],
    lastForm: null,
    selectedType: '',
    loading: false,
    retrying: new Set(),
    error: '',
  };
  let toastTimer;

  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string' && typeof item.text === 'string') : [];
    } catch { return []; }
  }
  function persist(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { showToast('保存できませんでした。ブラウザの保存容量をご確認ください'); return false; }
  }
  function makeId() {
    return globalThis.crypto?.randomUUID?.() || `writing-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
  }
  function go(view, type = '') {
    if (!VALID_VIEWS.has(view)) return;
    state.view = view;
    if (view === 'create' && type) state.selectedType = type;
    state.error = '';
    if (location.hash !== `#${view}`) history.pushState(null, '', `#${view}`);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function actionButton(label, action, id, className = 'icon-btn', extra = {}) {
    const button = element('button', className, label);
    button.type = 'button';
    button.dataset.action = action;
    if (id) button.dataset.id = id;
    for (const [key, value] of Object.entries(extra)) button.dataset[key] = value;
    return button;
  }
  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  }
  function favoriteHas(id) { return state.favorites.some(item => item.id === id); }
  function saveHistory(item) {
    state.history.unshift(item);
    state.history = state.history.slice(0, 100);
    persist(STORAGE.history, state.history);
  }
  function errorBlock(message) {
    if (!message) return null;
    const box = element('div', 'error-message', message);
    box.setAttribute('role', 'alert');
    return box;
  }
  function addError(parent) {
    const box = errorBlock(state.error);
    if (box) parent.append(box);
  }
  function createEmpty(icon, title, message) {
    const box = element('div', 'empty-state');
    box.append(element('div', 'empty-icon', icon), element('h2', '', title), element('p', '', message));
    return box;
  }

  function renderHome() {
    root.innerHTML = `
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Words, made easier</span>
          <h1>伝えたいことを、<br><span>文章</span>にしよう。</h1>
          <p>メールやSNSのお知らせ、自己紹介まで。用途と伝えたい内容を入れるだけで、すぐ使える文章を3案つくります。</p>
          <div class="hero-actions">
            <button class="primary-btn" data-view="create">✏️ 文章を作る <span aria-hidden="true">→</span></button>
            <button class="secondary-btn" data-view="history">◷ 作った文章を見る</button>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="speech-bubble"><span class="bubble-label">文章づくりをお手伝い</span><p>うまく言葉にできない気持ちも、伝わる形に。</p><span class="bubble-stars">✨</span></div>
          <div class="hero-orbit">✍️</div>
        </div>
      </section>
      <div class="section-heading"><div><span class="eyebrow">Start with a purpose</span><h2>作りたい文章を選ぶ</h2><p>選んだ用途はあとから自由に調整できます。</p></div></div>
      <section class="feature-grid" aria-label="文章の種類">
        <button class="feature-card type-card" data-view="create" data-type="メール"><span class="feature-icon">✉️</span><h3>メール</h3><p>仕事や学校の連絡、お礼、お詫びに。</p></button>
        <button class="feature-card type-card" data-view="create" data-type="SNS投稿"><span class="feature-icon">📣</span><h3>SNS・告知</h3><p>イベント告知やお店のお知らせに。</p></button>
        <button class="feature-card type-card" data-view="create" data-type="自己紹介"><span class="feature-icon">🙋</span><h3>自己紹介</h3><p>自分らしさが伝わる紹介文に。</p></button>
      </section>
      <section class="feature-grid secondary-feature-grid" aria-label="その他の文章">
        <button class="feature-card type-card" data-view="create" data-type="挨拶・スピーチ"><span class="feature-icon">🎤</span><h3>挨拶・スピーチ</h3><p>お祝いの言葉や短いスピーチに。</p></button>
        <button class="feature-card type-card" data-view="create" data-type="説明文・レポート"><span class="feature-icon">📝</span><h3>説明文・レポート</h3><p>伝わりやすく整理した文章に。</p></button>
        <button class="feature-card type-card" data-view="create" data-type="自由作成"><span class="feature-icon">💡</span><h3>自由に作る</h3><p>用途を決めず、書きたい内容から。</p></button>
      </section>`;
  }

  function renderCreate() {
    root.innerHTML = `
      <div class="page-heading"><span class="eyebrow">Create your text</span><h1>文章を作る</h1><p>用途と伝えたいことを教えてください。雰囲気の違う3案を提案します。</p></div>
      <form class="form-panel" id="writingForm">
        <div class="form-grid">
          <div class="field">
            <label for="writingType">どんな文章を作る？</label>
            <select id="writingType" name="type" required>
              <option value="メール">メール</option><option value="SNS投稿">SNS投稿</option><option value="お知らせ・案内">お知らせ・案内</option><option value="自己紹介">自己紹介</option><option value="挨拶・スピーチ">挨拶・スピーチ</option><option value="説明文・レポート">説明文・レポート</option><option value="お礼・お詫び">お礼・お詫び</option><option value="自由作成">自由作成</option>
            </select>
          </div>
          <div class="field">
            <label for="audience">誰に向けた文章？ <span class="optional">任意</span></label>
            <input id="audience" name="audience" maxlength="100" placeholder="例：取引先、友人、SNSのフォロワー">
          </div>
          <div class="field field-full">
            <label for="topic">何を伝えたい？</label>
            <textarea id="topic" name="topic" maxlength="500" required placeholder="例：来週の打ち合わせを木曜の午後に変更したい。急なお願いへのお詫びも添えたい。"></textarea>
            <p class="help">箇条書きでも大丈夫です。入れてほしい情報や伝える目的を書いてください。</p>
          </div>
          <div class="field">
            <label for="tone">文章の雰囲気</label>
            <select id="tone" name="tone" required>
              <option value="丁寧でフォーマル">丁寧でフォーマル</option><option value="自然で親しみやすい" selected>自然で親しみやすい</option><option value="簡潔で要点が伝わる">簡潔で要点が伝わる</option><option value="明るく前向き">明るく前向き</option><option value="やわらかく気遣いのある">やわらかく気遣いのある</option><option value="印象的で個性的">印象的で個性的</option>
            </select>
          </div>
          <div class="field">
            <label for="length">文章の長さ</label>
            <select id="length" name="length" required><option value="短め">短め</option><option value="標準" selected>標準</option><option value="長め">長め</option></select>
          </div>
          <div class="field field-full">
            <label for="details">追加の希望 <span class="optional">任意</span></label>
            <input id="details" name="details" maxlength="300" placeholder="例：絵文字を使わない、件名もつける、最後に問い合わせ先を入れる">
          </div>
        </div>
        <div class="form-submit"><button class="primary-btn btn-wide" id="generateButton" type="submit">✨ 文章を3案作る</button></div>
      </form>`;
    const typeSelect = root.querySelector('#writingType');
    if (state.selectedType && [...typeSelect.options].some(option => option.value === state.selectedType)) typeSelect.value = state.selectedType;
  }

  function resultCard(item, index) {
    const card = element('article', 'result-card');
    const top = element('div', 'result-top');
    top.append(element('span', 'result-number', `OPTION 0${index + 1}`));
    if (item.label) top.append(element('span', 'result-tag', item.label));
    card.append(top, element('p', 'result-text', item.text));
    const actions = element('div', 'card-actions');
    const left = element('div', 'card-actions-left');
    left.append(actionButton('▢ コピー', 'copy', item.id, 'icon-btn'));
    left.append(actionButton(favoriteHas(item.id) ? '♥ 保存済み' : '♡ お気に入り', 'favorite', item.id, `icon-btn${favoriteHas(item.id) ? ' is-favorite' : ''}`));
    actions.append(left, actionButton(state.retrying.has(item.id) ? '生成中…' : '↻ もう一度', 'regenerate', item.id, 'icon-btn'));
    card.append(actions);
    if (state.retrying.has(item.id)) card.setAttribute('aria-busy', 'true');
    return card;
  }

  function renderResults() {
    root.innerHTML = '<div class="page-heading"><span class="eyebrow">Your suggestions</span><h1>文章の候補ができました</h1><p id="resultSubtitle"></p></div><div id="resultContent"></div>';
    if (state.lastForm) root.querySelector('#resultSubtitle').textContent = `${state.lastForm.type} · ${state.lastForm.tone}`;
    const content = root.querySelector('#resultContent');
    addError(content);
    if (state.loading) {
      const loading = element('div', 'loading-card');
      loading.append(element('span', 'spinner'), element('span', '', 'AIが文章を考えています…'));
      content.append(loading);
      return;
    }
    if (!state.results.length) {
      const empty = createEmpty('✍️', '候補を表示できませんでした', '内容を見直して、もう一度作ってみてください。');
      empty.append(actionButton('入力を見直す', 'view', '', 'primary-btn', { view: 'create' }));
      content.append(empty);
      return;
    }
    const list = element('section', 'result-list');
    list.setAttribute('aria-label', '文章の候補');
    state.results.forEach((item, index) => list.append(resultCard(item, index)));
    content.append(list);
    const actions = element('div', 'hero-actions result-page-actions');
    actions.append(actionButton('✏️ 条件を変えて作る', 'view', '', 'soft-btn', { view: 'create' }));
    content.append(actions);
  }

  function entryCard(item, kind) {
    const card = element('article', 'entry-card');
    const body = element('div', 'entry-body');
    const meta = element('div', 'entry-meta');
    meta.append(element('span', '', item.context?.type || item.label || '作成した文章'));
    if (item.context?.audience) meta.append(element('span', '', `宛先：${item.context.audience}`));
    meta.append(element('time', '', formatDate(kind === 'favorite' ? item.savedAt || item.createdAt : item.createdAt)));
    body.append(meta, element('p', 'entry-text', item.text));
    card.append(body);
    const actions = element('div', 'entry-actions');
    actions.append(actionButton('▢ コピー', 'copy', item.id, 'icon-btn', { source: kind }));
    if (kind === 'favorite') actions.append(actionButton('♡ 削除', 'remove-favorite', item.id, 'icon-btn'));
    else {
      const fav = actionButton(favoriteHas(item.id) ? '♥' : '♡', 'favorite', item.id, `icon-btn${favoriteHas(item.id) ? ' is-favorite' : ''}`, { source: kind });
      fav.setAttribute('aria-label', 'お気に入りに登録');
      actions.append(fav, actionButton('削除', 'remove-history', item.id, 'icon-btn'));
    }
    card.append(actions);
    return card;
  }

  function renderCollection(kind) {
    const isFavorites = kind === 'favorite';
    const items = isFavorites ? state.favorites : state.history;
    root.innerHTML = `<div class="page-heading"><span class="eyebrow">${isFavorites ? 'Saved for later' : 'Your past writing'}</span><h1>${isFavorites ? 'お気に入り' : '作成履歴'}</h1><p>${isFavorites ? 'また使いたい文章を保存しておけます。' : 'これまでに作った文章を、新しい順に表示します。'}</p></div><div id="collection"></div>`;
    const content = root.querySelector('#collection');
    if (items.length) {
      const toolbar = element('div', 'list-toolbar');
      const count = element('div', 'count');
      count.append(document.createTextNode('保存数 '), element('strong', '', String(items.length)));
      toolbar.append(count);
      if (!isFavorites) toolbar.append(actionButton('履歴をすべて削除', 'clear-history', '', 'outline-btn'));
      content.append(toolbar);
      const list = element('section', 'entry-list');
      items.forEach(item => list.append(entryCard(item, isFavorites ? 'favorite' : 'history')));
      content.append(list);
    } else {
      const empty = isFavorites
        ? createEmpty('♡', 'お気に入りはまだ空です', '生成結果のハートを押すと、ここに保存できます。')
        : createEmpty('📝', '作成履歴はまだありません', '文章を作ると、ここに保存されます。');
      empty.append(actionButton('✏️ 文章を作る', 'view', '', 'primary-btn', { view: 'create' }));
      content.append(empty);
    }
  }

  function render() {
    root.replaceChildren();
    switch (state.view) {
      case 'create': renderCreate(); break;
      case 'results': renderResults(); break;
      case 'favorites': renderCollection('favorite'); break;
      case 'history': renderCollection('history'); break;
      default: renderHome();
    }
  }

  async function requestWriting(payload) {
    const response = await fetch('/api/writing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    let data;
    try { data = await response.json(); } catch { throw new Error('AIからの応答を読み取れませんでした。時間をおいてもう一度お試しください。'); }
    if (!response.ok) throw new Error(data.error || '生成に失敗しました。時間をおいてもう一度お試しください。');
    if (!Array.isArray(data.suggestions) || !data.suggestions.length || data.suggestions.some(item => typeof item.text !== 'string' || !item.text.trim())) {
      throw new Error('AIの応答を表示できませんでした。もう一度お試しください。');
    }
    return data.suggestions;
  }
  function normalizeSuggestion(item, context) {
    return { id: makeId(), text: item.text.trim(), label: item.label || '', context: context || {}, createdAt: new Date().toISOString() };
  }
  function readForm(form) {
    const values = new FormData(form);
    const result = {
      type: String(values.get('type') || '').trim(),
      topic: String(values.get('topic') || '').trim(),
      audience: String(values.get('audience') || '').trim(),
      tone: String(values.get('tone') || '').trim(),
      length: String(values.get('length') || '').trim(),
      details: String(values.get('details') || '').trim(),
    };
    if (!result.type || !result.topic) throw new Error('文章の種類と、伝えたい内容を入力してください。');
    return result;
  }
  async function generateThree(form) {
    state.lastForm = form;
    state.results = [];
    state.loading = true;
    state.error = '';
    state.view = 'results';
    if (location.hash !== '#results') history.pushState(null, '', '#results');
    render();
    try {
      const suggestions = await requestWriting({ ...form, count: 3, nonce: makeId() });
      const context = { type: form.type, audience: form.audience, tone: form.tone };
      state.results = suggestions.slice(0, 3).map(item => normalizeSuggestion(item, context));
      state.results.slice().reverse().forEach(saveHistory);
    } catch (error) {
      state.error = error.message || '生成に失敗しました。もう一度お試しください。';
    } finally {
      state.loading = false;
      render();
    }
  }
  async function regenerate(id) {
    const index = state.results.findIndex(item => item.id === id);
    if (index < 0 || state.retrying.has(id) || !state.lastForm) return;
    const previous = state.results[index];
    state.retrying.add(id);
    render();
    try {
      const suggestions = await requestWriting({ ...state.lastForm, count: 1, nonce: makeId(), avoidText: previous.text });
      const replacement = normalizeSuggestion(suggestions[0], previous.context);
      state.results[index] = replacement;
      saveHistory(replacement);
    } catch (error) {
      showToast(error.message || '再生成に失敗しました。');
    } finally {
      state.retrying.delete(id);
      render();
    }
  }
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed'; area.style.opacity = '0';
        document.body.append(area); area.select();
        const copied = document.execCommand('copy'); area.remove();
        if (!copied) throw new Error('copy failed');
      }
      showToast('コピーしました ✨');
    } catch { showToast('コピーできませんでした。文章を選択してコピーしてください'); }
  }
  function locateItem(id, source) {
    if (source === 'favorite') return state.favorites.find(item => item.id === id) || null;
    if (source === 'history') return state.history.find(item => item.id === id) || null;
    return state.results.find(item => item.id === id) || null;
  }
  function toggleFavorite(id, source) {
    const existingIndex = state.favorites.findIndex(item => item.id === id);
    if (existingIndex >= 0) {
      state.favorites.splice(existingIndex, 1);
      showToast('お気に入りから削除しました');
    } else {
      const item = locateItem(id, source);
      if (!item) return;
      state.favorites.unshift({ ...item, savedAt: new Date().toISOString() });
      state.favorites = state.favorites.slice(0, 100);
      showToast('お気に入りに保存しました 💗');
    }
    persist(STORAGE.favorites, state.favorites);
    render();
  }

  root.addEventListener('submit', event => {
    if (event.target.id !== 'writingForm') return;
    event.preventDefault();
    try { generateThree(readForm(event.target)); }
    catch (error) { showToast(error.message); }
  });
  document.addEventListener('click', async event => {
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) { go(viewButton.dataset.view, viewButton.dataset.type || ''); return; }
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const { action, id = '', source = '' } = button.dataset;
    if (action === 'view') { go(button.dataset.view); return; }
    if (action === 'copy') {
      const item = locateItem(id, source);
      if (item) await copyText(item.text);
      return;
    }
    if (action === 'favorite') { toggleFavorite(id, source); return; }
    if (action === 'regenerate') { await regenerate(id); return; }
    if (action === 'remove-favorite') {
      state.favorites = state.favorites.filter(item => item.id !== id);
      persist(STORAGE.favorites, state.favorites); showToast('お気に入りから削除しました'); render(); return;
    }
    if (action === 'remove-history') {
      state.history = state.history.filter(item => item.id !== id);
      persist(STORAGE.history, state.history); showToast('履歴を削除しました'); render(); return;
    }
    if (action === 'clear-history') {
      if (!window.confirm('作成履歴をすべて削除しますか？')) return;
      state.history = []; persist(STORAGE.history, state.history); showToast('履歴を削除しました'); render();
    }
  });
  window.addEventListener('popstate', () => {
    const view = location.hash.slice(1);
    state.view = VALID_VIEWS.has(view) ? view : 'home';
    render();
  });
  render();
})();
