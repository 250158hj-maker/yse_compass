# デモサーバー — 12/18 試作版発表会用の立ち上げ手順

> **位置づけ**：12/18 の卒業作品試作版発表会のデモ用サーバー（教室の PC の WSL）を、インフラ担当が自分の Windows アカウントで初めから立てる手順に答える
> **確度**：暫定（レビュー未了・鵜呑みにしない）
> **正典**：このファイル
> **更新のしかた**：上書き（ステップ 6 と再起動の試験は、インフラ担当の実測のあと、別の PR で足す）
> **主担当**：蒲山（インフラ担当。手順の実施者。「サーバーの持ち主」の案の了承待ち：§2）
> **最終更新**：2026-10-23（水戸）

---

## 1. 位置づけと範囲

- **対象は、12/18 の試作版発表会のデモ環境だけ。** 本番（段階①・段階②）は扱わない。
- **手順は、当面「教室の LAN に公開する」ところまで。** 根拠は `../docs/decisions.md` 2026-10-20 のデモ環境の行（ここには書き写さない）。
- **別の PC からの Google サインインは、`../docs/open-questions.md` H-38 が決まるまで扱わない。**
- この手順書の再現性は、インフラ担当が自分のアカウントで立て直すことで検証する。**手順どおりに通らなかった箇所・出力が違った箇所・手順に無い操作をした箇所は、この文書を直す PR に書く。**
- 実測の条件：本書の「実測」は、**2026-10-23、教室の PC（Windows 11 Pro・WSL 3.0.3・Ubuntu 26.04.1・Docker Engine 29.9.1・Node 24.22.0・pnpm 11.17.0）で、リーダーが自分の Windows アカウントで行ったステップ 0〜5** を指す。**この PC では Google の ID・シークレットが空のまま**だったので、Google サインインは試していない。

| ステップ | 内容 | 状態 |
| --- | --- | --- |
| 0 | 事前の確認 | 実測済み（10/23・リーダーのアカウント） |
| 1 | WSL・Ubuntu | 同上 |
| 2 | Docker Engine | 同上 |
| 3 | Node・pnpm | 同上 |
| 4 | リポジトリと `.env` | 同上（Google の 2 変数を除く） |
| 5 | DB・ビルド・起動 | 同上（ビルドの失敗を見逃した実例あり：ステップ 5） |
| 6 | LAN への公開 | **未着手**。インフラ担当が実測して足す |

## 2. サーバーの持ち主（案・了承待ち）

**サーバー一式は、インフラ担当の Windows アカウントの中に置く。** これは 2026-10-23 のリーダーの判断で、**インフラ担当の了承はまだ得ていない。決定ではない**（`../AGENTS.md` 禁則4：`../docs/decisions.md` に 1 行入るまで決定ではない。了承のあとで別に入れる）。

案の理由は 3 つ。

1. **WSL は Windows のユーザーごとに入る。** 別のユーザーからは見えないので、持ち主のアカウントに置くしかない。
2. **共用のアカウントは、学校の運用上、難しい。**
3. **インフラ担当の役割に沿う**（`../AGENTS.md` §6）。

- 10/23 にリーダーのアカウントで作ったサーバーは、**立て直しが済むまでの仮置き**。片付けは「片付け」の節。
- データの移行は扱わない。10/23 のリーダー側に入っているのは seed の分だけ。デモ環境のデータの扱いは、`../docs/decisions.md` 2026-10-20 のデモ環境の行が決めないものとして残している。
- 置き場所を `pm/` にする案は、Issue #98 でインフラ担当が出し、リーダーが採用した。

## 3. 既知の制約

| 制約 | 区分 | 備考 |
| --- | --- | --- |
| Windows 11 Pro は、同時に 1 つのセッションしか表示できない | 仕様からの説明（実測していない） | 持ち主が使っている間、ほかの人はその PC の画面を使えない。ユーザーの切り替えでセッションを残したときに、サーバーが動き続けるかは未実測 |
| サインアウト・再起動・停電でサーバーが止まる。持ち主がサインインし直して起動する必要がある | **推測・未実測** | 8-6 は、`wsl --shutdown` や Windows の再起動で WSL ごと止まりうるとしている（`../docs/design/08-architecture.md` 8-6「Docker の用意」。確度は暫定）。`pnpm start` は自動では戻らない見込み。試験はステップ 6 のあとに行う |
| WSL の IP は、再起動で変わる見込み | **推測・未実測** | `../docs/findings.md` F-13 が「試していない。仕組みからの説明」としている。LAN への公開（ステップ 6）で効く |
| 管理者として開いた PowerShell は、管理者という別のユーザーとして動く。そこで `wsl` を打つと、別のユーザーの WSL が対象になる | 仕組みからの説明・**未実測** | **このサーバーの操作に使う PowerShell は、管理者として開かない**（普通に開く） |

