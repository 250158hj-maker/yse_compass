# デモサーバー — 12/18 試作版発表会用の立ち上げ手順

> **位置づけ**：12/18 の卒業作品試作版発表会のデモ用サーバー（教室の PC の WSL）を、サーバーの持ち主（案ではインフラ担当：§2）が自分の Windows アカウントで初めから立てる手順に答える
> **確度**：暫定（レビュー未了・鵜呑みにしない）
> **正典**：このファイル
> **更新のしかた**：上書き（ステップ 6 と再起動の試験は、サーバーの持ち主の実測のあと、別の PR で足す）
> **主担当**：水戸（リーダー。サーバーの持ち主の案の了承のあと、インフラ担当へ移す予定：§2）
> **最終更新**：2026-10-23（水戸）

---

## 1. 位置づけと範囲

- **対象は、12/18 の試作版発表会のデモ環境だけ。** 本番（段階①・段階②）は扱わない。
- **手順は、当面「教室の LAN に公開する」ところまで。** 根拠は `../docs/decisions.md` 2026-10-20 のデモ環境の行（ここには書き写さない）。
- **別の PC からの Google サインインは、`../docs/open-questions.md` H-38 が決まるまで扱わない。**
- この手順書の再現性は、サーバーの持ち主（案ではインフラ担当：§2）が自分のアカウントで初めから立て直すことで検証する。**その立て直しが、この手順の最初の通しの実測になる。** **手順どおりに通らなかった箇所・出力が違った箇所・手順に無い操作をした箇所は、この文書を直す PR に書く。**
- 実測の条件：本書の「実測」は、**2026-10-23、教室の PC（Windows 11 Pro・WSL 3.0.3・Ubuntu 26.04.1・Docker Engine 29.9.1・Node 24.22.0・pnpm 11.17.0）で、リーダーが自分の Windows アカウントで行ったこと**を指す。行ったのは、**すでに入っていたもの（Ubuntu・Docker・nvm と Node・既存の clone と `.env`）の確認**と、**既存のリポジトリでの操作**（`git pull`・リモートの HTTPS への切り替え・`prisma migrate`・`prisma generate`・seed・`pnpm build`・`pnpm start`）だけ。**新しく入れる手順は、まだ通していない。** **この PC では Google の ID・シークレットが空のまま**だったので、Google サインインは試していない。

| ステップ | 内容 | 10/23 の状態 | 未実測の手順 |
| --- | --- | --- | --- |
| 0 | 事前の確認 | 手順を通して実測 | 外への到達の確認先のうち、あとから足した 4 か所 |
| 1 | WSL・Ubuntu | 確認のみ（導入手順は未実測） | Ubuntu の導入（1-1）・systemd の設定（1-3） |
| 2 | Docker Engine | 確認のみ（導入手順は未実測） | Docker の導入 |
| 3 | Node・pnpm | 確認のみ（導入手順は未実測） | nvm の導入・`nvm install 24`・`corepack enable` |
| 4 | リポジトリと `.env` | 既存の clone で `git pull` とリモートの HTTPS への切り替えを実測。`.env` は既存のものの確認のみ | HTTPS での clone・`cp .env.example .env`・`AUTH_SECRET` の生成 |
| 5 | DB・ビルド・起動 | 手順を通して実測（既存の DB のコンテナと依存の上で。ビルドの失敗を見逃した実例あり：ステップ 5。ビルドと疎通は口頭での報告） | 最初の `docker compose up -d --wait db`・`pnpm install` が実際に依存を取得する初回 |
| 6 | LAN への公開 | **未着手** | 全部。サーバーの持ち主が実測して足す |

## 2. サーバーの持ち主（案・了承待ち）

**案：サーバー一式は、インフラ担当の Windows アカウントの中に置く。** これは 2026-10-23 のリーダーの案で、**インフラ担当の了承はまだ得ていない。決定ではない**（`../AGENTS.md` 禁則4：`../docs/decisions.md` に 1 行入るまで決定ではない。了承のあとで別の PR で入れる）。

