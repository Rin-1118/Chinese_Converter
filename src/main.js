import "./styles.css";
import * as OpenCC from "opencc-js";
import { pinyin } from "pinyin-pro";
import { Check, Clipboard, History, Languages, Search, Trash2, X, createIcons } from "lucide";

const STORAGE_KEYS = {
  history: "chinese-converter.history.v2",
  mode: "chinese-converter.mode.v2"
};

const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";
const MYMEMORY_LANGPAIR = "ja|zh-CN";
const MYMEMORY_MAX_BYTES = 500;

const converters = [
  OpenCC.Converter({ from: "jp", to: "cn" }),
  OpenCC.Converter({ from: "tw", to: "cn" }),
  OpenCC.Converter({ from: "hk", to: "cn" })
];

const iconSet = {
  Check,
  Clipboard,
  History,
  Languages,
  Search,
  Trash2,
  X
};

const state = {
  mode: loadJSON(STORAGE_KEYS.mode, "translate"),
  history: loadJSON(STORAGE_KEYS.history, []),
  lastHanziResult: null,
  lastTranslationResult: null,
  isTranslating: false
};

document.querySelector("#app").innerHTML = `
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Chinese Converter</p>
        <h1>日本語を中国語へ、簡体字と拼音で表示</h1>
      </div>
      <span class="trust-badge">外部翻訳</span>
    </header>

    <main class="app-main">
      <section class="tool-panel" aria-labelledby="tool-title">
        <div class="tool-heading">
          <div>
            <h2 id="tool-title">変換</h2>
            <p>日本語文は翻訳APIで中国語へ変換します。</p>
          </div>
          <div class="segmented" role="tablist" aria-label="変換モード">
            <button class="segment" type="button" id="tab-translate" data-mode-button="translate" role="tab" aria-controls="panel-translate">
              <i data-lucide="search"></i>
              <span>日本語</span>
            </button>
            <button class="segment" type="button" id="tab-hanzi" data-mode-button="hanzi" role="tab" aria-controls="panel-hanzi">
              <i data-lucide="languages"></i>
              <span>漢字</span>
            </button>
          </div>
        </div>

        <div class="notice" role="note">
          <strong>出典</strong>
          <span>日本語翻訳は MyMemory Translation API を使います。Google公式翻訳APIではありません。</span>
        </div>

        <section class="mode-panel" id="panel-translate" data-panel="translate" role="tabpanel" aria-labelledby="tab-translate">
          <div class="field-head">
            <div>
              <label id="translate-title" for="translate-input">日本語テキスト</label>
              <p id="translate-byte-count" class="field-note">0 / 500バイト</p>
            </div>
            <button class="icon-button subtle" type="button" id="translate-clear" aria-label="入力を消去" title="入力を消去">
              <i data-lucide="x"></i>
            </button>
          </div>
          <textarea id="translate-input" rows="6" placeholder="例: 明日は大学で化学の実験があります。" aria-describedby="translate-byte-count translation-status"></textarea>
          <div class="action-row">
            <button class="primary-button" type="button" id="translate-run">
              <i data-lucide="search"></i>
              <span>翻訳</span>
            </button>
            <button class="ghost-button" type="button" id="translation-save-history" disabled>
              <i data-lucide="history"></i>
              <span>保存</span>
            </button>
          </div>
          <p id="translation-status" class="status-line" role="status">日本語を入力して翻訳を押してください。</p>

          <div class="results-grid" aria-live="polite">
            <article class="result-card">
              <div class="result-head">
                <span>簡体字中国語</span>
                <button class="icon-button" type="button" data-copy="translation" aria-label="翻訳結果をコピー" title="翻訳結果をコピー" disabled>
                  <i data-lucide="clipboard"></i>
                </button>
              </div>
              <p id="translation-simplified" class="result-text muted">翻訳すると表示されます</p>
            </article>
            <article class="result-card">
              <div class="result-head">
                <span>拼音</span>
                <button class="icon-button" type="button" data-copy="translation-pinyin" aria-label="拼音をコピー" title="拼音をコピー" disabled>
                  <i data-lucide="clipboard"></i>
                </button>
              </div>
              <p id="translation-pinyin" class="result-text muted">翻訳すると表示されます</p>
              <p id="translation-pinyin-number" class="tone-text"></p>
            </article>
          </div>
        </section>

        <section class="mode-panel" id="panel-hanzi" data-panel="hanzi" role="tabpanel" aria-labelledby="tab-hanzi">
          <div class="field-head">
            <label id="hanzi-title" for="hanzi-input">漢字・中国語文</label>
            <button class="icon-button subtle" type="button" id="hanzi-clear" aria-label="入力を消去" title="入力を消去">
              <i data-lucide="x"></i>
            </button>
          </div>
          <textarea id="hanzi-input" rows="6" placeholder="漢字・繁體字・中文を入力"></textarea>
          <div class="action-row">
            <button class="primary-button" type="button" id="hanzi-convert">
              <i data-lucide="languages"></i>
              <span>変換</span>
            </button>
            <button class="ghost-button" type="button" id="hanzi-save-history" disabled>
              <i data-lucide="history"></i>
              <span>保存</span>
            </button>
          </div>

          <div class="results-grid" aria-live="polite">
            <article class="result-card">
              <div class="result-head">
                <span>簡体字</span>
                <button class="icon-button" type="button" data-copy="simplified" aria-label="簡体字をコピー" title="簡体字をコピー" disabled>
                  <i data-lucide="clipboard"></i>
                </button>
              </div>
              <p id="hanzi-simplified" class="result-text muted">入力すると表示されます</p>
            </article>
            <article class="result-card">
              <div class="result-head">
                <span>拼音</span>
                <button class="icon-button" type="button" data-copy="pinyin" aria-label="拼音をコピー" title="拼音をコピー" disabled>
                  <i data-lucide="clipboard"></i>
                </button>
              </div>
              <p id="hanzi-pinyin" class="result-text muted">入力すると表示されます</p>
              <p id="hanzi-pinyin-number" class="tone-text"></p>
            </article>
          </div>
        </section>
      </section>

      <section class="support-grid">
        <article class="support-card" aria-labelledby="history-title">
          <div class="support-head">
            <div>
              <h2 id="history-title">履歴</h2>
              <p>最近の翻訳と変換</p>
            </div>
            <button class="icon-button danger" type="button" id="clear-history" aria-label="すべての履歴を削除" title="すべての履歴を削除">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
          <div id="history-list" class="history-list"></div>
        </article>
      </section>
    </main>
  </div>
`;