## 4. 打つ場所と書き方

- **ステップ 0 と、ステップ 1 の最初の部分だけ PowerShell**。**ステップ 1 の途中から先は、PowerShell を通さず、Ubuntu の端末で直接打つ。**
  - 理由：10/23 に PowerShell から `wsl -- bash -lc '…'` で渡したところ、`"` の扱いが崩れ、出力が途中で切れた。
- コマンドの前の `[PowerShell]`・`[Ubuntu]` が、打つ場所。
- ファイルの編集は vim で行う。
- WSL の中のリポジトリの場所は `~/<任意の場所>/yse_compass` と書く。**`<任意の場所>` は自分で決めた名前に読み替える。**

---

## ステップ 0. 事前の確認

**全部 PowerShell（管理者でなく、普通に開く）。** 基準を満たさないものがあれば、そこで止めて、リーダーに知らせる。

```powershell
# OS
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber

# メモリ（GB）
Get-CimInstance Win32_ComputerSystem | Select-Object Model, @{n='MemGB';e={[math]::Round($_.TotalPhysicalMemory/1GB,1)}}

# 仮想化
Get-CimInstance Win32_Processor | Select-Object Name, VirtualizationFirmwareEnabled

# C ドライブの空き（GB）
Get-PSDrive C | Select-Object @{n='FreeGB';e={[math]::Round($_.Free/1GB,1)}}

# WSL
wsl --version
wsl -l -v

# 外への到達（443 番）
"accounts.google.com","github.com","registry.npmjs.org","download.docker.com","registry-1.docker.io","archive.ubuntu.com" | ForEach-Object { $r = Test-NetConnection $_ -Port 443 -WarningAction SilentlyContinue; "{0,-25} {1}" -f $_, $r.TcpTestSucceeded }
```

| 項目 | 合格の基準 | 10/23 の実測値 |
| --- | --- | --- |
| OS | `Caption` が Windows 11 Pro | Windows 11 Pro（ビルド 26200） |
| メモリ・空き容量 | **下限は定めていない**（根拠になる実測が無い）。Docker（PostgreSQL）と Next.js のビルドが動く量があればよい | 31.7 GB・空き 797.3 GB |
| 仮想化 | `VirtualizationFirmwareEnabled` が True。**ただし Hyper-V が有効だと、仮想化が有効でも False と出る。** False でも、`wsl -l -v` の VERSION が 2 で Ubuntu が起動できるなら、仮想化は使えているので問題ない | False。WSL 2 は動いていた |
| WSL | `wsl --version` が出る（WSL 2 が使える） | WSL 3.0.3.0 |
| 外への到達 | 6 か所すべて `True` | 6 か所とも `True` |

- `wsl -l -v` の結果は、ステップ 1 で使う。**自分のアカウントに Ubuntu があるか**を見る（他のユーザーの WSL は見えない：§3）。
- Node の入手（nvm）は `nodejs.org` にも届く必要がある。**この確認には含めていない。**

## ステップ 1. WSL・Ubuntu

### 1-1. 自分のアカウントに Ubuntu が無ければ入れる

`wsl -l -v` に `Ubuntu` が出なければ入れる。

```powershell
wsl --install -d Ubuntu
```

- **この手順は未実測**（10/23 は、すでに入っていた Ubuntu を使った）。出る Ubuntu のバージョンが 26.04 とは限らない。違ったら記録する。
- 初回の起動で、Ubuntu のユーザーを作る。

### 1-2. `.wslconfig` の確認（PowerShell）

```powershell
Get-Content $env:USERPROFILE\.wslconfig -ErrorAction SilentlyContinue; "(.wslconfig ここまで)"
```

- **合格の基準：`(.wslconfig ここまで)` の 1 行だけが出る**（ファイルが無い）。無ければ **NAT 方式**（既定）。10/23 はそうだった。
- ファイルがあって `networkingMode` の指定があれば、その値を記録する。mirrored での動作は未確認（`../docs/findings.md` F-13）。

