# 08. 方式設計

> **位置づけ**：どの技術で、どんな層構成で、どこに置いて動かすかを答える
> **確度**：**暫定（レビュー未了）**
> **正典**：このファイル（**技術スタックの一覧は `../../CLAUDE.md` §5**）
> **更新のしかた**：上書き
> **主担当**：蒲山
> **最終更新**：2026-09-04（蒲山・水戸レビュー指摘1〜5を反映）

## この章が答える問い

**要件を成立させる技術的な骨格は何か。** 機能設計（03）が「何をするか」なら、この章は「何の上で動くか」。

## 書かないもの

| 書かないこと | 参照先 |
| --- | --- |
| 技術スタックの一覧そのもの | `../../CLAUDE.md` §5（**再掲しない。採用理由だけ書く**） |
| 性能・可用性の目標値 | `09-nfr.md` |
| Google との IF | `07-interface.md` |

> **バッチ・スケジューラの節は置かない。** 設計原則「状態遷移は先生の明示操作を正とし、時刻・条件による自動遷移は持たない」（`../requirements.md` §3 冒頭）の帰結として、設計に存在しない。

---

## 8-1. 技術スタックと採用理由

| 層 | 採用 | バージョン方針 | 採用理由 | 出典 |
| --- | --- | --- | --- | --- |
| 言語 | TypeScript（strict） | Ph.2 で `package.json` 固定 | Next.js 標準構成。`strict` により実装時の型不整合を設計段階の意図から検出できる | `tsconfig.json`（`../../CLAUDE.md` §5 はフレームワークとしての TypeScript 採用のみを定め、`strict` 化は実装側の判断） |
| フレームワーク | Next.js 16（App Router） | 同上 | 要件の中心は CRUD とメタデータ表示（実体レス・§1-1）で、Server Component 優先の App Router により API 層を薄く保てる | `package.json`（`../../CLAUDE.md` §5 は Next.js 採用のみを定め、具体バージョンは「Ph.2 で固定」としか言っていない） |
| UI ライブラリ | React 19 ＋ React Compiler 有効 | 同上 | 手動メモ化（`useMemo`/`useCallback`）を書かずに再描画コストを抑制できる。`next.config.ts` の `reactCompiler: true` で有効化済み | `package.json`・`next.config.ts`（**React Compiler の採用は `../../CLAUDE.md` §5・企画書 §2-3 いずれにも記載が無い。`../open-questions.md` H-18 参照**） |
| スタイル | Tailwind CSS 4 | 同上 | ユーティリティクラスで完結し、画面数が多い割にデザインシステムを別途持つ規模ではない | `package.json`（**採用は `../../CLAUDE.md` §5・企画書 §2-3 いずれにも記載が無い。`../open-questions.md` H-18 参照**） |
| DB | PostgreSQL 16（Docker イメージ `postgres:16-alpine`） | 同上 | `../../CLAUDE.md` §5 の確定採用。関係モデルで足りるデータ形状（06 データ設計は未着手のため詳細は未定） | `../../CLAUDE.md` §5・`docker-compose.yml` |
| DB アクセス | **`pg`（Node.js 標準ドライバ）を直接使用** ← 正典（Prisma）との乖離あり | 未確定 | 下記「ORM の採用方針」参照 | `src/app/api/health/db/route.ts` |
| 認証 | Auth.js ＋ Google Workspace OAuth（未実装・未検証） | 検証は設計フェーズ後半 | 学校 Google アカウントとの統合が前提。**OAuth が通るかが最大の技術リスク** | `../requirements.md` §5 |
| パッケージマネージャ | pnpm | — | `../../CLAUDE.md` 既定 | `../../CLAUDE.md` |
| 開発環境 | Docker（`node:24-alpine` ベース、`dev` ステージ） | — | ホストの Node バージョン差異を吸収。DB のみ Docker・アプリはホスト直起動も選択可（8-6） | `Dockerfile`・`docker-compose.yml` |

### ORM の採用方針 — 正典との乖離が未決着（旧 監査 M-1・H-17 として正式昇格）

