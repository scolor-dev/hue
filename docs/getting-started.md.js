# はじめに

## 必要な環境

- Windows 10 / 11 (64-bit)
- [Zig](https://ziglang.org/) 0.13 以上
- [Go](https://go.dev/) 1.21 以上
- [Wails](https://wails.io/) v2
- Node.js 18 以上

## 開発環境のセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/scolor-dev/hue.git
cd hue

# Wails CLI をインストール
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# エクスプローラーアプリを起動 (ホットリロード)
cd apps/explorer
wails dev
```

## 設定UIを単体で起動する

```bash
cd apps/settings/frontend
npm install
npm run dev
# http://localhost:5173 で開く
```

## リリースビルド

```powershell
# リポジトリルートから実行
# Zig DLL + Wails アプリをビルドして hue.zip を生成
.\build.ps1
```

## プロジェクト構成

```
hue/
├── apps/
│   ├── explorer/          # Wails アプリ (Go + Svelte)
│   │   ├── frontend/src/  # Svelte UI コンポーネント
│   │   └── *.go           # Go バックエンド・Wails バインディング
│   └── settings/
│       └── frontend/src/  # Vue 設定 SPA
├── core/                  # Zig ネイティブモジュール (DLL)
│   ├── fileops/           # ファイル操作
│   ├── fs/                # ファイルシステム列挙
│   ├── preview/           # ファイルプレビュー
│   ├── search/            # 検索エンジン
│   ├── thumbnailer/       # サムネイル生成
│   └── watcher/           # ファイルシステム監視
├── examples/plugins/      # JavaScript プラグインサンプル
├── scripts/               # 開発・リリース用ユーティリティ
└── docs/                  # ドキュメント
```
