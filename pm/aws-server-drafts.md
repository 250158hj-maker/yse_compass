# AWS サーバーの下書き — 起動の自動化・バックアップ・メモリの実測

> **位置づけ**：AWS 上のサーバー（`../docs/decisions.md` 2026-11-16 の本番環境の行）へ移すとき、インフラ担当が、権限が渡る前に用意できる分（起動の自動化・バックアップ・メモリの見積り）を、下書きとして置く
> **確度**：暫定（レビュー未了・鵜呑みにしない）。**AWS の実機では、何も試していない**
> **正典**：このファイル
> **更新のしかた**：上書き
> **主担当**：蒲山（インフラ担当）
> **最終更新**：2026-11-24（蒲山）

---

## 1. 位置づけと範囲

- **決定ではない。** H-77 ①〜④ の方針は、Issue #157 の 2026-11-23 の水戸さんの返事にある（ここには書き写さない）。決定行は、移行で実機を確かめたあとに別の PR で出す。
- **ここに書くもの**：①メモリの実測（開発 PC）　②起動の自動化（systemd）の下書き　③ `pg_dump` を S3 へ送る下書き　④ 移行のときに直すもの。
- **手順の元**：いまのデモ環境の立て方は `demo-server.md`。ここは、その差分だけを書く。

## 2. メモリの実測（開発 PC・2026-11-23）

水戸さんの返事の「1GB 前後は、動かしている間のメモリで、ビルドは入っていないと読んだ」への答え。

**条件**：開発 PC（WSL2・16 コア・メモリ約 16GB）、Node 24、`main` の `next build --turbopack` と `next start`、DB は Docker の PostgreSQL 16（データは少ない）。各 1〜数回の実測で、AWS の 2 コアの機械ではない。

| 測ったもの | 値 | 読み方 |
| --- | --- | --- |
| `pnpm build` の所要時間 | 約 15 秒 | 16 コアでの値。2 コアでは長くなる（見立て） |
| `pnpm build` の最大メモリ（機械全体の「使用中」の増え方） | **約 3.3GB** | Turbopack が複数のプロセスを並べた結果。コア数が少なければ減る見込みだが、**どれだけ減るかは測っていない** |
| `pnpm build` の最大の 1 プロセス | 約 835MB | `/usr/bin/time -v` の値 |
| `pnpm start`（起動後、`/api/health/db` と `/login` を数回呼んだあと） | 約 165MB（`next-server` のメモリ。機械全体の増え方は約 170MB） | 概要集の生成は含まない |
| PostgreSQL のコンテナ | 約 42MB | データが少ない状態 |

**読み取れること**
- 動かしている間は、`next-server` 約 165MB ＋ PostgreSQL 約 42MB ＋ 概要集の生成の最大 436MB（`../docs/findings.md` F-17 の実写の画像）で、OS と Caddy を足しても 2GB に収まる見込み（**見立て**）。
- **サーバー上でビルドすると、2GB では足りない可能性が高い**（機械全体で 3.3GB 増えた）。2 コアの機械での値は測っていない。移行の段取りの 2 で、**同じ機械でビルドして測る**。足りなければ、水戸さんの返事のとおり、4GB に上げるか、ほかの場所（手元の PC・CI）でビルドして運ぶかを選ぶ。
- 測っていない：同時のアクセス（同時 120 名は、本番の運用の前に回す：#157 の返事）、AWS 上での値。

## 3. 起動の自動化（systemd）の下書き

**目的**：EC2 が起動したとき、PostgreSQL・アプリ・Caddy が手作業なしで立ち上がる（#157 の返事：通しの前に要る）。**以下は、どれも実行していない。** 書き方は systemd の一般的な形で、AWS 上の Ubuntu で確かめるのは移行のとき。

- **PostgreSQL**：`docker-compose.yml` の `restart: unless-stopped` により、Docker が起動すれば DB のコンテナも上がる。Docker を起動時に有効にする（`sudo systemctl enable docker`。`demo-server.md` ステップ 2 と同じ）。
- **アプリ**：`/etc/systemd/system/yse-compass.service`（案）