`../../CLAUDE.md` §5 は ORM に **Prisma** を挙げているが、`main` の現状の実装（`src/app/api/health/db/route.ts` の DB 疎通確認）は `pg` の `Pool` を直接使っており、`package.json` に Prisma 系パッケージは無い。**この乖離自体は 2026-09-03 の三者整合性監査で M-1 として既に見つかっていたが、`open-questions.md` への起票が漏れていた。本章の執筆時に実物を再確認し、H-17 として正式に昇格させた。**

- **現状の性質**：`main` の `src/` は DB 疎通確認用の 1 エンドポイントのみで、業務データへのアクセス層はまだ存在しない（`src/lib/mock/*` 等のモックデータは鈴木さんの `feature/mock`（未マージ）側にあり、統合後に業務データのアクセス層を書く際に本項の判断が要る）
- **Prisma の出どころ**：`CLAUDE.md` §5 の Prisma は独自の技術選定ではなく、**企画書 §2-3「ソフトウェア構成」に明記された、凍結済み Ph.0 成果物**が出どころ。現行スケジュールの **W13（9/11〜9/17）に「DB接続・Prisma セットアップ・マイグレーション」が予定**されている
- **判断が要る点**：06 データ設計のテーブル定義をコードに落とす際、Prisma のスキーマ駆動（マイグレーション・型生成）を使うか、`pg` を直接使い続けるか。**採否の決着は水戸が `decisions.md` で行う（期限：W13 開始＝9/11）**
- **先行方針（Stage 1）**：06 のアクセス層に着手するまでは `pg` 直接のまま。理由は次の2点
  1. 06 データ設計が未着手で ER の形（H-6・H-3・#7・#8・#10・`cond`）がこれから動くため、いま ORM を決める判断材料が揃っていない。かつ、決めなくても現時点では何も壊れない
  2. `pg` は既に疎通確認で動作しており、切り替えは後からでも移行コストが局所的（アクセス層はまだ 1 箇所）
- **決着したときに変わる箇所**：本表の「DB アクセス」行、`../../CLAUDE.md` §5 の ORM 行、`06-data.md` のスキーマ定義の書式
- **未決 ID**：`../open-questions.md` **H-17**（旧 M-1）

---

## 8-2. システム構成図

```mermaid
flowchart LR
    subgraph 学内ネットワーク
        Browser["ブラウザ<br/>(先生・生徒)"]
    end

    subgraph "本番環境(未確定・8-7)"
        App["Next.js アプリ<br/>(単一コンテナ・App Router)"]
        DB[("PostgreSQL")]
    end

    subgraph Google["Google Workspace（学校アカウント）"]
        OAuth["OAuth 認可サーバー"]
        Drive["Google Drive<br/>(資料の実体・外部)"]
    end

    Browser -- "HTTPS" --> App
    App -- "SQL" --> DB
    Browser -- "認証" --> OAuth
    OAuth -. "セッション確立後" .-> App
    Browser -- "別タブ遷移(§3-5)" --> Drive
```

- **構成要素はブラウザ・Next.js アプリ・PostgreSQL の3つのみ。** メッセージキュー・キャッシュ層・バッチサーバーは置かない（設計原則の帰結）
- **Google Drive は資料の実体置き場であり、アプリからは直接アクセスしない**（Stage 1＝リンク登録・`../open-questions.md` #10）。ブラウザから別タブで直接遷移する（`../requirements.md` §3-5）
- **Google OAuth との接続は認証（ログイン）時のみ**発生し、以降のリクエストはアプリのセッションで完結する（Auth.js の標準パターン）

---

## 8-3. アプリケーション層構成

```mermaid
flowchart TB
    subgraph "Presentation(app/)"
        SC["Server Component<br/>(既定・データ取得はここで完結させる)"]
        CC["Client Component<br/>(セッション状態・フォーム入力・モーダル等のUIローカル状態のみ)"]
    end
    subgraph "Application(未実装)"
        SA["Server Action / Route Handler<br/>(書き込み・機微な読み取りの入口)"]
    end
    subgraph "Data Access(未実装)"
        Repo["データアクセス層<br/>(想定：06-dataのテーブル定義への薄いラッパー)"]
    end
    DB[("PostgreSQL")]

    SC --> Repo
    CC -- "呼び出し" --> SA
    SA --> Repo
    Repo --> DB
```

