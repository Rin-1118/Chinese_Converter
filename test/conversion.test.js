import test from "node:test";
import assert from "node:assert/strict";
import {
  formatHanziHistoryDetail,
  getSpeechLanguage,
  getTargetLanguage,
  shouldRunShortcut,
  toPinyin,
  toSimplified
} from "../src/conversion.js";

test("toSimplified converts traditional Chinese to simplified Chinese", () => {
  assert.equal(toSimplified("我想學習中文。"), "我想学习中文。");
});

test("toPinyin returns marked and numbered pinyin", () => {
  assert.equal(toPinyin("学习中文", "symbol"), "xué xí zhōng wén");
  assert.equal(toPinyin("学习中文", "num"), "xue2 xi2 zhong1 wen2");
});

test("getTargetLanguage falls back to Japanese", () => {
  assert.deepEqual(getTargetLanguage("en"), { code: "en", label: "English", detail: "英語" });
  assert.deepEqual(getTargetLanguage("unknown"), { code: "ja", label: "日本語", detail: "Japanese" });
});

test("getSpeechLanguage maps translation language codes to speech locales", () => {
  assert.equal(getSpeechLanguage("ja"), "ja-JP");
  assert.equal(getSpeechLanguage("ko"), "ko-KR");
  assert.equal(getSpeechLanguage("unknown"), "zh-CN");
});

test("formatHanziHistoryDetail uses meaning when it exists", () => {
  assert.equal(formatHanziHistoryDetail({ meaning: "I want to study Chinese.", pinyin: "wǒ xiǎng xué xí zhōng wén" }), "I want to study Chinese. / wǒ xiǎng xué xí zhōng wén");
  assert.equal(formatHanziHistoryDetail({ pinyin: "wǒ xiǎng xué xí zhōng wén" }), "wǒ xiǎng xué xí zhōng wén");
});

test("shouldRunShortcut only accepts Shift + Enter while idle", () => {
  assert.equal(shouldRunShortcut({ shiftKey: true, key: "Enter", isComposing: false }, false), true);
  assert.equal(shouldRunShortcut({ shiftKey: false, key: "Enter", isComposing: false }, false), false);
  assert.equal(shouldRunShortcut({ shiftKey: true, key: "a", isComposing: false }, false), false);
  assert.equal(shouldRunShortcut({ shiftKey: true, key: "Enter", isComposing: true }, false), false);
  assert.equal(shouldRunShortcut({ shiftKey: true, key: "Enter", isComposing: false }, true), false);
});
