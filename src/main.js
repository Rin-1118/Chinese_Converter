import "./styles.css";
import * as OpenCC from "opencc-js";
import { pinyin } from "pinyin-pro";
import { Check, Clipboard, History, Home, Languages, Moon, Search, Sun, Trash2, Volume2, X, createIcons } from "lucide";

const STORAGE_KEYS = {
  history: "chinese-converter.history.v2",
  mode: "chinese-converter.mode.v2",
  page: "chinese-converter.page.v1",
  targetLanguage: "chinese-converter.target-language.v1",
  theme: "chinese-converter.theme.v1"
};

const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";
const MYMEMORY_LANGPAIRS = {
  japaneseToChinese: "ja|zh-CN",
  chineseSource: "zh-CN"
};
const MYMEMORY_MAX_BYTES = 500;

const CHINESE_TARGET_LANGUAGES = [
  { code: "ja", label: "日本語", detail: "Japanese" },
  { code: "en", label: "English", detail: "英語" },
  { code: "ko", label: "한국어", detail: "韓国語" },
  { code: "fr", label: "Français", detail: "フランス語" },
  { code: "es", label: "Español", detail: "スペイン語" },
  { code: "de", label: "Deutsch", detail: "ドイツ語" }
];

const converters = [
  OpenCC.Converter({ from: "jp", to: "cn" }),
  OpenCC.Converter({ from: "tw", to: "cn" }),
  OpenCC.Converter({ from: "hk", to: "cn" })
];

const iconSet = {
  Check,
  Clipboard,
  History,
  Home,
  Languages,
  Moon,
  Search,
  Sun,
  Trash2,
  Volume2,
  X
};

const state = {
  mode: loadJSON(STORAGE_KEYS.mode, "translate"),
  page: loadJSON(STORAGE_KEYS.page, "home"),
  theme: loadJSON(STORAGE_KEYS.theme, "light"),
  targetLanguage: loadJSON(STORAGE_KEYS.targetLanguage, "ja"),
  history: loadJSON(STORAGE_KEYS.history, []),
  lastHanziResult: null,
  lastTranslationResult: null,
  hanziRequestId: 0,
  isHanziTranslating: false,
  isTranslating: false
};

const languageOptionMarkup = CHINESE_TARGET_LANGUAGES.map(
  (language) => `
    <button class="language-option" type="button" data-language-button="${language.code}" role="radio" aria-checked="false">
      <span>
        <strong>${language.label}</strong>
        <small>${language.detail}</small>
      </span>
      <i data-lucide="check"></i>
    </button>
  `
).join("");

