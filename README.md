# Hue — 使用言語

| 色  | 言語 | 主担当 | 目標使用量 |
| -- | ---------- | --------------------------- | ---- |
| 🔴 | Svelte     | Main UI / UX                | 20% |
| 🟠 | Zig        | Native core / editor engine | 15% |
| 🟡 | JavaScript | Plugins / scripting         | 14% |
| 🟢 | Vue        | Settings / dashboard        | 13% |
| ☁️ | Go         | CLI / tooling / API         | 12% |
| 🔵 | Python     | AI / tests / automation     | 11% |
| 🟣 | Elixir     | Realtime collaboration      | 10% |
| ⬜ | その他      | config / shell 等            |  5% |

---

# 世界観

```txt
Svelte → 体験
Zig → 性能
JavaScript → 拡張性
Vue → 構造化UI
Go → 実務基盤
Python → 知能
Elixir → リアルタイム
```

---

# 推奨フォルダ構成

```txt
hue/
├── apps/
│   ├── explorer/               # 🔴 Svelte (Wails) - メインウィンドウ
│   ├── settings/               # 🟢 Vue - 設定画面
│   └── sync/                   # 🟣 Elixir - リアルタイム同期サーバー
│
├── core/
│   ├── fs/                     # 🟠 Zig - ファイルシステム走査
│   ├── watcher/                # 🟠 Zig - ファイル変更監視
│   ├── thumbnailer/            # 🟠 Zig - サムネイル生成
│   └── preview/                # 🟠 Zig - 画像・PDF・動画・コードのプレビュー処理
│
├── ui/
│   ├── components/             # 🔴 Svelte - 共通コンポーネント
│   ├── panels/                 # 🔴 Svelte - ファイルパネル・プレビュー
│   ├── toolbar/                # 🔴 Svelte - ツールバー・パンくず
│   └── themes/                 # 🔴 Svelte - テーマ
│
├── services/
│   ├── indexer/                # ☁️ Go - バックグラウンドインデックス
│   ├── operations/             # ☁️ Go - ファイル操作（コピー・移動・削除）
│   └── cli/                    # ☁️ Go - CLI
│
├── ai/                         # 🔵 Python
│   ├── search/                 # セマンティック検索
│   ├── tagging/                # 自動タグ付け
│   ├── summary/                # ファイル内容要約
│   ├── organizer/              # 整理提案
│   └── embeddings/             # ファイルエンベディング
│
├── plugins/                    # 🟡 JavaScript
│   ├── context-menu/           # 右クリックメニュー拡張
│   ├── preview/                # カスタムプレビュー
│   ├── actions/                # カスタムアクション
│   └── themes/                 # テーマプラグイン
│
├── tests/
│   ├── ui/                     # 🔴 Svelte
│   ├── core/                   # 🟠 Zig
│   ├── services/               # ☁️ Go
│   ├── ai/                     # 🔵 Python
│   ├── plugins/                # 🟡 JavaScript
│   └── sync/                   # 🟣 Elixir
│
├── examples/
│   ├── plugins/                # 🟡 JavaScript
│   ├── themes/                 # 🔴 Svelte
│   └── ai-tools/               # 🔵 Python
│
├── scripts/
│   ├── build/                  # ☁️ Go
│   ├── generate/               # 🔵 Python
│   └── release/                # 🟡 JavaScript
│
├── docs/
│
├── .github/
│
├── build.zig
├── go.mod
├── mix.exs
└── package.json
```

---

# 目標使用量を維持するコツ

| 言語         | 増やし方                 |
| ---------- | -------------------- |
| Svelte     | UI component大量作成     |
| Zig        | benchmark / renderer |
| JavaScript | plugins / examples   |
| Vue        | settings限定           |
| Go         | tooling / CLI        |
| Python     | AI / tests           |
| Elixir     | collaboration限定      |

---

# かなり重要なルール

## 🔴 Svelte

```txt
「ユーザーが直接触る場所」
```

全部ここ。

---

## 🟠 Zig

```txt
「速度が必要な場所」
```

全部ここ。

---

## 🟡 JavaScript　

```txt
「ユーザーが拡張する場所」
```

全部ここ。

---

## 🟢 Vue

```txt
「整理された設定UI」
```

専用。

---

## ☁️ Go

```txt
「裏方インフラ」
```

担当。

---

## 🔵 Python

```txt
「AIと自動化」
```

担当。

---

## 🟣 Elixir

```txt
「リアルタイム同期」
```

専用。

---