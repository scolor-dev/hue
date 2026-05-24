# プラグイン API リファレンス

プラグインは `hue.exe` と同じフォルダにある `plugins/` ディレクトリに置いた `.js` ファイルです。
起動時に読み込まれ、コンテキストメニューの拡張・キーボードショートカットの追加・コマンドの実行が可能です。

## ファイル形式

```js
// @name      プラグイン名
// @description 設定画面に表示される説明文

// ... hue API を使ったコード ...
```

`@name` と `@description` のヘッダーコメントは必須です。

---

## hue.contextMenu

### `hue.contextMenu.add(item)`

右クリックメニューにアイテムを追加します。

| プロパティ | 型 | 説明 |
|---|---|---|
| `label` | `string` | メニューに表示するテキスト |
| `icon` | `string` | 絵文字またはアイコン文字 |
| `match` | `(entry) => boolean` | このエントリに対してアイテムを表示するか |
| `action` | `(entry) => void` | クリック時に呼ばれる処理 |

**`entry` オブジェクト**

| プロパティ | 型 | 説明 |
|---|---|---|
| `name` | `string` | ファイル・フォルダ名 |
| `path` | `string` | フルパス |
| `isDir` | `boolean` | フォルダかどうか |
| `ext` | `string` | 拡張子（例: `".txt"`） |
| `size` | `number` | ファイルサイズ（バイト） |

**使用例**

```js
hue.contextMenu.add({
  label: 'メモ帳で開く',
  icon: '📝',
  match: (entry) => !entry.isDir,
  action: (entry) => hue.exec('notepad "' + entry.path + '"'),
})
```

---

## hue.shortcuts

### `hue.shortcuts.add(shortcut)`

キーボードショートカットを登録します。

| プロパティ | 型 | 説明 |
|---|---|---|
| `key` | `string` | キー組み合わせ（例: `"ctrl+shift+t"`） |
| `label` | `string` | キー一覧に表示する短いラベル |
| `description` | `string` | 詳細説明 |
| `action` | `(entry\|null) => void` | 現在選択中のエントリを引数に呼ばれる |

**使用例**

```js
hue.shortcuts.add({
  key: 'ctrl+shift+t',
  label: 'ターミナルを開く',
  description: '現在のフォルダで Windows Terminal を開く',
  action: (_entry) => hue.exec('wt -d "' + hue.currentPath + '"'),
})
```

---

## hue.exec

### `hue.exec(command)`

組み込みコンソールパネルでシェルコマンドを実行します。

```js
hue.exec('ping google.com')
hue.exec('cd /d "C:\\Users" && dir')
```

---

## hue.currentPath

現在エクスプローラーで開いているフォルダのフルパス。

```js
hue.exec('explorer "' + hue.currentPath + '"')
```

---

## hue.refresh

### `hue.refresh()`

現在のフォルダのファイル一覧を再読み込みします。
ファイル操作後に呼び出してください。

```js
hue.exec('del "' + entry.path + '"')
setTimeout(() => hue.refresh(), 500)
```

---

## プロンプト入力 (`{input}` / `{input:ラベル}`)

設定画面のコマンドショートカットで `{input}` プレースホルダーが使えます。
`promptEnabled: true` のショートカットは、実行前にユーザーへ入力欄を表示します。

- `{input}` — ラベルなし単一入力
- `{input:ラベル}` — ラベル付き入力欄（複数追加可）

```
git commit -m "{input:コミットメッセージ}" --author "{input:著者 <メール>}"
```