### 1-3. ここから Ubuntu の端末で打つ

Ubuntu を開く（スタートメニューの Ubuntu。または PowerShell で `wsl -d Ubuntu`）。**以降は、この端末で直接打つ。**

```bash
# [Ubuntu] OS・systemd・設定・git
head -2 /etc/os-release; echo "pid1=$(ps -p 1 -o comm=)"; echo "---"; cat /etc/wsl.conf; echo "---"; git --version
```

- **合格の基準**
  - `pid1=systemd`
  - `/etc/wsl.conf` に `[boot]` と `systemd=true` がある（10/23 の実測では `[user]` の `default=` も入っていた）
  - `git` が使える。無ければ `sudo apt-get update && sudo apt-get install -y git curl`
- systemd が動いていないときは、vim で `/etc/wsl.conf` に書く。

```bash
# [Ubuntu]
sudo vim /etc/wsl.conf
```

```ini
[boot]
systemd=true
```

書いたら、PowerShell で `wsl --shutdown` し、Ubuntu を開き直して、上の確認をやり直す（WSL 本体が古いときは、先に `wsl --update`。`../docs/design/08-architecture.md` 8-6「Docker の用意」のとおり）。

## ステップ 2. Docker Engine

**入れ方は、`../docs/design/08-architecture.md` 8-6「Docker の用意」のとおり**（Docker Desktop が入っている場合の注意もそこにある。本書には書き写さない）。8-6 の確度は暫定なので、**根拠ではなく、コマンドの出どころとして指している。**

入れたら、Ubuntu の端末で確認する。

```bash
# [Ubuntu]
readlink -f "$(command -v docker)"; docker info --format '{{.OperatingSystem}} / {{.ServerVersion}}' 2>&1 | head -2; docker compose version; systemctl is-enabled docker; id -nG | tr ' ' '\n' | grep -x docker || echo "docker グループに入っていない"
```

- **合格の基準（4 つ）**
  1. `readlink -f` が `/usr/bin/docker`（Docker Desktop の CLI ではない）
  2. `docker info` が `Ubuntu …`（`Docker Desktop` ではない）
  3. `systemctl is-enabled docker` が `enabled`
  4. `docker` グループに入っている（最後の行が `docker`。`docker グループに入っていない` と出たら不合格）
- `docker compose version` が出ること。
- グループへの追加は、`wsl --shutdown` で開き直すまで反映されない（8-6 のとおり）。
- 10/23 の実測：`/usr/bin/docker`・`Ubuntu 26.04.1 LTS / 29.9.1`・Compose v5.6.0・`enabled`・`docker`。

## ステップ 3. Node・pnpm

```bash
# [Ubuntu] Node（.nvmrc は 24）
nvm install 24
node -v
# pnpm（corepack。バージョンは package.json の packageManager に従う）
corepack enable
corepack --version
```

- `nvm` が無ければ、nvm の公式の手順で入れる（https://github.com/nvm-sh/nvm の Installing and Updating）。10/23 は導入済みで、入れる手順は実測していない。
- **合格の基準**：`node -v` が `v24.x`（10/23 は v24.22.0）。Node のバージョンの根拠は `../docs/design/08-architecture.md` 8-6「Docker 構成」。
- **pnpm の確認は、ステップ 4 でリポジトリに入ってから行う**（`pnpm -v` が `package.json` の `packageManager` と同じ版であること）。
- **リポジトリの外で `pnpm -v` を打つと、別の版が出る**（10/23 は 12.15.0。corepack が「ダウンロードしてよいか」と聞くので `y`）。**問題ではない。** `packageManager` の指定はリポジトリの中でだけ効く。

## ステップ 4. リポジトリと `.env`

### 4-1. HTTPS で clone する

**HTTPS で clone する。個人の SSH 鍵を、共用の PC に置かない。** リポジトリは public で、サーバーは読むだけなので、認証が要らない。

```bash
# [Ubuntu]
mkdir -p ~/<任意の場所> && cd ~/<任意の場所>
git clone https://github.com/250158hj-maker/yse_compass.git
cd yse_compass
git log --oneline -1
pnpm -v
```

- **合格の基準**：clone が通り、`pnpm -v` が `package.json` の `packageManager`（`grep packageManager package.json`）と同じ版（10/23 は 11.17.0）。

### 4-2. `.env` を作る

