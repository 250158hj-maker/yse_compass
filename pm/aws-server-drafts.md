# AWS サーバーの下書き — 起動の自動化・バックアップ・メモリの実測

> **位置づけ**：AWS 上のサーバー（`../docs/decisions.md` 2026-11-16 の本番環境の行）へ移すとき、インフラ担当が、権限が渡る前に用意できる分（起動の自動化・バックアップ・メモリの見積り）を、下書きとして置く
> **確度**：暫定（レビュー未了・鵜呑みにしない）。**AWS の実機では、何も試していない**
> **正典**：このファイル
> **更新のしかた**：上書き
> **主担当**：蒲山（インフラ担当）
> **最終更新**：2026-11-28（蒲山）

---

## 1. 位置づけと範囲

- **決定ではない。** H-77 ①〜④ の方針は、Issue #157 の 2026-11-23 の水戸さんの返事にある（ここには書き写さない）。決定行は、移行で実機を確かめたあとに別の PR で出す。
- **ここに書くもの**：①メモリの実測（開発 PC）　②起動の自動化（systemd）の下書き　③ `pg_dump` を S3 へ送る下書き　④ 移行のときに直すもの　⑤ 移行の当日のチェックリスト（§6）。
- **手順の元**：いまのデモ環境の立て方は `demo-server.md`。ここは、その差分だけを書く。

## 2. メモリの実測（開発 PC・2026-11-23）

水戸さんの返事の「1GB 前後は、動かしている間のメモリで、ビルドは入っていないと読んだ」への答え。

**条件**：開発 PC（WSL2・16 コア・メモリ約 16GB）、Node 24、`main` の `next build --turbopack` と `next start`、DB は Docker の PostgreSQL 16（データは少ない）。各 1〜数回の実測で、AWS の 2 コアの機械ではない。

| 測ったもの | 値 | 読み方 |
| --- | --- | --- |
| `pnpm build` の所要時間 | 約 15 秒 | 16 コアでの値。2 コア・2GB の Docker の制限では約 20〜24 秒（`../docs/findings.md` F-25） |
| `pnpm build` の最大メモリ（機械全体の「使用中」の増え方） | **約 3.3GB** | Turbopack が複数のプロセスを並べた結果。コア数が少なければ減る。2 コア・2GB の Docker の制限では約 1.65GB（F-25。cgroup の `anon` の最大で、この 3.3GB とは測り方が違う）。**EC2 では測っていない** |
| `pnpm build` の最大の 1 プロセス | 約 835MB | `/usr/bin/time -v` の値 |
| `pnpm start`（起動後、`/api/health/db` と `/login` を数回呼んだあと） | 約 165MB（`next-server` のメモリ。機械全体の増え方は約 170MB） | 概要集の生成は含まない |
| PostgreSQL のコンテナ | 約 42MB | データが少ない状態 |

**読み取れること**
- 動かしている間は、`next-server` 約 165MB ＋ PostgreSQL 約 42MB ＋ 概要集の生成の最大 436MB（`../docs/findings.md` F-17 の実写の画像）で、OS と Caddy を足しても 2GB に収まる見込み（**見立て**）。
- **サーバー上でビルドすると、2GB では足りない可能性が高い**（機械全体で 3.3GB 増えた）。2 コア・2GB の Docker の制限での値は測った（F-25：通ったが、余裕は小さい）。移行の段取りの 2 で、**EC2 の同じ機械でビルドして測る**。足りなければ、水戸さんの返事のとおり、4GB に上げるか、ほかの場所（手元の PC・CI）でビルドして運ぶかを選ぶ。
- 測っていない：同時のアクセス（同時 120 名は、本番の運用の前に回す：#157 の返事）、AWS 上での値。

## 3. 起動の自動化（systemd）の下書き

**目的**：EC2 が起動したとき、PostgreSQL・アプリ・Caddy が手作業なしで立ち上がる（#157 の返事：通しの前に要る）。**以下は、どれも実行していない。** 書き方は systemd の一般的な形で、AWS 上の Ubuntu で確かめるのは移行のとき。

- **PostgreSQL**：`docker-compose.yml` の `restart: unless-stopped` により、Docker が起動すれば DB のコンテナも上がる。Docker を起動時に有効にする（`sudo systemctl enable docker`。`demo-server.md` ステップ 2 と同じ）。
- **アプリ**：`/etc/systemd/system/yse-compass.service`（案）