const elements = {
  panels: [...document.querySelectorAll("[data-panel]")],
  modeButtons: [...document.querySelectorAll("[data-mode-button]")],
  translateInput: document.querySelector("#translate-input"),
  translateButton: document.querySelector("#translate-run"),
  translateByteCount: document.querySelector("#translate-byte-count"),
  translationSaveButton: document.querySelector("#translation-save-history"),
  translationStatus: document.querySelector("#translation-status"),
  translationSimplified: document.querySelector("#translation-simplified"),
  translationPinyin: document.querySelector("#translation-pinyin"),
  translationPinyinNumber: document.querySelector("#translation-pinyin-number"),
  hanziInput: document.querySelector("#hanzi-input"),
  hanziSaveButton: document.querySelector("#hanzi-save-history"),
  hanziSimplified: document.querySelector("#hanzi-simplified"),
  hanziPinyin: document.querySelector("#hanzi-pinyin"),
  hanziPinyinNumber: document.querySelector("#hanzi-pinyin-number"),
  historyList: document.querySelector("#history-list"),
  copyButtons: [...document.querySelectorAll("[data-copy]")]
};

wireEvents();
renderAll();
refreshIcons();

function wireEvents() {
  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.modeButton));
    button.addEventListener("keydown", handleTabKeydown);
  });

  elements.translateInput.addEventListener("input", updateTranslateByteCount);
  elements.translateButton.addEventListener("click", () => translateJapanese(true));
  document.querySelector("#translation-save-history").addEventListener("click", () => {
    if (state.lastTranslationResult) {
      addHistory({
        type: "translate",
        title: state.lastTranslationResult.input,
        detail: state.lastTranslationResult.simplified,
        payload: state.lastTranslationResult
      });
      elements.translationStatus.textContent = "履歴に保存しました。";
    }
  });
  document.querySelector("#translate-clear").addEventListener("click", () => {
    elements.translateInput.value = "";
    state.lastTranslationResult = null;
    renderTranslationEmpty();
    updateTranslateByteCount();
    elements.translateInput.focus();
  });

  elements.hanziInput.addEventListener("input", () => {
    renderHanziConversion(false);
  });
  document.querySelector("#hanzi-convert").addEventListener("click", () => {
    renderHanziConversion(true);
  });
  document.querySelector("#hanzi-save-history").addEventListener("click", () => {
    if (state.lastHanziResult) {
      addHistory({
        type: "hanzi",
        title: state.lastHanziResult.input,
        detail: state.lastHanziResult.simplified,
        payload: state.lastHanziResult
      });
    }
  });
  document.querySelector("#hanzi-clear").addEventListener("click", () => {
    elements.hanziInput.value = "";
    state.lastHanziResult = null;
    renderHanziConversion(false);
    elements.hanziInput.focus();
  });

  elements.copyButtons.forEach((button) => {
    button.addEventListener("click", () => copyResult(button.dataset.copy));
  });

  document.querySelector("#clear-history").addEventListener("click", () => {
    if (state.history.length === 0) return;
    const shouldClear = window.confirm("すべての履歴を削除しますか？");
    if (!shouldClear) return;
    state.history = [];
    saveJSON(STORAGE_KEYS.history, state.history);
    renderHistory();
  });
  elements.historyList.addEventListener("click", handleHistoryClick);
}