**案が通らなければ、立てる人（本書の主語）が変わる。**

案の理由は 3 つ。

1. **WSL は Windows のユーザーごとに入る。** 別のユーザーからは見えないので、持ち主のアカウントに置くしかない。
2. **共用のアカウントは、学校の運用上、難しい。**
3. **インフラ担当の役割に沿う**（`../AGENTS.md` §6）。

- 10/23 にリーダーのアカウントで作ったサーバーは、**立て直しが済むまでの仮置き**。片付けは「片付け」の節。
- データの移行は扱わない。10/23 のリーダー側に入っているのは seed の分だけ。デモ環境のデータの扱いは、`../docs/decisions.md` 2026-10-20 のデモ環境の行が決めないものとして残している。
- 置き場所を `pm/` にする案は、インフラ担当が Issue #98（10/22 のコメント §4）で出し、この PR でリーダーが採用する。

## 3. 既知の制約

| 制約 | 区分 | 備考 |
| --- | --- | --- |
| Windows 11 Pro は、同時に 1 つのセッションしか表示できない | 仕様からの説明（実測していない） | 持ち主が使っている間、ほかの人はその PC の画面を使えない。ユーザーの切り替えでセッションを残したときに、サーバーが動き続けるかは未実測 |
| サインアウト・再起動・停電でサーバーが止まる。持ち主がサインインし直して起動する必要がある | **推測・未実測** | `wsl --shutdown` や Windows の再起動で WSL ごと止まる見込み。`pnpm start` は自動では戻らない見込み。試験はステップ 6 のあとに行う |
| スリープ・画面ロック・Windows Update の自動再起動で止まる可能性がある | **推測・未実測** | 試験は上の行と同じく、ステップ 6 のあとに行う |
| WSL の IP は、再起動で変わる見込み | **推測・未実測** | `../docs/findings.md` F-13 が「試していない。仕組みからの説明」としている。LAN への公開（ステップ 6）で効く |
| 管理者として開いた PowerShell は、別のユーザーとして動く | **10/23 に確かめた** | **このサーバーの操作に使う PowerShell は、管理者として開かない**（普通に開く） |
| そこ（管理者として開いた PowerShell）で `wsl` を打つと、別のユーザーの WSL が対象になる | 仕組みからの説明・**未実測** | 同上 |

## 4. 打つ場所と書き方

- **Ubuntu の中の作業は、Ubuntu の端末で行う。`wsl` コマンド（`--shutdown`・`--update` など）は PowerShell で打つ。**
  - 理由：10/23 に PowerShell から `wsl -- bash -lc '…'` で Ubuntu のコマンドを渡したところ、出力が途中で切れた（PowerShell の引数の渡し方が原因と推測。未確認）。
- コードブロックの先頭の `# [PowerShell]`・`# [Ubuntu]` が、打つ場所。
- ファイルの編集は vim で行う（vim が無いときの入れ方は、ステップ 1-3）。
- **リポジトリは WSL の中（`~` 配下）に置く。`/mnt/c`（Windows のドライブ）には置かない。**
- WSL の中のリポジトリの場所は `~/<任意の場所>/yse_compass` と書く。**`<任意の場所>` は自分で決めた名前に読み替える。**

---

## ステップ 0. 事前の確認

**全部 PowerShell（管理者でなく、普通に開く）。** 基準を満たさないものがあれば、そこで止めて、リーダーに知らせる（仮想化だけは例外：下の表）。

```powershell
# [PowerShell]
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
"accounts.google.com","github.com","registry.npmjs.org","download.docker.com","registry-1.docker.io","archive.ubuntu.com","raw.githubusercontent.com","nodejs.org","binaries.prisma.sh","auth.docker.io" | ForEach-Object { $r = Test-NetConnection $_ -Port 443 -WarningAction SilentlyContinue; "{0,-25} {1}" -f $_, $r.TcpTestSucceeded }
```