```ini
[Unit]
Description=YSE Compass (next start)
Wants=network-online.target
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
# 3000 番は Caddy からだけ使うので、127.0.0.1 で待ち受ける（-H が無いと全部の宛先で待ち受ける）。
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

- **ユーザー名・パス**は仮（`ubuntu`）。移行のときに実際の値へ直す。`.env` は、秘密を含むので、権限を `600` にする（`demo-server.md` ステップ 4-2）。
- **Caddy**：公式のパッケージで入れると、systemd の unit が付く（`caddy.service`。2026-11-28 に、Ubuntu 24.04 のコンテナで公式の apt の手順から入れて、付くことを確かめた。`User=caddy`・`ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile`。既定の `Caddyfile` は `:80` の静的ファイルの配信なので、中身を置き換える）。`Caddyfile` の中身（ドメイン・証明書の方式）は、H-38 が決まってから置く。
- **有効にする**：`sudo systemctl daemon-reload` → `sudo systemctl enable --now yse-compass`。**確かめること**：EC2 を 1 回止めて起動し、手を入れずに `/api/health/db` が `{"status":"ok"}` を返すまでの時間を測る（水戸さんの返事が求める「起動から使えるまでの時間」）。

## 4. `pg_dump` を S3 へ送る下書き

**水戸さんの仮置き（受付の間）**：動かした日ごとに、止める前にその日の分が S3 に入っている（#157 の返事。決定ではない）。

**手元で確かめたこと**（2026-11-23、開発 PC の Docker の DB）：下の `pg_dump` の呼び方で、終了コード 0・約 54KB のダンプができ、`pg_restore --list` でダンプの中身（161 項目）を読めた。**本物の S3 への送信は、していない**（S3 互換のモックへの送信と、失敗したときの動きは、2026-11-24 に Docker で確かめた：`../docs/findings.md` F-25。下のスクリプトの `umask`・`mktemp`・`trap` は、そのとき測った形。最初の `find` で古いダンプを消す行は、2026-11-28 に足した）。**戻し（`pg_restore`）は、2026-11-24 に、ローカルで 1 回通した**（`../docs/findings.md` F-24。別のコンテナの DB に戻し、件数・画像の md5・シーケンスが元と同じで、概要集のページ数・ファイル名が同じだった。`prisma migrate status` も通ったが、適用の記録だけを見るので、表や列の欠けは分からない）。

```bash
#!/usr/bin/env bash
# /usr/local/bin/yse-backup.sh（案）。止める前にその日の分を S3 へ送る。
set -euo pipefail
cd /home/ubuntu/workspace/yse_compass
BUCKET="s3://<バケット名>/pg_dump"          # 仮。公開アクセスを塞いだ専用のバケット（バージョニングあり）
# ダンプに氏名とメールアドレスが入るので、作るファイルを自分だけが読める権限（600）にする。
umask 077
# 前の実行が SIGKILL で止まると trap が動かず、ダンプが残る（findings.md F-25）。最初に消しておく。
find /tmp -maxdepth 1 -name 'yse_compass-*.dump' -user "$(id -u)" -delete
FILE="$(mktemp /tmp/yse_compass-XXXXXX.dump)"
# 途中で失敗しても（set -e で止まっても）、ダンプを残さない。
trap 'rm -f "$FILE"' EXIT

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$FILE"
# 空のダンプを送らない。中身が読めることを確かめてから送る。
docker compose exec -T db pg_restore --list < "$FILE" > /dev/null
aws s3 cp "$FILE" "$BUCKET/yse_compass-$(date +%Y%m%d-%H%M%S).dump"
```

- **ダンプには学校のメールアドレスと氏名が入る**（#157 の返事）。バケットは公開アクセスを全部塞ぎ、ダンプは `/tmp` に残さない（上の `trap`。失敗したときと `SIGTERM` でも消える。`SIGKILL` では `trap` が動かずに残るので、次の実行の最初に消す：`../docs/findings.md` F-25）。EC2 に付ける IAM の権限は、このバケットへの書き込みだけに絞る（案。実機では未確認）。
- **世代は消さない**（12/18 まで。#157 の返事）。世代数と期間は、G-2 が決まってから。
- **動かし方**：止める前に手で実行する形から始める。時刻での起動・停止（EventBridge Scheduler。受付の前に入れる）と合わせて、停止の直前に動かす形にするのは、そのとき決める。
- **戻しの練習**：別のサーバーまたは別の DB に `pg_restore` して、画面で見られるところまで、1 回通す（受付を開ける前）。**`pg_restore` までを、ローカルで 2026-11-24 に通した**（`../docs/findings.md` F-24。画面で見るところまでと、S3 のダンプからの戻しは、未実施）。戻したあとの確かめは、件数・画像の md5・シーケンスの値で行える（`prisma migrate status` は適用の記録だけを見るので、表や列の欠けは分からない。これだけでは確かめにならない）。制約は、戻すと CHECK の式の書き方が変わるので、定義の文字列では比べない（F-24）。

## 5. 移行のときに直すもの

- **`docker-compose.yml` の `ports`**：2026-11-23 時点では `"5432:5432"`。AWS では `"127.0.0.1:5432:5432"` に限る（#157 の返事）。直す変更は #346。
- **セキュリティグループ**：443 だけを開け、SSH は必要なときだけ、接続元を絞る（H-77 ②）。
- **`AUTH_URL`**：Caddy の背後では、`AUTH_TRUST_HOST=true` だけだと、ルートを直接呼んだときの `redirect_uri` が `https://localhost:3000/...` になり、`AUTH_URL` に公開 URL を入れると公開ホスト名になった（`../docs/findings.md` F-26。Docker での代用）。移行のとき、`.env` に `AUTH_URL`（公開 URL）を入れる見込み。どちらを使うかは未決（`../docs/design/08-architecture.md` 8-7-3）で、Google でのサインインの往復で確かめる。
- **AWS の料金**：米国の参考値で見積もっている。東京の値は、権限が渡ってから料金計算ツールで掛け直す（#157）。