- **責務分界の原則**：一覧・詳細等の**読み取り**は Server Component が Data Access 層を直接呼ぶ。**書き込みと機微な読み取り**（ロール判定が要るもの）は必ず Server Action / Route Handler を経由させ、そこで権限判定を行う。画面側の表示制御は二次的な UX であって防御ではない（`../open-questions.md` **H-16** 先行方針をそのまま適用）
- **現状の実態との差分**：`main` の `src/` は DB 疎通確認（`api/health/db/route.ts`）と雛形の4ファイル（`layout.tsx`／`page.tsx`／`globals.css`／`favicon.ico`）のみで、Data Access 層・Server Action 層は存在しない。**`src/lib/mock/*`・`SessionContext`・`AuthGuard`・`RoleGate` は、鈴木さんの `feature/mock`（未マージ）に実装されているモックであり、`main` にはまだ無い。** 統合後の実態としては、すべての画面が `src/lib/mock/*` のインメモリ配列を直接参照し、認可も `SessionContext`（`localStorage` の persona 切り替え）による**クライアント側の見た目の出し分けのみ**という、H-16 が指摘する状態そのものになる見込み。06 データ設計の骨格が引けた時点（K2）で、Data Access 層と Server Action の導入に着手する
- **Client Component の範囲は限定する**：セッション状態、認証ガード、ロールに応じた表示切り替え、フォームの入力状態、モーダル・確認ダイアログの開閉。**一覧・詳細のデータ取得を Client Component 側で行わない**（Server Component 優先の原則・8-4）。`feature/mock`（未マージ）はこの範囲を `SessionContext`／`AuthGuard`／`RoleGate` として実装しており、統合後の実装もこの3コンポーネントの役割分担を踏襲する想定

---

## 8-4. 状態管理とデータ取得の方針

- **原則**：Server Component を既定とし、取得したデータはページ単位で完結させる。グローバルなクライアント状態管理ライブラリ（Redux・Zustand 等）は導入しない — 要件の大半は「一覧を見る・フォームを送る」の単純な往復で、状態管理の複雑さに見合う UI 遷移が無い
- **Client Component が持ってよい状態**：認証セッション（`feature/mock`（未マージ）実装では `SessionContext`）、フォームの未送信入力、UI のローカルな開閉状態のみ。**サーバーから取得したデータのキャッシュや同期はクライアント側で持たない**
- **再検証（revalidate）のタイミング**：
  - 通常の一覧・詳細画面は、遷移・再読み込み時の Server Component 再実行で最新化する（Next.js の既定動作）
  - 当日タイムテーブルの進行状態のみ特別扱いが要る（8-5）

---

## 8-5. 当日進行の伝播方式

- **要件**：`../requirements.md` §3-10。先生が「発表中」を切り替えると、聴く生徒の画面へ反映する必要がある
- **先行方針（Stage 1）**：**手動リロード**。生徒側画面に更新ボタンを置くのみで、自動更新機構は持たない（`../open-questions.md` **#4** 先行方針）
- **決定後（M1 で決着予定）に変わる箇所**：同時アクセス 120 名が確定済み（`../requirements.md` §4 性能）で、判断基準（2026-07-24 言語化）を適用すればポーリングで即断できる状態にある。ポーリングに決した場合：
  - 生徒側のタイムテーブル画面が、一定間隔で当日進行状態のみを再取得する
  - **間隔の根拠は `09-nfr.md` の応答時間目標に従う**（`../open-questions.md` **G-3**・性能目標値が正典に無いため未確定。目標値が決まればポーリング間隔の上限はそこから逆算する）
  - SSE・WebSocket は「規模が問題かつ実装コストが妥当な場合」の選択肢だが、追加基盤（コネクション管理）が要り、120 名規模ではポーリングで足りる見込みが高い