function handleTabKeydown(event) {
  const order = ["translate", "hanzi"];
  const currentIndex = order.indexOf(state.mode);
  let nextMode = null;

  if (event.key === "ArrowRight") {
    nextMode = order[(currentIndex + 1) % order.length];
  } else if (event.key === "ArrowLeft") {
    nextMode = order[(currentIndex - 1 + order.length) % order.length];
  } else if (event.key === "Home") {
    nextMode = order[0];
  } else if (event.key === "End") {
    nextMode = order[order.length - 1];
  }

  if (!nextMode) return;
  event.preventDefault();
  setMode(nextMode);
  document.querySelector(`[data-mode-button="${nextMode}"]`)?.focus();
}

function renderAll() {
  setMode(state.mode);
  updateTranslateByteCount();
  renderTranslationEmpty();
  renderHanziConversion(false);
  renderHistory();
}

function updateTranslateByteCount() {
  const bytes = new Blob([elements.translateInput.value.trim()]).size;
  const overBy = bytes - MYMEMORY_MAX_BYTES;
  const isOverLimit = overBy > 0;
  elements.translateByteCount.textContent = isOverLimit
    ? `${bytes} / ${MYMEMORY_MAX_BYTES}バイト（${overBy}バイト超過）`
    : `${bytes} / ${MYMEMORY_MAX_BYTES}バイト`;
  elements.translateByteCount.classList.toggle("over-limit", isOverLimit);
  elements.translateInput.setAttribute("aria-invalid", String(isOverLimit));
}

function setMode(mode) {
  state.mode = mode === "hanzi" ? "hanzi" : "translate";
  saveJSON(STORAGE_KEYS.mode, state.mode);

  elements.modeButtons.forEach((button) => {
    const isActive = button.dataset.modeButton === state.mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  elements.panels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== state.mode;
  });
}