| 項目 | 合格の基準 | 10/23 の実測値 |
| --- | --- | --- |
| OS | `Caption` が Windows 11 Pro（**Pro であること自体は要件として定めていない。10/23 の実測値**） | Windows 11 Pro（ビルド 26200） |
| メモリ・空き容量 | **下限は定めていない**（根拠になる実測が無い）。Docker（PostgreSQL）と Next.js のビルドが動く量があればよい | 31.7 GB・空き 797.3 GB |
| 仮想化 | `VirtualizationFirmwareEnabled` が True。**False でも止めない。ステップ 1 で Ubuntu が起動できるかで判定する。起動しなければ、BIOS の仮想化を疑ってリーダーに知らせる。** Hyper-V が有効だと、仮想化が有効でも False と出る（仕組みからの説明。10/23 の False の原因は未確認） | False。Ubuntu は起動した（WSL 2） |
| WSL | `wsl --version` が出る（WSL 2 が使える） | WSL 3.0.3.0 |
| 外への到達 | 10 か所すべて `True` | 前の 6 か所は `True`。**後の 4 か所は未実測** |

- 後の 4 か所（`raw.githubusercontent.com`・`nodejs.org`：nvm の取得、`binaries.prisma.sh`：Prisma のエンジン、`auth.docker.io`：Docker Hub の認証）は、**コードとコマンドから推した取得先で、未実測。** **ここに無い先は未確認**（ほかにも要る先があれば、立て直しのときに足す）。
- `wsl -l -v` の結果は、ステップ 1 で使う。**自分のアカウントに Ubuntu があるか**を見る（他のユーザーの WSL は見えない：§2）。

## ステップ 1. WSL・Ubuntu

### 1-1. 自分のアカウントに Ubuntu が無ければ入れる

`wsl -l -v` に `Ubuntu` が出なければ入れる。

```powershell
# [PowerShell]
wsl --install -d Ubuntu
```

- **この手順は未実測**（10/23 は、すでに入っていた Ubuntu を使った）。出る Ubuntu のバージョンが 26.04 とは限らない。違ったら記録する。
- 初回の起動で、Ubuntu のユーザーを作る。

### 1-2. `.wslconfig` の確認

```powershell
# [PowerShell]
Get-Content $env:USERPROFILE\.wslconfig -ErrorAction SilentlyContinue; "(.wslconfig ここまで)"
```

- **合格の基準：`(.wslconfig ここまで)` の 1 行だけが出る**（ファイルが無い）。無ければ **NAT 方式**（既定）。10/23 はそうだった。
- ファイルがあって `networkingMode` の指定があれば、その値を記録する。mirrored での動作は未確認（`../docs/findings.md` F-13）。

### 1-3. Ubuntu の端末を開いて確かめる

Ubuntu を開く（スタートメニューの Ubuntu。または PowerShell で `wsl -d Ubuntu`）。**Ubuntu の中の作業は、この端末で打つ。**

```bash
# [Ubuntu] OS・systemd・設定・git
head -2 /etc/os-release; echo "pid1=$(ps -p 1 -o comm=)"; echo "---"; cat /etc/wsl.conf; echo "---"; git --version
```

- **合格の基準**
  - `pid1=systemd`
  - `/etc/wsl.conf` に `[boot]` と `systemd=true` がある（10/23 の実測では `[user]` の `default=` も入っていた）
  - `git` が使える。無ければ `sudo apt-get update && sudo apt-get install -y git curl`
- vim が入っているかを確かめ、無ければ入れる（Ubuntu の WSL のイメージには vim が無いことがある。未確認）。`apt-get install` が失敗したら、先に `sudo apt-get update` を打つ。

```bash
# [Ubuntu]
command -v vim || sudo apt-get install -y vim
```

- systemd が動いていないときは、vim で `/etc/wsl.conf` に書く（**未実測**。10/23 は、すでに書かれていた）。

```bash
# [Ubuntu]
sudo vim /etc/wsl.conf
```

```ini
[boot]
systemd=true
```

書いたら、PowerShell で WSL を止め、Ubuntu を開き直して、上の確認をやり直す。WSL 本体が古いときは、先に `wsl --update` を打つ（コマンドの出どころ：`../docs/design/08-architecture.md` 8-6「Docker の用意」。08 は暫定）。