```bash
# [Ubuntu] ~/<任意の場所>/yse_compass で
cp .env.example .env
vim .env
```

**埋める（足す）変数**（値は書かない）：

| 変数 | 扱い |
| --- | --- |
| `AUTH_SECRET` | 自分で作る（作り方は `.env.example` のコメント） |
| `AUTH_GOOGLE_ID`・`AUTH_GOOGLE_SECRET` | OAuth クライアントの作成者が、自分で入れる |
| `SCHOOL_WORKSPACE_DOMAIN` | 学校の Google Workspace のドメイン |
| `AUTH_TRUST_HOST` | **`.env.example` には無い。`AUTH_TRUST_HOST=true` の 1 行を足す** |
| `DEV_TEACHER_EMAIL`・`DEV_TEACHER_NAME` | 先生としてサインインするアカウントのアドレス（名前は省略可） |

`POSTGRES_USER`・`POSTGRES_PASSWORD`・`POSTGRES_DB`・`DATABASE_URL` は、`.env.example` のままでも動く。**`DATABASE_URL` のホストは `localhost` のままにする**（`../docs/design/08-architecture.md` 8-6「環境変数」）。DB の認証情報（`POSTGRES_USER`・`POSTGRES_PASSWORD`）を既定から変えるかは、ステップ 6 で LAN に公開する前に決める。変えるなら、最初の `docker compose up -d db` の前に（DB のボリュームができたあとは、変えても反映されない）。

**注意（4 つ）**

1. **`SCHOOL_WORKSPACE_DOMAIN` が空だと、`pnpm build` が失敗する**（`../docs/design/08-architecture.md` 8-6・8-7-3）。
2. **`AUTH_TRUST_HOST=true` が無いと、本番ビルドのサインインの画面が 500 になる。** `/api/auth/*` が `UntrustedHost` で 500 を返す（`../docs/design/08-architecture.md` 8-7-3 の実測：2026-10-16・`localhost`・本番ビルド。ここでは根拠でなく、実測の出どころとして指す）。
3. **`AUTH_GOOGLE_ID`・`AUTH_GOOGLE_SECRET` は、OAuth クライアントの作成者が自分で入れる。チャットに貼らない。**
4. **`DEV_TEACHER_EMAIL` は、Google が返す表記と、大文字・小文字まで合わせる。** 違うと別の行が作られ、先生が生徒として扱われる（`scripts/seed-dev.mjs` のコメントのとおり）。

`.env` の中身は、値を出さずに確かめる。

```bash
# [Ubuntu] 変数名と「空／値あり」だけを出す
awk -F= '/^[A-Z_]+=/{print $1, ($2=="" ? "(空)" : "(値あり)")}' .env
```

- **合格の基準**：`AUTH_GOOGLE_ID`・`AUTH_GOOGLE_SECRET` 以外の変数が、すべて `(値あり)`（`DEV_TEACHER_NAME` は省略可）。Google の 2 変数が入るまでは、ビルドと `/api/health/db` までは通るが、Google サインインは試せない。

## ステップ 5. DB・ビルド・起動

**コマンドの出力を、`| tail` などのパイプに通さない。** 終了コードが失われ、失敗に気づけない。10/23 に `pnpm build` を `| tail` に通したため失敗を見逃し、`pnpm start` が「production build が無い」で止まった。**ビルドは、ログに出して終了コードを見る。**

```bash
# [Ubuntu] ~/<任意の場所>/yse_compass で、上から順に。1 つずつ結果を見てから次へ

# 1. DB を起動（healthy になるまで待つ）
docker compose up -d db
docker compose ps

# 2. 依存を入れる
pnpm install --frozen-lockfile

# 3. マイグレーションの状態を見る（この時点では、未適用の移行が並ぶのが想定どおり）
pnpm exec prisma migrate status

# 4. 適用する
pnpm exec prisma migrate deploy

# 5. Prisma クライアントを作る（明示的に打つ）
pnpm exec prisma generate

# 6. 初期データ（年度・クラス・先生）
pnpm db:seed

# 7. ビルド（ログに出し、終了コードを見る）
pnpm build > ~/yse-build.log 2>&1; echo "build exit=$?"
```

- **7 で `exit=0` になるまで、8 へ進まない。** 0 以外なら `tail -n 40 ~/yse-build.log` で原因を見る。

```bash
# 8. 起動（前景で動く。この端末は開いたままにする）
pnpm start
```