```ini
[Unit]
Description=YSE Compass (next start)
After=network-online.target docker.service
Requires=docker.service

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/workspace/yse_compass
EnvironmentFile=/home/ubuntu/workspace/yse_compass/.env
Environment=NODE_ENV=production
# DB が healthy になるまで待ってから起動する（demo-server.md ステップ 5 の 1 と同じ）。
ExecStartPre=/usr/bin/docker compose up -d --wait db
# nvm の node は systemd から見えないので、実際のパス（`which node`）に置き換える。
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -p 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

- **ユーザー名・パス**は仮（`ubuntu`）。移行のときに実際の値へ直す。`.env` は、秘密を含むので、権限を `600` にする（`demo-server.md` ステップ 4-2）。
- **Caddy**：公式のパッケージで入れると、systemd の unit が付く（`caddy.service`。**確かめていない**）。`Caddyfile` の中身（ドメイン・証明書の方式）は、H-38 が決まってから置く。
- **有効にする**：`sudo systemctl daemon-reload` → `sudo systemctl enable --now yse-compass`。**確かめること**：EC2 を 1 回止めて起動し、手を入れずに `/api/health/db` が `{"status":"ok"}` を返すまでの時間を測る（水戸さんの返事が求める「起動から使えるまでの時間」）。

## 4. `pg_dump` を S3 へ送る下書き

**水戸さんの仮置き（受付の間）**：動かした日ごとに、止める前にその日の分が S3 に入っている（#157 の返事。決定ではない）。

**手元で確かめたこと**（2026-11-23、開発 PC の Docker の DB）：下の `pg_dump` の呼び方で、終了コード 0・約 54KB のダンプができ、`pg_restore --list` でダンプの中身（161 項目）を読めた。**S3 への送信は、していない**（AWS CLI も、バケットも無い）。**戻し（`pg_restore`）は、2026-11-24 に、ローカルで 1 回通した**（`../docs/findings.md` F-24。別のコンテナの DB に戻し、件数・画像の md5・シーケンス・`prisma migrate status`・概要集の生成が元と同じだった）。

```bash
#!/usr/bin/env bash
# /usr/local/bin/yse-backup.sh（案）。止める前にその日の分を S3 へ送る。
set -euo pipefail
cd /home/ubuntu/workspace/yse_compass
BUCKET="s3://<バケット名>/pg_dump"          # 仮。公開アクセスを塞いだ専用のバケット（バージョニングあり）
FILE="/tmp/yse_compass-$(date +%Y%m%d-%H%M%S).dump"

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$FILE"
# 空のダンプを送らない。中身が読めることを確かめてから送る。
docker compose exec -T db pg_restore --list < "$FILE" > /dev/null
aws s3 cp "$FILE" "$BUCKET/"
rm -f "$FILE"
```

- **ダンプには学校のメールアドレスと氏名が入る**（#157 の返事）。バケットは公開アクセスを全部塞ぎ、ダンプは `/tmp` に残さない（上の `rm`）。EC2 に付ける IAM の権限は、このバケットへの書き込みだけに絞る（案。実機では未確認）。
- **世代は消さない**（12/18 まで。#157 の返事）。世代数と期間は、G-2 が決まってから。
- **動かし方**：止める前に手で実行する形から始める。時刻での起動・停止（EventBridge Scheduler。受付の前に入れる）と合わせて、停止の直前に動かす形にするのは、そのとき決める。
- **戻しの練習**：別のサーバーまたは別の DB に `pg_restore` して、画面で見られるところまで、1 回通す（受付を開ける前）。**ローカルでは 2026-11-24 に通した**（`../docs/findings.md` F-24。画面は動かさず、データ層の概要集の生成まで）。**AWS 上のサーバーと S3 を使う練習は、未実施。** 戻したあとの確かめは、件数・画像の md5・シーケンスの値・`prisma migrate status` で行える。制約は、戻すと CHECK の式の書き方が変わるので、定義の文字列では比べない（F-24）。

## 5. 移行のときに直すもの

- **`docker-compose.yml` の `ports`**：2026-11-23 時点では `"5432:5432"`。AWS では `"127.0.0.1:5432:5432"` に限る（#157 の返事）。直す変更は #346。
- **セキュリティグループ**：443 だけを開け、SSH は必要なときだけ、接続元を絞る（H-77 ②）。
- **AWS の料金**：米国の参考値で見積もっている。東京の値は、権限が渡ってから料金計算ツールで掛け直す（#157）。

## 関連

- `demo-server.md`（いまのデモ環境の手順）
- `../docs/open-questions.md` H-77・P-6・G-2
- `../docs/findings.md` F-12（バックアップ）・F-17・F-23（生成のメモリと時間）