- **未決 ID**：`../open-questions.md` **#4**（決定待ち＝M1）・**G-3**（間隔の根拠）

---

## 8-6. 開発・実行環境

### Docker 構成

- `Dockerfile`：`node:24-alpine` ベース。`deps` ステージで `pnpm install --frozen-lockfile`、`dev` ステージでソース一式をコピーし `pnpm dev` を実行
- `docker-compose.yml`：`db`（`postgres:16-alpine`）と `app`（`Dockerfile` の `dev` ターゲット）の2サービス。`app` は `db` の healthcheck 通過後に起動する
- **Turbopack の制約**：`next dev` の既定バンドラ（Turbopack）は、Windows の Docker Desktop 経由のバインドマウントだとホスト側のファイル変更を検知できないことがある。`docker-compose.yml` は `WATCHPACK_POLLING=true`（webpack 用のポーリング監視フラグ）を既に設定していたが、`app` サービスの起動コマンドが既定の Turbopack のままで、このフラグが効いていなかった。**本 PR で `app` サービスに `command: pnpm exec next dev --webpack` を追加し、変数を実際に効かせるようにした。** ホストで直接 `pnpm dev` する場合は Turbopack のままでよい

### 環境変数

- `.env.example` をコピーして `.env` を作成（`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `DATABASE_URL`）
- ホストで直接 `pnpm dev` し DB だけ Docker を使う場合は、`.env.local` で `DATABASE_URL` のホスト名を `db` → `localhost` に変える（Next.js は `.env.local` を `.env` より優先して読む）

### ローカル起動手順（2通り）

| 手順 | 用途 |
| --- | --- |
| `cp .env.example .env` → `docker compose up --build` | アプリ・DB とも Docker（ホットリロードはバインドマウント経由） |
| `docker compose up -d db` → `.env.local` 作成 → `pnpm install` → `pnpm dev` | アプリはホスト直起動、DB のみ Docker（Turbopack を使える） |

- 疎通確認：`http://localhost:3000/api/health/db` が `{"status":"ok"}` を返せば DB 接続成功
- **既知の落とし穴**：Docker でアプリコンテナを起動した後にホストで直接 `pnpm dev` すると、`.next` が root 所有になり `EACCES` で失敗することがある。`rm -rf .next` してから再実行する

---

## 8-7. デプロイ構成

**保留。** 本番環境（インターネット経由／イントラネット）が未確定（`../requirements.md` §5・企画書 §2-2）。判断期限を学校側と合意する必要があり、水戸がステークホルダー対応として調整中（`../open-questions.md` §7・対面ヒヤリングでの回収項目）。

- 決まり次第、次を書く：ホスティング先・コンテナ実行環境・DB のマネージド or 自前運用・HTTPS 終端・ビルド〜デプロイの手順
- 依存する未決：本番環境の選定そのもの（設計原則上、時刻・条件による自動遷移を持たないため、デプロイ構成自体に自動化のスコープ差は生じない想定）

---

## 現在の状態

**書き切った。8-7（デプロイ構成）のみ、本番環境の未確定により保留。**

執筆・レビューにあたり `../open-questions.md` を2件更新した。

- **H-17**：ORM が正典（Prisma）と実装（`pg` 直接）で乖離している。2026-09-03 の三者整合性監査で M-1 として既出だったが起票が漏れていたものを、本章の執筆時に正式に昇格させた（`../findings.md` F-01）
- **H-18**（新規）：UI 層の追加採用（Tailwind CSS 4・React Compiler）が `../../CLAUDE.md` §5・企画書 §2-3 いずれにも記載が無いまま実装されている（レビュー指摘を受けて起票）

あわせて、`docker-compose.yml` の `WATCHPACK_POLLING=true` が Turbopack 起動のため効いていなかった不整合を修正し（`app` サービスに `command: pnpm exec next dev --webpack` を追加）、8-3・8-6 の「現状の実装」の記述を `main` の実態（`feature/mock` は未マージ）に合わせて訂正した。
