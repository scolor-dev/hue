# 設定リファレンス

設定は `%APPDATA%\hue\settings.json` に JSON 形式で保存されます。
設定 UI（🔧 アイコンから起動）または直接ファイルを編集して変更できます。

## 全フィールド一覧

```json
{
  "showHidden": false,
  "dateFormat": "datetime",
  "previewWidth": 220,
  "thumbSize": 128,
  "language": "ja",
  "sortBy": "name",
  "sortAsc": true,
  "showExtensions": true,
  "confirmDelete": true,
  "favorites": [],
  "commandShortcuts": [],
  "startupMode": "home",
  "startupFixedPath": "",
  "lastPath": "",
  "clickToOpen": "double",
  "disabledPlugins": [],
  "themePreset": "dark",
  "accentColor": ""
}
```

---

## フィールド詳細

### 表示設定

| フィールド | 型 | デフォルト | 説明 |
|---|---|---|---|
| `showHidden` | boolean | `false` | 隠しファイルを表示する |
| `showExtensions` | boolean | `true` | ファイル名に拡張子を表示する |
| `dateFormat` | string | `"datetime"` | 更新日時の表示形式（下記参照） |
| `thumbSize` | number | `128` | サムネイルサイズ（px） |
| `previewWidth` | number | `220` | プレビューパネルの幅（px） |
| `language` | string | `"ja"` | UI 言語（`"ja"` / `"en"`） |

**`dateFormat` の値**

| 値 | 表示例 |
|---|---|
| `"datetime"` | 2026-05-24 14:30 |
| `"date"` | 2026-05-24 |
| `"relative"` | 3分前 |

---

### 並び替え

| フィールド | 型 | デフォルト | 説明 |
|---|---|---|---|
| `sortBy` | string | `"name"` | 並び順の基準（`"name"` / `"size"` / `"date"`） |
| `sortAsc` | boolean | `true` | 昇順ならば `true`、降順ならば `false` |

---

### 操作設定

| フィールド | 型 | デフォルト | 説明 |
|---|---|---|---|
| `clickToOpen` | string | `"double"` | ファイルを開くクリック数（`"single"` / `"double"`） |
| `confirmDelete` | boolean | `true` | 削除前に確認ダイアログを表示する |

---

### 起動設定

| フィールド | 型 | デフォルト | 説明 |
|---|---|---|---|
| `startupMode` | string | `"home"` | 起動時に開くフォルダ（下記参照） |
| `startupFixedPath` | string | `""` | `startupMode` が `"fixed"` のときのパス |
| `lastPath` | string | `""` | 前回開いていたフォルダ（自動更新） |

**`startupMode` の値**

| 値 | 動作 |
|---|---|
| `"home"` | ホームフォルダ（`%USERPROFILE%`）を開く |
| `"last"` | 前回開いていたフォルダを復元する |
| `"fixed"` | `startupFixedPath` で指定したフォルダを開く |

---

### テーマ設定

| フィールド | 型 | デフォルト | 説明 |
|---|---|---|---|
| `themePreset` | string | `"dark"` | カラープリセット名（下記参照） |
| `accentColor` | string | `""` | アクセントカラーの上書き（空文字でプリセット値を使用） |

**プリセット一覧**

| 値 | 概要 |
|---|---|
| `"dark"` | VS Code ライクなダークテーマ |
| `"darker"` | より暗いダークテーマ |
| `"midnight"` | 深い青みがかったダークテーマ |
| `"forest"` | 緑系のダークテーマ |
| `"sunset"` | オレンジ系の暖色テーマ |
| `"ocean"` | シアン系の海テーマ |

---

### プラグイン設定

| フィールド | 型 | 説明 |
|---|---|---|
| `disabledPlugins` | string[] | 無効化するプラグインのファイル名リスト |

---

### お気に入り

| フィールド | 型 | 説明 |
|---|---|---|
| `favorites` | string[] | お気に入りに登録したフォルダのフルパス一覧 |

---

### コマンドショートカット

`commandShortcuts` は以下の構造を持つオブジェクトの配列です。

```json
{
  "id": "一意なID（自動生成）",
  "label": "表示ラベル",
  "icon": "絵文字",
  "command": "実行するコマンド。{input} または {input:ラベル} でユーザー入力を挿入",
  "executionMode": "current",
  "fixedPath": "",
  "promptEnabled": false,
  "promptMessage": "",
  "promptPlaceholder": ""
}
```

| フィールド | 値 | 説明 |
|---|---|---|
| `executionMode` | `"current"` / `"fixed"` | コマンドの実行ディレクトリ |
| `promptEnabled` | boolean | 実行前にユーザー入力欄を表示するか |