```bash
# 9. 別の Ubuntu の端末を開いて、疎通を確かめる
curl http://localhost:3000/api/health/db
```

- **合格の基準**：9 が `{"status":"ok"}` を返す。
- **5 を明示的に打つ理由**：`pnpm install` が `Already up to date` だと、`postinstall` の `prisma generate` が走らない。`schema.prisma` の変更だけを pull した場合など、生成済みのクライアントが古いままになる恐れがある（`../docs/design/08-architecture.md` 8-6「ローカル起動手順」のとおり。10/23 も install は `Already up to date` だった）。
- **3 で、次が出たら止める**：`drift`（drift detected）・`failed`（失敗した移行）・**P3005**（DB が空でないのに移行の履歴が無い）。止めたら、`migrate reset` や `docker compose down -v` のようなデータを消す操作を黙って打たず、リーダーに知らせる。
- 10/23 の実測：移行 3 本の適用・`prisma generate`（Prisma Client 7.10.0）・seed（年度 2026・2025、クラス 6 件、先生 1 人）が通り、ビルドと疎通まで進んだ。ただし、その途中で上のビルドの失敗の見逃しがあった。**本書の形（ログに出して終了コードを見る）で通した記録は、立て直しで取る。**
- **端末を閉じたときの挙動・バックグラウンドでの常駐は、本書では扱わない**（ステップ 6 と再起動の試験で扱う）。

### Google サインインの入口

- **入口は `/real/teams`**（サーバーにする PC の Windows のブラウザで `http://localhost:3000/real/teams`）。**`/` はモックの人物選択画面で、Google のサインインは無い。**
- 開くと、サインインしていなければ Auth.js のサインインへ送られ、終わると `/real/teams` に戻る（`src/lib/auth/session.ts`）。
- **サインインのあとに見えるもの（コードから言える範囲。実機では未確認）**
  - **学校のドメインのアカウントだけが通る**（`src/lib/auth/callbacks.ts` の `signIn`）。
  - **`DEV_TEACHER_EMAIL` のアカウント（先生）**：チーム一覧（`src/app/real/teams/page.tsx`）。画面の上部に「年度管理」へのリンクが出る（`src/app/real/layout.tsx`）。seed が入れる年度のうち、一覧に出るのは未アーカイブの 2026 年度だけ（2025 年度はアーカイブ済みで出ない。切り替えボタンも出ない）。seed はチームを入れないので、一覧は「2026年度には、まだチームがありません。」になる。チームの作成フォームが出る。
  - **それ以外の学校のアカウント**：初回のサインインで生徒として行が作られ、チーム一覧は開くが、作成フォームは出ない。
  - **seed の前にすでにサインインしていた場合は、seed のあとにサインインし直す**（ロールはサインインのときにトークンに載るため。`scripts/seed-dev.mjs` のコメントのとおり）。
- 確かめていないこと：Windows のブラウザから WSL の `localhost:3000` に届くか／OAuth クライアントに登録済みの redirect URI が、この構成（`http://localhost:3000/api/auth/callback/google`）で通るか（`../docs/findings.md` F-04 は `localhost` の別の環境で確認）。

## ステップ 6. LAN への公開

**インフラ担当が実測して、別の PR で足す。**（再起動の試験も同じ PR で足す。）

## 片付け

- **前の持ち主（10/23 にステップ 5 まで進めた、リーダーの Windows アカウント）の側のサーバーは、新しい持ち主の側が立ち上がったら止める。** 2 台が同時に動くと、どちらが本物か分からなくなるため。
  - 止め方：`pnpm start` の端末で Ctrl-C。`docker compose down`（データは残る。`-v` は付けない）。
- **前の持ち主の側の Ubuntu そのものを消すかは、あとで決める。** 消すと、中身は戻せない。
- 立ち上がったかの判断は、新しい持ち主の側で、ステップ 5 の 9 が `{"status":"ok"}` を返すこと。

## 関連

- 方式設計の開発・実行環境（確度は暫定）：`../docs/design/08-architecture.md` 8-6・8-7-3
- 別の PC から届くか・サインインの見込み：`../docs/findings.md` F-04・F-13、`../docs/open-questions.md` H-38
- デモ環境の決定：`../docs/decisions.md` 2026-10-20 のデモ環境の行
- 学校の了承：`../docs/hearing.md` §16-3