document.querySelector("#app").innerHTML = `
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Chinese-Japanese Converter</p>
        <h1>Chinese-Japanese Converter</h1>
      </div>
      <div class="header-actions">
        <span class="trust-badge">外部翻訳</span>
        <button class="icon-button" type="button" id="theme-toggle" aria-label="ダークモードに切り替え" title="ダークモードに切り替え" aria-pressed="false">
          <i data-lucide="moon"></i>
        </button>
      </div>
    </header>

    <nav class="page-tabs" aria-label="ページ">
      <button class="page-tab" type="button" data-page-button="home">
        <i data-lucide="home"></i>
        <span>Home</span>
      </button>
      <button class="page-tab" type="button" data-page-button="languages">
        <i data-lucide="languages"></i>
        <span>Languages</span>
      </button>
      <button class="page-tab" type="button" data-page-button="history">
        <i data-lucide="history"></i>
        <span>History</span>
      </button>
    </nav>

    <main class="app-main">
      <section class="app-page" data-page="home">
        <section class="tool-panel" aria-labelledby="tool-title">
          <div class="tool-heading">
            <div>
              <h2 id="tool-title">変換</h2>
              <p>日本語と中国語を翻訳・変換します。</p>
            </div>
            <div class="segmented" role="tablist" aria-label="変換モード">
              <button class="segment" type="button" id="tab-translate" data-mode-button="translate" role="tab" aria-controls="panel-translate">
                <i data-lucide="search"></i>
                <span>日本語</span>
              </button>
              <button class="segment" type="button" id="tab-hanzi" data-mode-button="hanzi" role="tab" aria-controls="panel-hanzi">
                <i data-lucide="languages"></i>
                <span>中国語</span>
              </button>
            </div>
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
                  <div class="result-actions">
                    <button class="icon-button" type="button" data-speak="translation-chinese" aria-label="中国語を発音" title="中国語を発音" disabled>
                      <i data-lucide="volume-2"></i>
                    </button>
                    <button class="icon-button" type="button" data-copy="translation" aria-label="翻訳結果をコピー" title="翻訳結果をコピー" disabled>
                      <i data-lucide="clipboard"></i>
                    </button>
                  </div>
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
              <div>
                <label id="hanzi-title" for="hanzi-input">中国語テキスト</label>
                <p id="hanzi-target-note" class="field-note">翻訳先: 日本語</p>
              </div>
              <button class="icon-button subtle" type="button" id="hanzi-clear" aria-label="入力を消去" title="入力を消去">
                <i data-lucide="x"></i>
              </button>
            </div>
            <textarea id="hanzi-input" rows="6" placeholder="例: 我想学习中文。"></textarea>
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
            <p id="hanzi-status" class="status-line" role="status">中国語を入力して変換を押してください。</p>

            <div class="results-grid" aria-live="polite">
              <article class="result-card">
                <div class="result-head">
                  <span>簡体字</span>
                  <div class="result-actions">
                    <button class="icon-button" type="button" data-speak="hanzi-chinese" aria-label="中国語を発音" title="中国語を発音" disabled>
                      <i data-lucide="volume-2"></i>
                    </button>
                    <button class="icon-button" type="button" data-copy="simplified" aria-label="簡体字をコピー" title="簡体字をコピー" disabled>
                      <i data-lucide="clipboard"></i>
                    </button>
                  </div>
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
              <article class="result-card wide">
                <div class="result-head">
                  <span id="hanzi-meaning-label">意味（日本語）</span>
                  <div class="result-actions">
                    <button class="icon-button" type="button" data-speak="hanzi-meaning" aria-label="意味を発音" title="意味を発音" disabled>
                      <i data-lucide="volume-2"></i>
                    </button>
                    <button class="icon-button" type="button" data-copy="hanzi-meaning" aria-label="意味をコピー" title="意味をコピー" disabled>
                      <i data-lucide="clipboard"></i>
                    </button>
                  </div>
                </div>
                <p id="hanzi-meaning" class="result-text muted">変換すると表示されます</p>
              </article>
            </div>
          </section>
        </section>
      </section>

      <section class="app-page language-page" data-page="languages" aria-labelledby="language-title">
        <article class="support-card" aria-labelledby="language-title">
          <div class="support-head">
            <div>
              <h2 id="language-title">言語選択</h2>
              <p>中国語入力の翻訳先</p>
            </div>
          </div>
          <div class="language-list" role="radiogroup" aria-labelledby="language-title">
            ${languageOptionMarkup}
          </div>
        </article>
      </section>

      <section class="app-page history-page" data-page="history" aria-labelledby="history-title">
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
  pages: [...document.querySelectorAll("[data-page]")],
  pageButtons: [...document.querySelectorAll("[data-page-button]")],
  languageButtons: [...document.querySelectorAll("[data-language-button]")],
  panels: [...document.querySelectorAll("[data-panel]")],
  modeButtons: [...document.querySelectorAll("[data-mode-button]")],
  themeToggle: document.querySelector("#theme-toggle"),
  translateInput: document.querySelector("#translate-input"),
  translateButton: document.querySelector("#translate-run"),
  translateByteCount: document.querySelector("#translate-byte-count"),
  translationSaveButton: document.querySelector("#translation-save-history"),
  translationStatus: document.querySelector("#translation-status"),
  translationSimplified: document.querySelector("#translation-simplified"),
  translationPinyin: document.querySelector("#translation-pinyin"),
  translationPinyinNumber: document.querySelector("#translation-pinyin-number"),
  hanziInput: document.querySelector("#hanzi-input"),
  hanziButton: document.querySelector("#hanzi-convert"),
  hanziSaveButton: document.querySelector("#hanzi-save-history"),
  hanziTargetNote: document.querySelector("#hanzi-target-note"),
  hanziStatus: document.querySelector("#hanzi-status"),
  hanziSimplified: document.querySelector("#hanzi-simplified"),
  hanziPinyin: document.querySelector("#hanzi-pinyin"),
  hanziPinyinNumber: document.querySelector("#hanzi-pinyin-number"),
  hanziMeaningLabel: document.querySelector("#hanzi-meaning-label"),
  hanziMeaning: document.querySelector("#hanzi-meaning"),
  historyList: document.querySelector("#history-list"),
  copyButtons: [...document.querySelectorAll("[data-copy]")],
  speakButtons: [...document.querySelectorAll("[data-speak]")]
};

wireEvents();
renderAll();
refreshIcons();

function wireEvents() {
  elements.pageButtons.forEach((button) => {
    button.addEventListener("click", () => setPage(button.dataset.pageButton));
  });
  elements.languageButtons.forEach((button) => {
    button.addEventListener("click", () => setTargetLanguage(button.dataset.languageButton));
  });
  elements.themeToggle.addEventListener("click", toggleTheme);

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
  elements.hanziButton.addEventListener("click", () => {
    renderHanziConversion(true);
  });
  document.querySelector("#hanzi-save-history").addEventListener("click", () => {
    if (state.lastHanziResult) {
      addHistory({
        type: "hanzi",
        title: state.lastHanziResult.input,
        detail: formatHanziHistoryDetail(state.lastHanziResult),
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
  elements.speakButtons.forEach((button) => {
    button.addEventListener("click", () => speakResult(button.dataset.speak));
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
  setTheme(state.theme);
  setPage(state.page);
  setTargetLanguage(state.targetLanguage, { preserveResult: true });
  setMode(state.mode);
  updateTranslateByteCount();
  renderTranslationEmpty();
  renderHanziConversion(false);
  renderHistory();
}

function setPage(page) {
  state.page = page === "history" || page === "languages" ? page : "home";
  saveJSON(STORAGE_KEYS.page, state.page);

  elements.pageButtons.forEach((button) => {
    const isActive = button.dataset.pageButton === state.page;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  elements.pages.forEach((pageElement) => {
    pageElement.hidden = pageElement.dataset.page !== state.page;
  });
}

function setTargetLanguage(languageCode, options = {}) {
  const nextLanguage = getTargetLanguage(languageCode);
  const didChange = state.targetLanguage !== nextLanguage.code;
  state.targetLanguage = nextLanguage.code;
  saveJSON(STORAGE_KEYS.targetLanguage, state.targetLanguage);
  renderLanguageSelection();
  updateHanziTargetText();

  if (didChange && !options.preserveResult) {
    renderHanziConversion(false);
  }
}

function renderLanguageSelection() {
  elements.languageButtons.forEach((button) => {
    const isSelected = button.dataset.languageButton === state.targetLanguage;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-checked", String(isSelected));
  });
}

function updateHanziTargetText() {
  const language = getTargetLanguage();
  elements.hanziTargetNote.textContent = `翻訳先: ${language.label}`;
  elements.hanziMeaningLabel.textContent = `意味（${language.label}）`;
}

function toggleTheme() {
  setTheme(state.theme === "dark" ? "light" : "dark");
}

function setTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = state.theme;
  saveJSON(STORAGE_KEYS.theme, state.theme);
  renderThemeToggle();
}

function renderThemeToggle() {
  const isDark = state.theme === "dark";
  const label = isDark ? "ライトモードに切り替え" : "ダークモードに切り替え";
  elements.themeToggle.setAttribute("aria-label", label);
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
  elements.themeToggle.title = label;
  elements.themeToggle.innerHTML = `<i data-lucide="${isDark ? "sun" : "moon"}"></i>`;
  refreshIcons();
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
    const translated = await requestTranslation(input, MYMEMORY_LANGPAIRS.japaneseToChinese);
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

async function requestTranslation(text, langpair) {
  const params = new URLSearchParams({
    q: text,
    langpair,
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
  setSpeakButtonState("translation-chinese", hasResult);

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

async function renderHanziConversion(shouldTranslate) {
  if (!shouldTranslate) {
    state.hanziRequestId += 1;
    setHanziLoading(false);
  }

  const input = elements.hanziInput.value.trim();
  if (!input) {
    state.lastHanziResult = null;
    elements.hanziSaveButton.disabled = true;
    setCopyButtonState("simplified", false);
    setCopyButtonState("pinyin", false);
    setCopyButtonState("hanzi-meaning", false);
    setSpeakButtonState("hanzi-chinese", false);
    setSpeakButtonState("hanzi-meaning", false);
    elements.hanziStatus.textContent = "中国語を入力して変換を押してください。";
    elements.hanziSimplified.textContent = "入力すると表示されます";
    elements.hanziSimplified.classList.add("muted");
    elements.hanziPinyin.textContent = "入力すると表示されます";
    elements.hanziPinyin.classList.add("muted");
    elements.hanziPinyinNumber.textContent = "";
    renderHanziMeaning("");
    return;
  }

  const targetLanguage = getTargetLanguage();
  const simplified = toSimplified(input);
  const marked = toPinyin(simplified, "symbol");
  const numbered = toPinyin(simplified, "num");
  const previousMeaning =
    state.lastHanziResult?.input === input && state.lastHanziResult?.targetLanguage === targetLanguage.code
      ? state.lastHanziResult.meaning
      : "";

  state.lastHanziResult = {
    input,
    simplified,
    pinyin: marked,
    pinyinNumber: numbered,
    targetLanguage: targetLanguage.code,
    targetLanguageLabel: targetLanguage.label,
    meaning: previousMeaning || ""
  };

  elements.hanziSimplified.textContent = simplified;
  elements.hanziSimplified.classList.remove("muted");
  elements.hanziPinyin.textContent = marked;
  elements.hanziPinyin.classList.remove("muted");
  elements.hanziPinyinNumber.textContent = numbered;
  elements.hanziSaveButton.disabled = false;
  setCopyButtonState("simplified", true);
  setCopyButtonState("pinyin", true);
  setSpeakButtonState("hanzi-chinese", true);
  renderHanziMeaning(state.lastHanziResult.meaning);

  if (!shouldTranslate) {
    elements.hanziStatus.textContent = state.lastHanziResult.meaning
      ? `翻訳結果（${targetLanguage.label}）`
      : "変換を押すと意味を表示します。";
    return;
  }

  if (new Blob([simplified]).size > MYMEMORY_MAX_BYTES) {
    elements.hanziStatus.textContent = "翻訳APIの制限により、500バイト以内に短くしてください。";
    renderHanziMeaning("");
    return;
  }

  const requestId = state.hanziRequestId + 1;
  state.hanziRequestId = requestId;
  setHanziLoading(true);

  try {
    const meaning = await requestTranslation(
      simplified,
      `${MYMEMORY_LANGPAIRS.chineseSource}|${targetLanguage.code}`
    );
    if (requestId !== state.hanziRequestId) return;

    state.lastHanziResult = {
      ...state.lastHanziResult,
      input,
      simplified,
      pinyin: marked,
      pinyinNumber: numbered,
      targetLanguage: targetLanguage.code,
      targetLanguageLabel: targetLanguage.label,
      meaning
    };

    elements.hanziStatus.textContent = `翻訳結果（${targetLanguage.label}）`;
    renderHanziMeaning(meaning);

    addHistory({
      type: "hanzi",
      title: input,
      detail: formatHanziHistoryDetail(state.lastHanziResult),
      payload: state.lastHanziResult
    });
  } catch (error) {
    if (requestId !== state.hanziRequestId) return;
    elements.hanziStatus.textContent = error instanceof Error ? error.message : "翻訳に失敗しました。";
    renderHanziMeaning("");
  } finally {
    if (requestId === state.hanziRequestId) {
      setHanziLoading(false);
    }
  }
}

function setHanziLoading(isLoading) {
  state.isHanziTranslating = isLoading;
  elements.hanziButton.disabled = isLoading;
  elements.hanziButton.querySelector("span").textContent = isLoading ? "翻訳中" : "変換";
  if (isLoading) {
    elements.hanziStatus.textContent = "翻訳中...";
  }
}

function renderHanziMeaning(meaning) {
  const hasMeaning = Boolean(meaning);
  setCopyButtonState("hanzi-meaning", hasMeaning);
  setSpeakButtonState("hanzi-meaning", hasMeaning);

  if (!hasMeaning) {
    elements.hanziMeaning.textContent = "変換すると表示されます";
    elements.hanziMeaning.classList.add("muted");
    return;
  }

  elements.hanziMeaning.textContent = meaning;
  elements.hanziMeaning.classList.remove("muted");
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
    button.querySelector(".history-type").textContent = entry.type === "hanzi" ? "中国語" : "翻訳";
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

function setSpeakButtonState(kind, isEnabled) {
  const button = elements.speakButtons.find((item) => item.dataset.speak === kind);
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
    setPage("home");
    setMode("hanzi");
    if (entry.payload.targetLanguage) {
      setTargetLanguage(entry.payload.targetLanguage, { preserveResult: true });
    }
    elements.hanziInput.value = entry.payload.input;
    renderHanziConversion(false);
    if (entry.payload.meaning) {
      state.lastHanziResult = {
        ...state.lastHanziResult,
        meaning: entry.payload.meaning,
        targetLanguage: entry.payload.targetLanguage || state.targetLanguage,
        targetLanguageLabel: entry.payload.targetLanguageLabel || getTargetLanguage().label
      };
      updateHanziTargetText();
      elements.hanziStatus.textContent = `履歴から復元しました（${state.lastHanziResult.targetLanguageLabel}）。`;
      renderHanziMeaning(entry.payload.meaning);
    }
    elements.hanziInput.focus();
  } else {
    setPage("home");
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
        : kind === "hanzi-meaning"
          ? result.meaning
          : result.pinyin;
  copyText(text);
}

function speakResult(kind) {
  if (kind === "translation-chinese") {
    speakText(state.lastTranslationResult?.simplified, "zh-CN", elements.translationStatus);
    return;
  }

  if (kind === "hanzi-chinese") {
    speakText(state.lastHanziResult?.simplified, "zh-CN", elements.hanziStatus);
    return;
  }

  if (kind === "hanzi-meaning") {
    const language = getTargetLanguage(state.lastHanziResult?.targetLanguage || state.targetLanguage);
    speakText(state.lastHanziResult?.meaning, getSpeechLanguage(language.code), elements.hanziStatus);
  }
}

function speakText(text, language, statusElement) {
  if (!text) return;

  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    statusElement.textContent = "このブラウザでは音声再生に対応していません。";
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = language === "zh-CN" ? 0.88 : 0.94;
  utterance.pitch = 1;

  const voice = findSpeechVoice(language);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onstart = () => {
    statusElement.textContent = "発音中...";
  };
  utterance.onend = () => {
    statusElement.textContent = "発音しました。";
  };
  utterance.onerror = () => {
    statusElement.textContent = "音声再生に失敗しました。";
  };

  window.speechSynthesis.speak(utterance);
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

function getTargetLanguage(languageCode = state.targetLanguage) {
  return CHINESE_TARGET_LANGUAGES.find((language) => language.code === languageCode) || CHINESE_TARGET_LANGUAGES[0];
}

function getSpeechLanguage(languageCode) {
  const speechLanguages = {
    ja: "ja-JP",
    en: "en-US",
    ko: "ko-KR",
    fr: "fr-FR",
    es: "es-ES",
    de: "de-DE"
  };
  return speechLanguages[languageCode] || "zh-CN";
}

function findSpeechVoice(language) {
  return window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang === language || voice.lang.toLowerCase().startsWith(language.toLowerCase()));
}

function formatHanziHistoryDetail(result) {
  if (result.meaning) {
    return `${result.meaning} / ${result.simplified}`;
  }
  return result.simplified;
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