## 6. 移行のチェックリスト（案）

**権限が渡った日に、上から順に進めるための並び。決定ではない。** 段取りの元は、Issue #157 の 2026-11-23 の案（段取り 1〜6）と、同日の水戸さんの返事（通しの前と、受付を開ける前の線引き）。移行の担当と手順そのものは未決（`../docs/open-questions.md` P-6 ③）で、決定行は、移行で実機を確かめたあとに H-77 の PR で出す。**AWS の実機では、どれも試していない。**

**書かないもの**：授業の時間・IP アドレス・ドメイン名・アカウントの ID・秘密の値（どれも公開の記録に載せない）。測った値のうち、載せてよいもの（時間・メモリ）は `../docs/findings.md` に記録する。

**間に合わないとき**：12/04 までに AWS で (8) の経路を確かめられなければ、教室の PC の WSL をデモ環境のままにするフォールバック（`../docs/decisions.md` 2026-11-16 の 2 行目の「引き受けるもの」②。新しい決定は要らない：#157 の返事）。

### 6-0. 始める前（権限が渡る前に、そろっているかを見る）

- [ ] AWS の権限が渡っている（11/30 か 12/01。`../docs/decisions.md` 2026-11-16）
- [ ] ドメインを取得してある（リーダー。`../docs/decisions.md` 2026-11-20）。DNS の扱いは、取得したあと対面で聞く（#157 の返事）
- [ ] #357 の §3・§4 がマージ済み（ここから写して使う）
- [ ] 学校の PC から外へ出るときのアドレスを控える（H-77 ⑦ の材料。**値はリポジトリに書かない**：#157 の返事）

### 6-1. AWS の資源を作る（通しの前。見立て 1〜2h）

- [ ] EC2：t3.small（x86・2GB）・Ubuntu（版は作るときに決める）。ディスクは EBS gp3（大きさは作るときに決める）
- [ ] セキュリティグループ：443 番だけを開ける。SSH は必要なときだけ、接続元を絞る（§5）。443 番の接続元をどこにするかは H-77 ⑦（リーダー）で、決まるまでは開けたまま（学外からも届く：`../docs/decisions.md` 2026-11-16 の本番環境の行の根拠 ⑨）
- [ ] Elastic IP を取り、EC2 に付ける
- [ ] 東京の料金を、料金計算ツールで掛け直す（§5）

### 6-2. アプリと DB を立てる（通しの前。見立て 2〜3h）

`demo-server.md` のステップ 2〜5 を、Windows・WSL の部分を除いて流す。**違うところだけ**を下に置く。

- [ ] `docker-compose.yml` の `ports` が `"127.0.0.1:5432:5432"` になっているか（#346 でマージ済みのはず。`git pull` のあとに目で見る）
- [ ] `.env` に、`demo-server.md` ステップ 4-2 の値に加えて `AUTH_URL`（公開 URL）を入れる見込み（§5。使うかは未決）。権限は `600`
- [ ] **DB は持ち込まず、作り直す**（#157 の段取り 2。`../docs/decisions.md` 2026-11-09 の結びつけの行が禁じるのは本番の DB への持ち込み）。`pnpm db:seed` は使わず、`../docs/open-questions.md` P-6 の「デモ環境の DB の用意の案」（先生の行を SQL で入れ、年度は SC-19 で開始する）で用意する
- [ ] **`pnpm build` のメモリと時間を測る**（F-25 の続き。2GB で落ちたら、4GB に上げるか、ほかの場所でビルドして運ぶかを選ぶ：#157 の返事の 1）。測り方は、ビルドの間に別の端末で `free -m` を見るか、`/usr/bin/time -v` の最大の 1 プロセス（§2 と同じ）
- [ ] `curl http://localhost:3000/api/health/db` が `{"status":"ok"}`