async function translateJapanese(shouldSave) {
  const input = elements.translateInput.value.trim();
  if (!input) {
    state.lastTranslationResult = null;
    renderTranslationEmpty();
    return;
  }

  if (new Blob([input]).size > MYMEMORY_MAX_BYTES) {
    state.lastTranslationResult = null;
    elements.translationStatus.textContent = "翻訳APIの制限により、500バイト以内に短くしてください。";
    renderTranslationResult("", "", "");
    return;
  }

  setTranslationLoading(true);
  try {
    const translated = await requestTranslation(input);
    const simplified = toSimplified(translated);
    const marked = toPinyin(simplified, "symbol");
    const numbered = toPinyin(simplified, "num");

    state.lastTranslationResult = {
      input,
      simplified,
      pinyin: marked,
      pinyinNumber: numbered
    };

    elements.translationStatus.textContent = "翻訳結果";
    renderTranslationResult(simplified, marked, numbered);

    if (shouldSave) {
      addHistory({
        type: "translate",
        title: input,
        detail: simplified,
        payload: state.lastTranslationResult
      });
    }
  } catch (error) {
    state.lastTranslationResult = null;
    elements.translationStatus.textContent = error instanceof Error ? error.message : "翻訳に失敗しました。";
    renderTranslationResult("", "", "");
  } finally {
    setTranslationLoading(false);
  }
}