```powershell
# [PowerShell] WSL 本体が古いときは、先に wsl --update を打ってから
wsl --shutdown
```

## ステップ 2. Docker Engine

**入れ方のコマンドの出どころは、`../docs/design/08-architecture.md` 8-6「Docker の用意」**（Docker Desktop が入っている場合の注意もそこにある。本書には書き写さない）。**08 は暫定なので、根拠ではなく、コマンドの出どころとして指している。** **導入の手順は未実測**（10/23 は、すでに入っていた Docker Engine を確かめただけ）。

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
- `docker` グループに自分を足したあとは、PowerShell で `wsl --shutdown` してから Ubuntu を開き直す（コマンドの出どころ：8-6「Docker の用意」。08 は暫定）。
- 10/23 の実測：`/usr/bin/docker`・`Ubuntu 26.04.1 LTS / 29.9.1`・Compose v5.6.0・`enabled`・`docker`。

## ステップ 3. Node・pnpm

```bash
# [Ubuntu] Node（版はリポジトリの .nvmrc の 24）
nvm install 24
node -v
# pnpm（corepack。バージョンは package.json の packageManager に従う）
corepack enable
corepack --version
```

- `nvm` が無ければ、nvm の公式の手順で入れる（https://github.com/nvm-sh/nvm の Installing and Updating）。**nvm の導入・`nvm install 24`・`corepack enable` は未実測**（10/23 は、すでに入っていた nvm・Node・corepack を確かめただけ）。
- **合格の基準**：`node -v` が `v24.x`（10/23 は v24.22.0）。Node のバージョンの根拠は、リポジトリの `.nvmrc`（`24`）。
- **pnpm の確認は、ステップ 4 でリポジトリに入ってから行う**（`pnpm -v` が `package.json` の `packageManager` と同じ版であること）。
- **リポジトリの外で `pnpm -v` を打つと、別の版が出る**（10/23 は 12.15.0。corepack が「ダウンロードしてよいか」と聞いたので `y` で進めた）。**問題ではない。** `packageManager` の指定はリポジトリの中でだけ効く。

## ステップ 4. リポジトリと `.env`

### 4-1. HTTPS で clone する

**HTTPS で clone する。個人の SSH 鍵を、共用の PC に置かない。** リポジトリは public で、サーバーは読むだけなので、認証が要らない。**置き場所は WSL の中（`~` 配下）。`/mnt/c` には置かない**（§4）。

```bash
# [Ubuntu]
mkdir -p ~/<任意の場所> && cd ~/<任意の場所>
git clone https://github.com/250158hj-maker/yse_compass.git
cd yse_compass
git log --oneline -1
pnpm -v
```

- **HTTPS での clone は未実測**（10/23 は、既存の clone のリモートを HTTPS に切り替えて `git pull` した）。
- **リポジトリの中で初めて `pnpm -v` を打つと、corepack が「ダウンロードしてよいか」と聞く**（10/23 の記録では、リポジトリの外で同じ確認が出た：ステップ 3）。`y` で進める。
- **合格の基準**：clone が通り、`pnpm -v` が `package.json` の `packageManager`（`grep packageManager package.json`）と同じ版（10/23 は 11.17.0）。

### 4-2. `.env` を作る

**この節の手順（`cp`・`AUTH_SECRET` の生成）は未実測**（10/23 は、既存の `.env` を使った）。

```bash
# [Ubuntu] ~/<任意の場所>/yse_compass で
command -v vim || sudo apt-get install -y vim
cp .env.example .env
vim .env
```

**埋める（足す）変数**（値は書かない）：

| 変数 | 扱い |
| --- | --- |
| `AUTH_SECRET` | 自分で作る（下のコマンド） |
| `AUTH_GOOGLE_ID`・`AUTH_GOOGLE_SECRET` | OAuth クライアントの作成者が、自分で入れる |
| `SCHOOL_WORKSPACE_DOMAIN` | 学校の Google Workspace のドメイン |
| `AUTH_TRUST_HOST` | **`.env.example` には無い。`AUTH_TRUST_HOST=true` の 1 行を足す** |
| `DEV_TEACHER_EMAIL`・`DEV_TEACHER_NAME` | 先生としてサインインするアカウントのアドレス（名前は省略可） |