### 6-3. 名前と HTTPS（通しの前。見立て 2〜3h。ドメインの取得が先）

- [ ] ドメインの A レコードを Elastic IP へ向ける（DNS の扱いはリーダーに聞く）
- [ ] HTTPS の終端を置く。**サーバー上の Caddy で行う案**（#157 の案。F-26 で Docker の代用は通した）。**終端の場所と証明書の取り方は未決**（`../docs/design/08-architecture.md` 8-7-4・H-38 (b)・H-77 ⑤）。Caddy の既定の取り方で、443 番だけでも取れるか（80 番を開けずに済むか）は確かめていない
- [ ] Google の承認済みドメインと、redirect URI（`https://<名前>/api/auth/callback/google`）を、いまのクライアントに登録する（`../docs/decisions.md` 2026-11-17）
- [ ] `https://<名前>/api/health/db` が、手元の PC のブラウザで `{"status":"ok"}`

### 6-4. サインインと自動の立ち上げ（通しの前。見立て 1〜2h ＋ systemd の分）

- [ ] **ログイン画面のボタンから**サインインを通す（自分の PC と、学校の PC の両方。学校の PC から届くかは未確認）。F-26 で測ったのはルートを直接呼んだ形で、ボタンの経路（Server Action）は測っていない。`redirect_uri_mismatch` が出たら、`AUTH_URL` の値と、Google に登録した URI を突き合わせる
- [ ] 先生のアカウントでサインインし、年度を SC-19 で開始できる
- [ ] §3 の systemd を入れる（パスとユーザー名を実際の値へ。`which node` の結果を `ExecStart` に。nvm なら `/home/<ユーザー>/.nvm/versions/node/v24.x.x/bin/node` の形）。入れたら `sudo systemd-analyze verify /etc/systemd/system/yse-compass.service` で書き方を見る（2026-11-28 にコンテナで試すと、`/usr/bin/node` のままでは「not executable」で止まり、実在のパスに直すと通った）。Caddy の unit も有効か見る
- [ ] **EC2 を 1 回止めて起動し、手を入れずに `/api/health/db` が `{"status":"ok"}` を返すまでの時間を測る**（H-77 の決定行の根拠に添える：#157 の返事）

### 6-5. 通し（遅くとも 12/04）

- 進め方は `../docs/decisions.md` 2026-11-06 の成功の定義の行と `wbs.md` §8 のとおり（ここには書かない）。起動と停止は、この段階では手で行う（#157 の返事の 4）

### 6-6. 受付を開ける前（通しのあと）

- [ ] §4 のスクリプトを、本物の S3 に向けて流す（バケットは公開アクセスを全部塞ぎ、バージョニングあり。IAM はこのバケットへの書き込みだけ）
- [ ] 別の場所へ戻す練習を 1 回（S3 のダンプから。`../docs/open-questions.md` G-2 の 12/18 までの仮置き ②。確かめ方は §4 の「戻しの練習」）
- [ ] 時刻での起動と停止を入れる（EventBridge Scheduler の案。**スケジュールは AWS の中だけに置き、リポジトリに書かない**：#157 の返事の 4）。止める前に §4 のスクリプトが動く形にするかは、そのとき決める（§4）
- [ ] 古いダンプが `/tmp` に残っていないか見る（§4。`SIGKILL` のときだけ残る）

### 6-7. 終わったら

- [ ] 測ったもの（ビルドのメモリと時間・起動から使えるまでの時間・サインインの結果）を `../docs/findings.md` に記録する（docs の変更は `origin/main` から切ったブランチで：`AGENTS.md` 禁則8）
- [ ] H-77 ①〜④（と P-6 ③）の決定行の PR を出す（承認にリーダーを含める：#157 の返事）
- [ ] この §6 と `demo-server.md` を、実際に通した手順に直す（または、AWS の手順書を別に起こす）

## 関連

- `demo-server.md`（いまのデモ環境の手順）
- `../docs/open-questions.md` H-77・P-6・G-2
- `../docs/findings.md` F-12（バックアップ）・F-17・F-23（生成のメモリと時間）
