# アーキテクチャ

## 概要

Hue は多層アーキテクチャで構築されたネイティブ Windows ファイルエクスプローラーです。

```
┌─────────────────────────────────────────────┐
│           Svelte フロントエンド              │  UI / UX
│         (Wails v2 経由の WebView2)           │
├─────────────────────────────────────────────┤
│             Go バックエンド                  │  アプリロジック / IPC
│   (Wails バインディング + 設定サーバー)       │
├──────────────┬──────────────────────────────┤
│  Zig ネイティブ │  JavaScript プラグイン      │  パフォーマンス / 拡張性
│    (DLL)     │   (実行時ロード)              │
└──────────────┴──────────────────────────────┘
              Windows API / ファイルシステム
```

---

## 各レイヤーの詳細

### Svelte フロントエンド (`apps/explorer/frontend/`)

- WebView2 内でレンダリングされるシングルページアプリ
- Wails が生成した JS バインディング (`wailsjs/`) 経由で Go と通信
- テーマは CSS カスタムプロパティで管理 — リロードなしでリアルタイム切り替え
- 主なコンポーネント: `App.svelte` / `TreeSidebar.svelte` / `FavoritesPane.svelte` / `CommandShortcutsPane.svelte` / `TreeNode.svelte`

### Go バックエンド (`apps/explorer/*.go`)

- Wails アプリのエントリポイントおよび IPC ハンドラー
- パフォーマンスが重要な処理は CGO 経由で Zig DLL を呼び出す
- 設定サーバー: ポート `9271` で HTTP、Vue SPA を配信し JSON API と SSE でライブ同期
- プラグインローダー: `plugins/*.js` を読み込み、サンドボックス内で実行して `hue` API オブジェクトを提供

### Zig ネイティブモジュール (`core/`)

それぞれ Go レイヤーからロードされる `.dll` にコンパイルされます。

| DLL | 役割 |
|---|---|
| `hue_fs.dll` | 高速ディレクトリ列挙 |
| `hue_fileops.dll` | コピー・移動・削除・リネーム |
| `hue_search.dll` | 再帰ファイル検索 |
| `hue_preview.dll` | テキスト・画像プレビュー取得 |
| `hue_thumbnailer.dll` | サムネイル生成 |
| `hue_watcher.dll` | ファイルシステム変更イベント |

### Vue 設定 SPA (`apps/settings/frontend/`)

- Go 設定サーバーから配信される独立した Vite / Vue 3 アプリ
- REST API で設定を読み書き (`GET /settings` / `POST /settings`)
- ライブリロード: 設定サーバーが `settings:changed` SSE イベントを配信し、Svelte アプリが再取得してテーマ・設定を適用

---

## 設定の流れ

```
Vue SPA  →  POST /settings  →  settings_server.go  →  settings.json
                                       │
                              SSE: settings:changed
                                       │
                              Svelte App が再取得
                              テーマ・設定を適用
```

---

## プラグインのライフサイクル

```
起動時
  └─ Go が plugins/*.js をスキャン
       └─ 各ファイルに対して:
            ├─ hue API シムを注入
            ├─ サンドボックス内で JS を実行
            └─ contextMenu / shortcuts を登録

右クリック時
  └─ Svelte が GetContextMenuItems(path) を呼ぶ
       └─ Go が match() でアイテムをフィルタ
            └─ フロントエンドにリストを返す

アイテム選択時
  └─ Svelte が RunContextMenuItem(id, path) を呼ぶ
       └─ Go が action() を呼ぶ → hue.exec() → シェルコマンド実行
```

---

## テーマシステム

テーマはプリセット名とオプションのアクセントカラー上書きとして `settings.json` に保存されます。
`App.svelte` がロード時にプリセットを CSS カスタムプロパティのセットにマッピングし、`<main>` のインラインスタイルとして適用します。

```
settings.themePreset  →  THEME_PRESETS[name]  →  <main> の CSS 変数
settings.accentColor  →  --hue-accent / --hue-accent-dim を上書き
```

全コンポーネントは CSS 変数のみを参照するため、テーマ切り替えは即座に反映されます。