async function requestTranslation(text) {
  const params = new URLSearchParams({
    q: text,
    langpair: MYMEMORY_LANGPAIR,
    mt: "1"
  });
  const response = await fetch(`${MYMEMORY_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`翻訳APIに接続できませんでした。HTTP ${response.status}`);
  }

  const data = await response.json();
  const responseStatus = Number(data.responseStatus);
  if (responseStatus && responseStatus !== 200) {
    throw new Error(data.responseDetails || "翻訳APIがエラーを返しました。");
  }

  const translated = data.responseData?.translatedText || data.matches?.[0]?.translation || "";
  if (!translated) {
    throw new Error("翻訳結果が空でした。別の表現で試してください。");
  }
  return translated;
}

function setTranslationLoading(isLoading) {
  state.isTranslating = isLoading;
  elements.translateButton.disabled = isLoading;
  elements.translateButton.querySelector("span").textContent = isLoading ? "翻訳中" : "翻訳";
  if (isLoading) {
    elements.translationStatus.textContent = "翻訳中...";
  }
}

function renderTranslationEmpty() {
  elements.translationStatus.textContent = "日本語を入力して翻訳を押してください。";
  elements.translationSaveButton.disabled = true;
  renderTranslationResult("", "", "");
}

function renderTranslationResult(simplified, marked, numbered) {
  const hasResult = Boolean(simplified);
  elements.translationSaveButton.disabled = !hasResult;
  setCopyButtonState("translation", hasResult);
  setCopyButtonState("translation-pinyin", hasResult);

  if (!simplified) {
    elements.translationSimplified.textContent = "翻訳すると表示されます";
    elements.translationSimplified.classList.add("muted");
    elements.translationPinyin.textContent = "翻訳すると表示されます";
    elements.translationPinyin.classList.add("muted");
    elements.translationPinyinNumber.textContent = "";
    return;
  }

  elements.translationSimplified.textContent = simplified;
  elements.translationSimplified.classList.remove("muted");
  elements.translationPinyin.textContent = marked;
  elements.translationPinyin.classList.remove("muted");
  elements.translationPinyinNumber.textContent = numbered;
}

function renderHanziConversion(shouldSave) {
  const input = elements.hanziInput.value.trim();
  if (!input) {
    state.lastHanziResult = null;
    elements.hanziSaveButton.disabled = true;
    setCopyButtonState("simplified", false);
    setCopyButtonState("pinyin", false);
    elements.hanziSimplified.textContent = "入力すると表示されます";
    elements.hanziSimplified.classList.add("muted");
    elements.hanziPinyin.textContent = "入力すると表示されます";
    elements.hanziPinyin.classList.add("muted");
    elements.hanziPinyinNumber.textContent = "";
    return;
  }

  const simplified = toSimplified(input);
  const marked = toPinyin(simplified, "symbol");
  const numbered = toPinyin(simplified, "num");

  state.lastHanziResult = {
    input,
    simplified,
    pinyin: marked,
    pinyinNumber: numbered
  };

  elements.hanziSimplified.textContent = simplified;
  elements.hanziSimplified.classList.remove("muted");
  elements.hanziPinyin.textContent = marked;
  elements.hanziPinyin.classList.remove("muted");
  elements.hanziPinyinNumber.textContent = numbered;
  elements.hanziSaveButton.disabled = false;
  setCopyButtonState("simplified", true);
  setCopyButtonState("pinyin", true);

  if (shouldSave) {
    addHistory({
      type: "hanzi",
      title: input,
      detail: simplified,
      payload: state.lastHanziResult
    });
  }
}

function renderHistory() {
  if (state.history.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state compact";
    empty.innerHTML = `
      <i data-lucide="history"></i>
      <p>履歴なし</p>
    `;
    elements.historyList.replaceChildren(empty);
    refreshIcons();
    return;
  }

  const items = state.history.map((entry) => {
    const button = document.createElement("button");
    button.className = "history-item";
    button.type = "button";
    button.dataset.historyId = entry.id;
    button.innerHTML = `
      <span class="history-type"></span>
      <strong></strong>
      <small></small>
    `;
    button.querySelector(".history-type").textContent = entry.type === "hanzi" ? "漢字" : "翻訳";
    button.querySelector("strong").textContent = entry.title;
    button.querySelector("small").textContent = entry.detail;
    return button;
  });
  elements.historyList.replaceChildren(...items);
}

function setCopyButtonState(kind, isEnabled) {
  const button = elements.copyButtons.find((item) => item.dataset.copy === kind);
  if (button) {
    button.disabled = !isEnabled;
  }
}

function handleHistoryClick(event) {
  const button = event.target.closest("[data-history-id]");
  if (!button) return;
  const entry = state.history.find((item) => item.id === button.dataset.historyId);
  if (!entry) return;

  if (entry.type === "hanzi") {
    setMode("hanzi");
    elements.hanziInput.value = entry.payload.input;
    renderHanziConversion(false);
    elements.hanziInput.focus();
  } else {
    setMode("translate");
    elements.translateInput.value = entry.payload.input;
    updateTranslateByteCount();
    state.lastTranslationResult = entry.payload;
    elements.translationStatus.textContent = "履歴から復元しました。";
    renderTranslationResult(entry.payload.simplified, entry.payload.pinyin, entry.payload.pinyinNumber);
    elements.translateInput.focus();
  }
}

function copyResult(kind) {
  const result = kind.startsWith("translation") ? state.lastTranslationResult : state.lastHanziResult;
  if (!result) return;
  const text =
    kind === "simplified" || kind === "translation"
      ? result.simplified
      : kind === "translation-pinyin"
        ? result.pinyin
        : result.pinyin;
  copyText(text);
}

function addHistory(entry) {
  const next = {
    ...entry,
    id: `${entry.type}-${Date.now()}`
  };
  state.history = [next, ...state.history.filter((item) => item.title !== entry.title || item.type !== entry.type)].slice(
    0,
    12
  );
  saveJSON(STORAGE_KEYS.history, state.history);
  renderHistory();
}

function toSimplified(text) {
  return converters.reduce((current, converter) => converter(current), text);
}

function toPinyin(text, toneType) {
  return pinyin(text, {
    toneType,
    type: "array",
    nonZh: "consecutive"
  }).join(" ");
}

async function copyText(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    flashCopied();
  } catch {
    window.prompt("コピーしてください", text);
  }
}

function flashCopied() {
  const badge = document.createElement("div");
  badge.className = "copy-toast";
  badge.setAttribute("role", "status");
  badge.innerHTML = `<i data-lucide="check"></i><span>コピーしました</span>`;
  document.body.append(badge);
  refreshIcons();
  window.setTimeout(() => badge.remove(), 1400);
}

function refreshIcons() {
  createIcons({ icons: iconSet });
}

function loadJSON(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}
