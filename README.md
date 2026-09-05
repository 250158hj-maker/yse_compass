# YSE Compass

**卒業制作発表会の運営プラットフォーム。** 資料を提出するという行為が、提出管理・発表順の整理・アーカイブを副産物として成立させることを狙う。

卒業制作チーム **Cheers**（水戸・蒲山・鈴木）が開発している。

## 開発環境のセットアップ

**Docker で管理するのは PostgreSQL のみ。Next.js アプリはホストで直接起動する**（2026-09-04 決定・`docs/decisions.md`）。DB の中身（スキーマ）は未確定のため、まだ空のデータベースを用意するだけの構成。

```bash
cp .env.example .env
docker compose up -d db
pnpm install
pnpm dev
```

- アプリ: http://localhost:3000
- DB: localhost:5432（`.env` の値で接続）
- DB 接続確認: http://localhost:3000/api/health/db が `{"status":"ok"}` を返せば接続成功

停止・データ削除:

```bash
docker compose down        # 停止（DB データは残る）
docker compose down -v     # 停止 + DB データも削除
```

> **この構成の正典は `docs/design/08-architecture.md` 8-6（開発・実行環境）。**
> Node / pnpm のバージョンをどこで固定しているか、バンドラを Turbopack に固定した理由、そして **旧構成（アプリもコンテナで動かしていた期間）から移るときに 1 回だけ必要な対処 3 件** はそちらにある。**この README には転記しない**（`CLAUDE.md` 禁則2・二重管理の回避）。
>
> 上の 4 行は CI（`.github/workflows/docker-smoke-test.yml`）が実行している手順そのものなので、**この手順が壊れると CI が落ちる。**

## 設計ドキュメント

**設計の正典は `docs/`。索引は [`docs/README.md`](docs/README.md) が持つ。**

| 知りたいこと | 見るファイル |
| --- | --- |
| 何を作り、何を作らないか | [`docs/requirements.md`](docs/requirements.md) |
| なぜいまの設計がこうなっているか | [`docs/decisions.md`](docs/decisions.md) |
| まだ決まっていないこと・決まるまでの先行方針 | [`docs/open-questions.md`](docs/open-questions.md) |
| 技術スタックと採用理由 | [`docs/design/08-architecture.md`](docs/design/08-architecture.md) 8-1 |
| 基本設計書（01〜10 章） | [`docs/design/`](docs/design/) — **全章が確度「暫定」** |

> **設計に関する問いの答えは `docs/` にある。** Notion に同じ内容が見つかった場合、**そちらが古い**（2026-08-30 決定・`docs/decisions.md`）。
> プロダクト定義・機能一覧・スケジュール（Ph.0・凍結）は Notion `YSE COMPASS COMP.` の企画書が正典。

リポジトリでの作業ルール（正典マップ・禁則・役割分担）は [`CLAUDE.md`](CLAUDE.md) にある。