`AUTH_SECRET` は、次のコマンドで作り、出力を `.env` の `AUTH_SECRET=` のあとに貼る（出力はチャットなどに貼らない）。

```bash
# [Ubuntu]
openssl rand -base64 33
```

- `.env.example` のコメントにある `pnpm exec auth secret` は使わない。依存を入れる前（ステップ 5 の前）には使えず、`.env.local` に書く可能性もあるため。

`POSTGRES_USER`・`POSTGRES_PASSWORD`・`POSTGRES_DB`・`DATABASE_URL` は、`.env.example` のままでも動く。**`DATABASE_URL` のホストは `localhost` のままにする**（アプリは WSL の中で直接動かし、DB だけを docker compose で動かすため：`.env.example` のコメント）。

**DB の 5432 番について**

- **事実**：`docker-compose.yml` は、DB を 5432 番で、すべてのインターフェースで待ち受ける（`ports` の `"5432:5432"`）。NAT 方式で Windows 側のポート転送をしない限り、LAN からは届かない見込み（`../docs/findings.md` F-13 が転送したのは 3000 番で、5432 番は転送していない）。
- **歯止め**：**ステップ 6 でも、5432 番は転送しない。**
- **期限**：DB の認証情報（`POSTGRES_USER`・`POSTGRES_PASSWORD`）を既定から変えるかどうかは、**ステップ 5 に入る前（最初の `docker compose up` の前）に決める。** DB のボリュームができたあとは変えにくい。変えるなら、`DATABASE_URL` の中の値も合わせる。

**注意（4 つ）**

1. **`SCHOOL_WORKSPACE_DOMAIN` が空だと、`pnpm build` が失敗する**（`src/auth.ts` が、未設定なら読み込み時に例外を投げるため）。
2. **`AUTH_TRUST_HOST=true` が無いと、本番ビルドで `/api/auth/providers`・`/api/auth/session` が `UntrustedHost` で 500 になり、`AUTH_TRUST_HOST=true` で 200 になる**（実測の出どころ：`../docs/design/08-architecture.md` 8-7-3。2026-10-16・`localhost`・本番ビルド。08 は暫定）。**サインインの画面そのものは未測。**
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

**DB の認証情報を既定から変えるかは、1 を打つ前に決めておく**（ステップ 4-2「DB の 5432 番について」）。

