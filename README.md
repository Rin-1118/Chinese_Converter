# Chinese Converter

スマホ優先の中国語変換アプリです。ブラウザ上で次の2系統を扱います。

- 日本語の文や単語を入力して、中国語訳・簡体字・拼音を表示
- 漢字・中国語文を入力して、簡体字と拼音へ変換

## 閲覧方法

開発中に見る場合は、ブラウザで次を開きます。

```text
http://127.0.0.1:5174/
```

ファイルとして直接開く場合は、ビルド後に次を開きます。

```text
/Users/r.y./Library/CloudStorage/OneDrive-TokushimaUniversity/Programing/Chinese_Converter/dist/index.html
```

ルート直下の `index.html` は開発用の入口です。直接ダブルクリックするより、上のURLで見るか、ビルド後の `dist/index.html` を開いてください。

## 重要な制約

日本語から中国語への翻訳は、外部の MyMemory Translation API を使います。Google公式翻訳APIではありません。

外部APIを使うため、インターネット接続が必要です。また、MyMemory API の仕様に合わせて、1回の日本語入力は500バイト以内にしています。長い文章は短く分けて入力してください。

漢字から簡体字・拼音への変換は、ブラウザ内で処理します。

## 起動方法

この環境では pnpm を使っています。

```bash
pnpm install
pnpm run dev
```

本番用ビルド確認:

```bash
pnpm run build
```

npm が入っている環境なら、同じ `package.json` から次でも動かせます。

```bash
npm install
npm run dev
npm run build
```

## 使い方

1. `日本語` タブに日本語の文や単語を入力します。
2. `翻訳` を押すと、中国語訳・簡体字・拼音が表示されます。
3. `漢字` タブに漢字・繁体字・中国語文を入力します。
4. `変換` を押すと、簡体字と拼音が表示されます。
5. 必要なら `履歴` を押して、最近の翻訳・変換を保存します。

履歴はブラウザの `localStorage` に保存されます。別ブラウザや別端末には自動同期されません。

## 出典・依存関係

- MyMemory Translation API: 日本語から中国語への翻訳に使用。API仕様では `q` に翻訳対象、`langpair` に言語ペアを指定し、`q` はUTF-8で最大500バイトとされています。Docs: <https://mymemory.translated.net/doc/spec.php>
- Google Cloud Translation API: Google公式の翻訳API。公式APIを使う場合は Google Cloud 側の設定とAPI利用が必要です。Docs: <https://docs.cloud.google.com/translate/docs/reference/rest>
- OpenCC JS `opencc-js` 1.3.1: 簡体字・繁体字・日本漢字系の変換に使用。Repository: <https://github.com/nk2028/opencc-js>
- pinyin-pro `pinyin-pro` 3.28.1: 漢字から拼音への変換に使用。Repository: <https://github.com/zh-lx/pinyin-pro> / Website: <https://pinyin-pro.cn>
- Vite `vite` 8.0.16: ローカル開発・ビルドに使用。Website: <https://vite.dev>
- Lucide `lucide` 1.21.0: UIアイコンに使用。Website: <https://lucide.dev>

依存関係のバージョンは `package.json` を確認してください。

## 実装上の注意

- 日本語翻訳は MyMemory API の翻訳結果を受け取り、その中国語テキストを簡体字化してから拼音を生成します。
- 漢字変換は `opencc-js` の `jp -> cn`、`tw -> cn`、`hk -> cn` 変換を順に通します。
- 拼音は簡体字化後の文字列から `pinyin-pro` で生成します。
- ユーザー辞書登録、内蔵辞書検索、AIによる訳語補完は行いません。
