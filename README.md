# 余剰野菜マーケット

農家向けの余剰野菜販売Webアプリケーション。管理者が商品・在庫を登録し、購入者が注文できるシステムです。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS（レスポンシブ対応）
- **データベース**: Supabase (PostgreSQL)
- **画像ストレージ**: Supabase Storage
- **メール**: Resend
- **ホスティング**: Vercel

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseの設定

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. `supabase-schema.sql`のSQLをSupabaseのSQL Editorで実行
3. SupabaseのStorage設定で`images`バケットを作成（公開設定）

### 3. 環境変数の設定

`.env.local`ファイルを編集し、以下の値を設定:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

## ページ構成

### 購入者向け
- `/` - 商品一覧・カート・注文確定
- `/orders` - 注文履歴検索（名前で検索）
- `/orders/[id]` - 注文詳細

### 管理者向け
- `/admin` - ダッシュボード（商品一覧・在庫管理）
- `/admin/products/new` - 商品新規登録
- `/admin/products/[id]` - 商品編集
- `/admin/orders` - 注文一覧・ステータス管理

## Vercelへのデプロイ

1. GitHubにリポジトリをプッシュ
2. [Vercel](https://vercel.com)でプロジェクトをインポート
3. 環境変数を設定
4. デプロイ

## 機能

- 商品登録・編集・非表示設定
- 在庫管理（クイック更新機能）
- 画像アップロード
- カート機能
- 注文処理（在庫自動減算）
- 注文履歴検索
- 注文ステータス管理
- メール通知（注文時に管理者へ通知）
- レスポンシブデザイン（スマホ・タブレット・PC対応）