```bash
# [Ubuntu] ~/<任意の場所>/yse_compass で、上から順に。1 つずつ結果を見てから次へ

# 1. DB を起動（healthy になるまで待つ）
docker compose up -d --wait db

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

- **1 は未実測**（10/23 は、10/23 より前に作られていた DB のコンテナが、すでに `(healthy)` で動いていた）。`--wait` が使えない版のときは、`docker compose up -d db` のあと、`docker compose ps` の `db` が `(healthy)` になるまで繰り返す。
- **2 で依存を実際に取得する初回は未実測**（10/23 は `Already up to date`）。
- **7 で `exit=0` になるまで、8 へ進まない。** 0 以外なら `tail -n 40 ~/yse-build.log` で原因を見る。

```bash
# [Ubuntu] 8. 起動（前景で動く。この端末は開いたままにする）
pnpm start
```

```bash
# [Ubuntu] 9. 別の Ubuntu の端末を開いて、疎通を確かめる
curl http://localhost:3000/api/health/db
```

- **合格の基準**：9 が `{"status":"ok"}` を返す（10/23 に通ったことは口頭での報告で、出力は記録に残っていない）。
- **5 を明示的に打つ理由**：`prisma generate` は `package.json` の `postinstall` で走るが、`pnpm install` が `Already up to date` のときは走らない見込み。`schema.prisma` の変更だけを pull した場合など、生成済みのクライアントが古いままになる恐れがある（10/23 も install は `Already up to date` だった）。
- **3 で、次が出たら止める**：`drift`（drift detected）・`failed`（失敗した移行）・**P3005**（DB が空でないのに移行の履歴が無い）。止めたら、`migrate reset` や `docker compose down -v` のようなデータを消す操作を黙って打たず、リーダーに知らせる。
- 10/23 の実測：移行 3 本の適用・`prisma generate`（Prisma Client 7.10.0）・seed（年度 2026・2025、クラス 6 件、先生 1 人）が通った。**ビルドと疎通（9 の `{"status":"ok"}`）まで進んだのは口頭での報告で、出力は記録に残っていない。** その途中で、上のビルドの失敗の見逃しがあった。**本書の形（ログに出して終了コードを見る）で通した記録は、立て直しで取る。**
- **端末を閉じたときの挙動・バックグラウンドでの常駐は、本書では扱わない**（ステップ 6 と再起動の試験で扱う）。

### Google サインインの入口

- **入口は `/real/teams`**（サーバーにする PC の Windows のブラウザで `http://localhost:3000/real/teams`）。**`/` はモックのホーム。未ログインなら `/login`（モックの人物選択）へ送られ、Google のサインインは無い。**
- 開くと、サインインしていなければ Auth.js のサインインへ送られ、終わると `/real/teams` に戻る（`src/lib/auth/session.ts`）。
- **サインインのあとに見えるもの（コードから言える範囲。実機では未確認）**
  - **学校のドメインのアカウントだけが通る**（`src/lib/auth/callbacks.ts` の `signIn`）。
  - **`DEV_TEACHER_EMAIL` のアカウント（先生）**：チーム一覧（`src/app/real/teams/page.tsx`）。画面の上部に「年度管理」へのリンクが出る（`src/app/real/layout.tsx`）。seed が入れる年度のうち、一覧に出るのは未アーカイブの 2026 年度だけ（2025 年度はアーカイブ済みで出ない。切り替えボタンも出ない）。seed はチームを入れないので、一覧は「2026年度には、まだチームがありません。」になる。チームの作成フォームが出る。
  - **それ以外の学校のアカウント**：初回のサインインで生徒として行が作られ、チーム一覧は開くが、作成フォームは出ない。
  - **seed の前にすでにサインインしていた場合は、seed のあとにサインインし直す**（ロールはサインインのときにトークンに載るため。`scripts/seed-dev.mjs` のコメントのとおり）。
- 確かめていないこと：Windows のブラウザから WSL の `localhost:3000` に届くか／OAuth クライアントに登録済みの redirect URI が、この構成（`http://localhost:3000/api/auth/callback/google`）で通るか（`../docs/findings.md` F-04 は `localhost` の別の環境で確認）。

## ステップ 6. LAN への公開

**サーバーの持ち主（案ではインフラ担当：§2）が実測して、別の PR で足す。**（再起動の試験も同じ PR で足す。）

## 片付け

- **10/23 にリーダーの Windows アカウントで作った仮置きのサーバーは、新しい持ち主（案ではインフラ担当：§2）の側が立ち上がったら止める。** 2 台が同時に動くと、どちらが本物か分からなくなるため。
  - 止め方：`pnpm start` の端末で Ctrl-C。続けて、Ubuntu の端末で `docker compose down`（データは残る。`-v` は付けない）。
- **仮置きの側の Ubuntu そのものを消すかは、あとで決める。** 消すと、中身は戻せない。
- 立ち上がったかの判断は、新しい持ち主の側で、ステップ 5 の 9 が `{"status":"ok"}` を返すこと。

## 関連

- 方式設計の開発・実行環境（確度は暫定。本書では、コマンドと実測の出どころとしてだけ指す）：`../docs/design/08-architecture.md` 8-6・8-7-3
- 別の PC から届くか・サインインの見込み：`../docs/findings.md` F-04・F-13、`../docs/open-questions.md` H-38
- デモ環境の決定：`../docs/decisions.md` 2026-10-20 のデモ環境の行
- 学校の了承：`../docs/hearing.md` §16-3
