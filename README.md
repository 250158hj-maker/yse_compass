This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Docker での開発環境

アプリと PostgreSQL を Docker Compose で起動できる。DB の中身（スキーマ）は未確定のため、まだ空のデータベースを用意するだけの構成。

```bash
cp .env.example .env
docker compose up --build
```

- アプリ: http://localhost:3000
- DB: localhost:5432（`.env` の値で接続）
- DB接続確認: http://localhost:3000/api/health/db が `{"status":"ok"}` を返せば接続成功

ソースコードはバインドマウントされているため、ホスト側での編集がそのままコンテナ内の Next.js dev server に反映される（ホットリロード）。`node_modules` と `.next` はコンテナ専用の匿名ボリュームなので、依存関係を変更した場合は `docker compose up --build` でイメージを作り直す。

> **Note**: `next dev` の既定バンドラである Turbopack は、Windows の Docker Desktop 経由のバインドマウントだとホスト側のファイル変更を検知できないことがある（ネイティブのファイル監視イベントがコンテナへ届かない）。そのため `docker-compose.yml` の `app` サービスは `next dev --webpack` で起動し、`WATCHPACK_POLLING=true` と組み合わせてポーリング監視にしている。ホストで直接 `pnpm dev` する場合は Turbopack のままで問題ない。

停止・データ削除:

```bash
docker compose down        # 停止（DBデータは残る）
docker compose down -v     # 停止 + DBデータも削除
```

### アプリはホストで直接動かし、DBだけDockerを使う場合

DBコンテナだけ起動する:

```bash
docker compose up -d db
```

`.env.local` を作成し、`DATABASE_URL` のホストを `db` から `localhost` に変更する（Next.js は `.env.local` を自動で読み込み、`.env` より優先する）。

```bash
# .env.local
DATABASE_URL=postgresql://yse_compass:yse_compass@localhost:5432/yse_compass
```

```bash
pnpm install
pnpm dev
```

http://localhost:3000/api/health/db が `{"status":"ok"}` を返せば接続成功。

> **注意**: 一度 `docker compose up` でアプリコンテナを起動すると、`.next` ディレクトリがroot所有で作られ、その後ホストで直接 `pnpm dev` すると権限エラー（`EACCES`）で起動に失敗することがある。その場合は `rm -rf .next` で削除してから `pnpm dev` を実行し直す。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
