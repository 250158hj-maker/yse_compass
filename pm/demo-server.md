# デモサーバー — 12/18 試作版発表会用の立ち上げ手順

> **位置づけ**：12/18 の卒業作品試作版発表会のデモ用サーバー（教室の PC の WSL）を、サーバーの持ち主（インフラ担当：§2）が自分の Windows アカウントで初めから立てる手順に答える
> **確度**：暫定（レビュー未了・鵜呑みにしない）
> **正典**：このファイル
> **更新のしかた**：上書き
> **主担当**：蒲山（インフラ担当。サーバーの持ち主：§2）
> **最終更新**：2026-10-29（蒲山）

---

## 1. 位置づけと範囲

- **対象は、12/18 の試作版発表会のデモ環境だけ。** 本番（段階①・段階②）は扱わない。
- **手順は、当面「教室の LAN に公開する」ところまで。** 根拠は `../docs/decisions.md` 2026-10-20 のデモ環境の行（ここには書き写さない）。
- **別の PC からの Google サインインは、`../docs/open-questions.md` H-38 が決まるまで扱わない。**
- この手順書の再現性は、サーバーの持ち主（インフラ担当：§2）が自分のアカウントで初めから立て直すことで検証する。**その立て直しが、この手順の最初の通しの実測になる。** **2026-10-23 の 2 回目の実測（インフラ担当）が、その立て直しに当たる。この PC は、試験ではなく、そのままデモ用サーバーとして使う**（ポート転送とファイアウォールの許可も入れたまま。持ち主は `../docs/decisions.md` 2026-10-26 の行で決まった：§2）。 **手順どおりに通らなかった箇所・出力が違った箇所・手順に無い操作をした箇所は、この文書を直す PR（または Issue #98）に書く。**
- 実測の条件：**1 回目の実測**は、**2026-10-23、教室の PC（Windows 11 Pro・WSL 3.0.3・Ubuntu 26.04.1・Docker Engine 29.9.1・Node 24.22.0・pnpm 11.17.0）で、リーダーが自分の Windows アカウントで行ったこと**を指す。行ったのは、**すでに入っていたもの（Ubuntu・Docker・nvm と Node・既存の clone と `.env`）の確認**と、**既存のリポジトリでの操作**（`git pull`・リモートの HTTPS への切り替え・`prisma migrate`・`prisma generate`・seed・`pnpm build`・`pnpm start`）だけ。**新しく入れる手順は、1 回目では通していない（2 回目は下の表）。** **この PC では Google の ID・シークレットが空のまま**だったので、Google サインインは試していない。本書で「10/23 は…」と書いた箇所は、断りが無ければ 1 回目を指す。

| ステップ | 内容 | 1 回目（リーダー）の状態 | 1 回目に未実測の手順 |
| --- | --- | --- | --- |
| 0 | 事前の確認 | 手順を通して実測 | 外への到達の確認先のうち、あとから足した 5 か所 |
| 1 | WSL・Ubuntu | 確認のみ（導入手順は未実測） | Ubuntu の導入（1-1）・systemd の設定（1-3） |
| 2 | Docker Engine | 確認のみ（導入手順は未実測） | Docker の導入 |
| 3 | Node・pnpm | 確認のみ（導入手順は未実測） | nvm の導入・`nvm install 24`・`corepack enable` |
| 4 | リポジトリと `.env` | 既存の clone で `git pull` とリモートの HTTPS への切り替えを実測。`.env` は既存のものの確認のみ | HTTPS での clone・`cp .env.example .env`・`AUTH_SECRET` の生成 |
| 5 | DB・ビルド・起動 | 内容を実測（出力を `tail` に通した形。本書の形では未実測。既存の DB のコンテナと依存の上で。ビルドの失敗を見逃した実例あり：ステップ 5。ビルドと疎通は口頭での報告） | 最初の `docker compose up -d --wait db`・`pnpm install` が実際に依存を取得する初回 |
| 6 | LAN への公開 | **未着手**（10/23 のリーダー側では行っていない） | 別の PC からの確認は、下の「2 回目の実測」で実測した |

**2 回目の実測（2026-10-23・蒲山）：リーダーとは別の PC（同じ教室。台数と場所の詳細は記録しない）で、Ubuntu だけが登録されていて Docker・Node・リポジトリが無い状態から、ステップ 1〜6 と再起動の試験を通した。** 条件は、Windows 11・WSL 2・Ubuntu 26.04.1・Docker Engine 29.9.2（Compose v5.6.1）・Node v24.22.1・pnpm 11.17.0。**この PC で、Google の ID・シークレットは空のまま**で、Google サインインは試していない。**ステップ 0 の出力は記録していない。** 通った範囲は下の表に、手順どおりでなかった箇所は、ステップ 4・5・6 の「2 回目の実測」に書く。

| ステップ | 2 回目の状態 |
| --- | --- |
| 1 | Ubuntu は**すでに登録済み**だった（`wsl --install` が `ERROR_ALREADY_EXISTS`。1-1 の導入は、2 回目も通していない）。`.wslconfig` は**無かった**（NAT 方式）。systemd・`wsl.conf` は確認だけで通った **出力は記録に残っていない。** |
| 2 | **導入の手順が、そのまま通った** **出力は記録に残っていない。** |
| 3 | `nvm install 24` と `corepack enable` が通った。nvm の導入そのものは、記録に残っていない（`nvm install 24` からそのまま通った。nvm が元から入っていたのか、導入したのかも、記録に残っていない）。**出力は記録に残っていない。** |
| 4 | HTTPS の clone・`.env` の作成が通った。**手順どおりでなかった点がある**（ステップ 4 末尾） **出力は記録に残っていない。** |
| 5 | 1 回目に未実測だった本書の形（ログに出して終了コードを見る）で、ビルドが `exit=0` で通った |
| 6 | 別の PC から届いた |

**3 回目の実測（2026-10-29・蒲山）：2 回目で立てたデモサーバーを、`main` の最新（2f25ce6）へ更新して起動し直し、確かめた。** 条件は 2 回目と同じ PC・アカウント。**通った範囲は次のとおり。**

| ステップ | 3 回目の状態 |
| --- | --- |
| 5 の 1 | `sudo systemctl start docker` を打ってから `docker compose up -d --wait db` が通った。**ただし、Docker が止まっていたとは言えない。** `journalctl -u docker` で、dockerd の起動は、**WSL の起動（`uptime -s` が 08:01:40）の 2 秒後の 08:01:42 の 1 回だけ**で、その日の 00:00 以降に停止の記録は無く、`systemctl is-enabled docker` は `enabled` だった。**自動で起動していた可能性が高い**（`sudo systemctl start docker` を打つ前の状態を確かめていないので、打つ前に動いていたかは断定できない） |
| 更新（`git pull`）と 5 の 2〜5・7 | `git pull` は fast-forward。`pnpm install --frozen-lockfile` は `Already up to date`。`migrate status` は未適用 2 本が並んだ（想定どおり）。`migrate deploy` が 2 本とも適用され、`prisma generate`（Prisma Client 7.10.0）も通った。ビルドは `build exit=0`。**seed（5 の 6）は、この更新では打っていない** |
| 5 の 8・9 | `pnpm start` で起動。`/api/health/db` が、**サーバー PC のブラウザと、同じ教室の別の PC のブラウザの両方で** `{"status":"ok"}` を返した |
| 6-4 | 別の PC の PowerShell で `Test-NetConnection <Windows の IP> -Port 5432` が `TcpTestSucceeded` `False`（5432 番は LAN に出ていない。**同じ教室の別の PC 1 台・1 回**） |
| Google サインイン | サーバー PC のブラウザの `http://localhost:3000/real/teams` で、**Google サインインが通った**（この PC の ID・シークレットは設定済み）。**生徒のロールでも、先生のロールでも通った**（先生のロールにした方法は記録していない。`DEV_TEACHER_EMAIL` の設定と seed は打っていない）。先生の画面の細部（作成フォーム・「年度管理」の表示）は記録していない |

**別の PC からのサインイン（3 回目・1 回）：同じ教室の別の PC のブラウザで `http://<Windows の IP>:3000/real/teams` を開くと、Auth.js のサインイン画面（「Sign in with Google」）までは出た。ボタンを押すと、Google の画面を経由せず `http://localhost:3000/api/auth/signin/google` へ送られ、別の PC 自身の `localhost` を指すので `ERR_CONNECTION_REFUSED` になった。** **別の PC では、Google のログイン情報を入力していない。** サーバー PC の `.env` に、`AUTH_URL` は無く、`AUTH_TRUST_HOST` の行は有った（値は見ていない）。`AUTH_URL` が無いと、Auth.js が付ける絶対 URL の origin は Host ではなく待ち受けから組まれる、という既存の記録（`src/lib/actions/auth.test.ts`）と合うが、**この経路でどの値から `localhost` が組まれたかは、直接は確かめていない（見当）。** 別の PC からのサインインは H-38 が決まるまで対象外（§1）で、この結果は、その手前の状態の記録。

**確かめていないこと：** `AUTH_URL` を IP に変えたときの挙動と、Google が IP の戻り先を拒否するか（Google の画面まで進んでいない）、Windows の再起動・サインアウト・スリープをまたいだ挙動（§3）。

## 2. サーバーの持ち主

**サーバー一式は、インフラ担当の Windows アカウントの中に置く。** 2026-10-23 のリーダーの案を、同日インフラ担当が #161 のスレッドで了承し、`../docs/decisions.md` 2026-10-26 の行で決まった（根拠と、決めないものは、その行が正）。

理由は 3 つ（決定行の根拠と同じ）。

1. **WSL は Windows のユーザーごとに入る**（仕組みからの説明。実測していない）。別のユーザーからは見えないので、持ち主のアカウントに置くしかない。
2. **共用のアカウントは、学校の運用上、難しい**（リーダーの判断。学校の運用についての見立て）。
3. **インフラ担当の役割に沿う**（`../AGENTS.md` §6）。

- 10/23 にリーダーのアカウントで作ったサーバーは、**立て直しが済むまでの仮置き**。片付けは「片付け」の節。
- データの移行は扱わない。10/23 のリーダー側に入っているのは seed の分だけ。デモ環境のデータの扱いは、`../docs/decisions.md` 2026-10-20 のデモ環境の行が決めないものとして残している。
- 置き場所を `pm/` にする案は、インフラ担当が Issue #98 の返信コメント（2026-10-22 23:05 UTC）の §4 で出し、#161 でリーダーが採用した。

## 3. 既知の制約

| 制約 | 区分 | 備考 |
| --- | --- | --- |
| Windows 11 Pro は、同時に 1 つのセッションしか表示できない | 仕様からの説明（実測していない） | 持ち主が使っている間、ほかの人はその PC の画面を使えない。ユーザーの切り替えでセッションを残したときに、サーバーが動き続けるかは未実測 |
| `wsl --shutdown` で WSL ごと止まる。DB は自動で戻り、アプリは `pnpm start` を打ち直す必要がある（見込み） | **一部実測**（2 回目・1 回） | `wsl --shutdown` のあと、DB のコンテナは `docker compose ps` で `Up … (healthy)` になっていた（作成からの経過は変わらず、再作成ではなく再起動）。アプリは `pnpm start` を手動で打ち直して戻した。**止まった状態を `ss` などで確かめていないので、「自動では戻らない」は見込みのまま** |
| サインアウト・Windows の再起動・停電でサーバーが止まる。持ち主がサインインし直して起動する必要がある | **推測・未実測** | `wsl --shutdown` の試験は上の行。Windows の再起動・サインアウトは試していない |
| スリープ・画面ロック・Windows Update の自動再起動で止まる可能性がある | **推測・未実測** | 試していない |
| WSL の IP は、再起動で変わる見込み | **一部実測**（2 回目・1 回で変わらず） | `wsl --shutdown` のあとの `eth0` の IP は、**転送先に入れた IP と同じだった**（1 回だけ。Windows の再起動をまたいでは未確認）。`../docs/findings.md` F-13 の「変わる見込み」は、この 1 回では確かめられなかった。変わる場合は、ステップ 6 の転送を入れ直す |
| 管理者として開いた PowerShell は、別のユーザーとして動く | **実測**（2 回目） | 管理者として開いた PowerShell で `whoami` を打つと、普段のアカウントとは別のアカウント（ローカルの管理者）が出た。管理者の判定は `True`。**ポート転送とファイアウォールの設定は、この PowerShell でだけ行う。それ以外の操作（`wsl` を含む）には使わず、普通に開いた PowerShell を使う** |
| そこ（管理者として開いた PowerShell）で `wsl` を打つと、別のユーザーの WSL が対象になる | 仕組みからの説明・**未実測** | 2 回目でも、管理者の PowerShell では `wsl` を打っていない |

## 4. 打つ場所と書き方

- **Ubuntu の中の作業は、Ubuntu の端末で行う。`wsl` コマンド（`--shutdown`・`--update` など）は PowerShell で打つ。**
  - 理由：10/23 に PowerShell から `wsl -- bash -lc '…'` で Ubuntu のコマンドを渡したところ、出力が途中で切れた（PowerShell の引数の渡し方が原因と推測。未確認）。
- コードブロックの先頭の `# [PowerShell]`・`# [Ubuntu]` が、打つ場所。
- ファイルの編集は vim で行う（vim が無いときの入れ方は、ステップ 1-3）。
- **リポジトリは WSL の中（`~` 配下）に置く。`/mnt/c`（Windows のドライブ）には置かない。**
- WSL の中のリポジトリの場所は `~/workspace/yse_compass` と書く。**場所は任意。以下は `~/workspace` の例**（変えたときは読み替える）。

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
"accounts.google.com","github.com","registry.npmjs.org","download.docker.com","registry-1.docker.io","archive.ubuntu.com","raw.githubusercontent.com","nodejs.org","binaries.prisma.sh","auth.docker.io","production.cloudflare.docker.com" | ForEach-Object { $r = Test-NetConnection $_ -Port 443 -WarningAction SilentlyContinue; "{0,-33} {1}" -f $_, $r.TcpTestSucceeded }
```

| 項目 | 合格の基準 | 10/23 の実測値 |
| --- | --- | --- |
| OS | `Caption` が Windows 11 | Windows 11 Pro（ビルド 26200） |
| メモリ・空き容量 | **下限は定めていない**（根拠になる実測が無い）。Docker（PostgreSQL）と Next.js のビルドが動く量があればよい | 31.7 GB・空き 797.3 GB |
| 仮想化 | `VirtualizationFirmwareEnabled` が True。**False でも止めない。ステップ 1 で Ubuntu が起動できるかで判定する。起動しなければ、BIOS の仮想化を疑ってリーダーに知らせる。** Hyper-V が有効だと、仮想化が有効でも False と出る（仕組みからの説明。10/23 の False の原因は未確認） | False。Ubuntu は起動した（WSL 2） |
| WSL | `wsl --version` が出る（WSL 2 が使える） | WSL 3.0.3.0 |
| 外への到達 | 11 か所すべて `True` | 前の 6 か所は `True`。**後の 5 か所は未実測** |

- 後の 5 か所（`raw.githubusercontent.com`・`nodejs.org`：nvm の取得、`binaries.prisma.sh`：Prisma のエンジン、`auth.docker.io`：Docker Hub の認証、`production.cloudflare.docker.com`：Docker Hub の層の取得先と見込まれる。公式の一覧とは未照合・未実測）は、**コードとコマンドから推した取得先で、未実測。** **ここに無い先は未確認**（ほかにも要る先があれば、立て直しのときに足す）。
- `wsl -l -v` の結果は、ステップ 1 で使う。**自分のアカウントに Ubuntu があるか**を見る（他のユーザーの WSL は見えない：§2）。

## ステップ 1. WSL・Ubuntu

### 1-1. 自分のアカウントに Ubuntu が無ければ入れる

`wsl -l -v` に `Ubuntu` が出なければ入れる。

```powershell
# [PowerShell]
wsl --install -d Ubuntu
```

- **この手順は、1・2 回目とも未実測**（どちらも、すでに入っていた Ubuntu を使った。2 回目は `wsl --install` が `ERROR_ALREADY_EXISTS`）。出る Ubuntu のバージョンが 26.04 とは限らない。違ったら記録する。
- 初回の起動で、Ubuntu のユーザーを作る。

### 1-2. `.wslconfig` の確認

```powershell
# [PowerShell]
Get-Content $env:USERPROFILE\.wslconfig -ErrorAction SilentlyContinue; "(.wslconfig ここまで)"
```

- **合格の基準：`(.wslconfig ここまで)` の 1 行だけが出る**（ファイルが無い）。無ければ **NAT 方式**（既定）。10/23 は `.wslconfig` が無かった（NAT は、無いことからの推定）。
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

**入れ方のコマンドの出どころは、`../docs/design/08-architecture.md` 8-6「Docker の用意」**（Docker Desktop が入っている場合の注意もそこにある。本書には書き写さない）。**08 は暫定なので、根拠ではなく、コマンドの出どころとして指している。** **導入の手順は、1 回目は未実測**（すでに入っていた Docker Engine を確かめただけ）。**2 回目で、そのまま通った**（Docker Engine 29.9.2・Compose v5.6.1）。

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

- `nvm` が無ければ、nvm の公式の手順で入れる（https://github.com/nvm-sh/nvm の Installing and Updating）。nvm を入れたら、Ubuntu の端末を開き直す（`nvm` コマンドが効くようにするため）。**1 回目は、nvm の導入・`nvm install 24`・`corepack enable` を未実測**（すでに入っていた nvm・Node・corepack を確かめただけ）。**2 回目で、`nvm install 24`（v24.22.1）と `corepack enable` は通った。nvm の導入そのものは未実測のまま**（記録に残っていない）。
- **合格の基準**：`node -v` が `v24.x`（10/23 は v24.22.0）。Node のバージョンの根拠は、リポジトリの `.nvmrc`（`24`）。
- **pnpm の確認は、ステップ 4 でリポジトリに入ってから行う**（`pnpm -v` が `package.json` の `packageManager` と同じ版であること）。
- **リポジトリの外で `pnpm -v` を打つと、別の版が出る**（10/23 は 12.15.0。corepack が「ダウンロードしてよいか」と聞いたので `y` で進めた）。**問題ではない。** `packageManager` の指定はリポジトリの中でだけ効く。

## ステップ 4. リポジトリと `.env`

### 4-1. HTTPS で clone する

**HTTPS で clone する。個人の SSH 鍵を、共用の PC に置かない。** リポジトリは public で、サーバーは読むだけなので、認証が要らない。**置き場所は WSL の中（`~` 配下）。`/mnt/c` には置かない**（§4）。

```bash
# [Ubuntu]
mkdir -p ~/workspace && cd ~/workspace
git clone https://github.com/250158hj-maker/yse_compass.git
cd yse_compass
git log --oneline -1
pnpm -v
```

- **HTTPS での clone は、1 回目は未実測**（既存の clone のリモートを HTTPS に切り替えて `git pull` した）。**2 回目で通った。**
- **リポジトリの中で初めて `pnpm -v` を打つと、corepack が「ダウンロードしてよいか」と聞くことがある**（2 回目で、リポジトリの中でも出た。1 回目の記録では、リポジトリの外で同じ確認が出た：ステップ 3）。`y` で進める。
- **合格の基準**：clone が通り、`pnpm -v` が `package.json` の `packageManager`（`grep packageManager package.json`）と同じ版（10/23 は 11.17.0）。

### 4-2. `.env` を作る

**この節の手順（`cp`・`AUTH_SECRET` の生成）は、1 回目は未実測**（既存の `.env` を使った）。**2 回目で通った**（つまずいた点は、この節の末尾）。

```bash
# [Ubuntu] ~/workspace/yse_compass で
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
| `AUTH_TRUST_HOST` | **`.env.example` には無い。`AUTH_TRUST_HOST=true` の 1 行を足す**（`AUTH_URL` も無い場合：下の注意 2） |
| `DEV_TEACHER_EMAIL`・`DEV_TEACHER_NAME` | 先生としてサインインするアカウントのアドレス（名前は省略可） |

`AUTH_SECRET` は、次のコマンドで作り、出力を `.env` の `AUTH_SECRET=` のあとに貼る（出力はチャットなどに貼らない）。

```bash
# [Ubuntu]
openssl rand -base64 33
```


`POSTGRES_DB` は、`.env.example` のままでも動く。`POSTGRES_USER`・`POSTGRES_PASSWORD` は、下の「DB の 5432 番について」のとおり既定から変える。**`DATABASE_URL` のホストは `localhost` のままにする**（アプリは WSL の中で直接動かし、DB だけを docker compose で動かすため：`.env.example` のコメント）。

**DB の 5432 番について**

- **事実**：`docker-compose.yml` は、DB を 5432 番で、すべてのインターフェースで待ち受ける（`ports` の `"5432:5432"`）。NAT 方式で Windows 側のポート転送をしない限り、LAN からは届かない見込み（`../docs/findings.md` F-13 が転送したのは 3000 番で、5432 番は転送していない）。
- **歯止め**：**ステップ 6 でも、5432 番は転送しない。**
- **DB の認証情報**：`POSTGRES_PASSWORD` を中心に、`POSTGRES_USER` も、`.env.example` の既定から**変える**。`DATABASE_URL` の中の値も合わせる。実際の値は GitHub に書かず、サーバーの持ち主の `.env` にだけ置く。
- **期限**：**ステップ 5 の最初の `docker compose up` の前に `.env` を直す。** DB のボリュームができたあとは変えにくい。

**注意（4 つ）**

1. **`SCHOOL_WORKSPACE_DOMAIN` は入れる。** 空のままのときの挙動は `src/auth.ts` を見る（そこが正。本書には書き写さない）。
2. **`.env.example` に無く、`AUTH_URL` も無い場合は、`AUTH_TRUST_HOST=true` の 1 行を足す。** 理由と実測は `../docs/design/08-architecture.md` 8-7-3 を参照（08 は暫定）。
3. **`AUTH_GOOGLE_ID`・`AUTH_GOOGLE_SECRET` は、OAuth クライアントの作成者が自分で入れる。チャットに貼らない。**
4. **`DEV_TEACHER_EMAIL` は、Google が返す表記と、大文字・小文字まで合わせる。** 違うと別の行が作られ、先生が生徒として扱われる（`scripts/seed-dev.mjs` のコメントのとおり）。

`.env` の中身は、値を出さずに確かめる。

```bash
# [Ubuntu] 変数名と「空／値あり」だけを出す
awk -F= '/^[A-Z_]+=/{print $1, ($2=="" ? "(空)" : "(値あり)")}' .env
```

- **合格の基準**：`AUTH_GOOGLE_ID`・`AUTH_GOOGLE_SECRET` 以外の変数が、すべて `(値あり)`（`DEV_TEACHER_NAME` は省略可）。Google の 2 変数が入るまでは、ビルドと `/api/health/db` までは通るが、Google サインインは試せない。
- **2 回目の実測（手順どおりでなかった点）**
  - **保存を忘れた。** nano で編集したあと、保存せずに閉じて、`.env` に反映されていなかった（保存は `Ctrl+O` のあと `Enter`、終了は `Ctrl+X`）。上の「変数名と空／値ありだけを出す」確認で気づけた。**編集のあとは、必ず確認を打つ。**
  - **`DATABASE_URL` のパスワードを直し忘れた。** `POSTGRES_PASSWORD` だけを変えて、`DATABASE_URL` の中が既定のままだった。値を出さずに確かめるには、次を打つ。`password 不一致` と出たら直す。
    ```bash
    # [Ubuntu]
    u=$(grep '^DATABASE_URL=' .env | cut -d= -f2-); p=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-); case "$u" in *"$p"*) echo "password 一致";; *) echo "password 不一致";; esac
    ```
  - **パスワードは `openssl rand -hex 24` で作った。** `DATABASE_URL` に入れるので、`/` `+` `=` を含む `base64` は避けた。
  - **`POSTGRES_USER` は、最初は既定のままにした**（パスワードだけを変えた。手順書の「既定から変える」とは違う）。**のちに、DB のボリュームを作り直して変えた**（リーダーの決定：#164 の review thread。2026-10-26、先生の登録の前）。`docker compose down -v` でボリュームを消し、`POSTGRES_USER` と `DATABASE_URL` のユーザー部分を同じ値に直した（`user 一致`・`password 一致`を確認。値は書かない）。そのあと、ステップ 5 の 3（`migrate status`：移行 3 本が未適用と出た）・4・5・6（seed：年度 2026・2025、クラス 6 件、先生 1 人）・7・8 を打ち直し、9 が `{"status":"ok"}` を返した（`build exit=` の値の出力は、この打ち直しでは控えていない。起動できたことで通ったとみる）。`DATABASE_URL` のユーザー部分を直し忘れ、`user 不一致` になった（`sed` で直した）。ステップ 5 の 4 で Prisma の agent skills の導入を聞くプロンプトが出た（手順とは関係ない。No を選んだ）。この PC は NAT 方式（`.wslconfig` 無し）で、5432 番は転送していないが、別の PC から 5432 番に届かないことは、6-4 で確かめた（届かなかった）。**ボリュームを作り直したあとにも、同じ別の PC から 3000 番の `/api/health/db` が `{"status":"ok"}` を返し、5432 番は `TcpTestSucceeded` が `False` のままだった**（同じ教室の 1 台・1 回）。
  - **`AUTH_TRUST_HOST=true` は、`echo 'AUTH_TRUST_HOST=true' >> .env` で足した。** 足す前に、最終行が改行で終わっているかを `tail -c 1 .env | xxd -p`（`0a` なら終わっている）で確かめた。
  - **エディタは、vim ではなく nano を使った。**

## ステップ 5. DB・ビルド・起動

**コマンドの出力を、`| tail` などのパイプに通さない。** 終了コードが失われ、失敗に気づけない。10/23 に `pnpm build` を `| tail` に通したため失敗を見逃し、`pnpm start` が「production build が無い」で止まった。**ビルドは、ログに出して終了コードを見る。**

**DB の認証情報は、1 を打つ前に既定から変えておく**（ステップ 4-2「DB の 5432 番について」）。

```bash
# [Ubuntu] ~/workspace/yse_compass で、上から順に。1 つずつ結果を見てから次へ

# 1. DB を起動（healthy になるまで待つ）
docker compose up -d --wait db

# 2. 依存を入れる
pnpm install --frozen-lockfile

# 3. マイグレーションの状態を見る（この時点では、未適用があると終了コードが 0 以外になることがある（見込み）。未適用の 3 本が並べば想定どおり）
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

- **1 は、1 回目は未実測**（10/23 より前に作られていた DB のコンテナが、すでに `(healthy)` で動いていた）。**2 回目は実行した**（出力は記録していない）。`--wait` が使えない版のときは、`docker compose up -d db` のあと、`docker compose ps` の `db` が `(healthy)` になるまで繰り返す。
- **1 が通らないときは、Docker Engine が動いているかを先に確かめる**（`systemctl status docker --no-pager | head -8`。`is-enabled` が `enabled` なら、WSL の起動で自動で上がる）。動いていなければ `sudo systemctl start docker`（パスワードを聞かれる）を打ってから、1 をやり直す。**3 回目は、`sudo systemctl start docker` を打ったが、Docker は WSL の起動の 2 秒後に自動で起動していて、この操作は要らなかった可能性が高い**（エラーの文面は記録していない。打つ前の状態も確かめていない）。
- **2 で依存を実際に取得する初回は、1 回目は未実測**（`Already up to date`）。**2 回目は実行した**（出力は記録していない）。
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
- 10/23 の実測：移行 3 本の適用・`prisma generate`（Prisma Client 7.10.0）・seed（年度 2026・2025、クラス 6 件、先生 1 人）が通った。**ビルドと疎通（9 の `{"status":"ok"}`）まで進んだのは口頭での報告で、出力は記録に残っていない。** その途中で、上のビルドの失敗の見逃しがあった。**本書の形（ログに出して終了コードを見る）で通した記録は、2 回目（立て直し）で取れた（L351）。**
- **3 の `migrate status` が接続エラーのときは、数秒待って打ち直す**（DB の初回の初期化中に当たることがある。見込み）。
- **端末を閉じたときの挙動・バックグラウンドでの常駐は、本書では扱わない**（再起動の試験は §3 の表。常駐は今後の課題）。
- **2 回目の実測**：3（`migrate status`）は、未適用の 3 本が並んだ（想定どおり）。6（seed）は「年度 2026・2025、クラス 6 件、先生 1 人」で、1 回目と同じ。7（ビルド）は `build exit=0`。**9 は、`curl` ではなく、サーバーにした PC の Windows のブラウザ（Edge）で `http://localhost:3000/api/health/db` を開いて `{"status":"ok"}` を確かめた。** 1・2・4・5 の出力は記録していない。

- **更新して起動し直すとき（3 回目で通した順）**：①Docker Engine と DB が動いているかを確かめる（動いていなければ 1。上の `sudo systemctl start docker`）→ ②`git pull`（`main`・変更なしを先に確かめる）→ ③上の 2〜5・7（`migrate status` で `drift`・`failed`・P3005 が出たら止める。`migrate deploy`・`prisma generate`・ビルドは `exit=0` まで）→ ④8（`pnpm start`）→ ⑤9（疎通）。**`pnpm start` が動いたままなら、②の前に端末で Ctrl-C して止める**（3 回目は、止まっていたので、この操作を行っていない）。seed（6）は、年度・クラス・先生を作り直すときだけ。

### Google サインインの入口

- **入口は `/real/teams`**（サーバーにする PC の Windows のブラウザで `http://localhost:3000/real/teams`）。**`/` はモックのホーム。未ログインなら `/login` へ送られる。**
- 開くと、サインインしていなければ自前のログイン画面（`/login?callbackUrl=…`）へ送られ、そこの「Google でログイン」（サインインの Action：`src/lib/actions/auth.ts`）を押して終わると、`/real/teams` に戻る（`src/lib/auth/session.ts`・Issue #185）。**入口の URL は、`/real/teams` のまま変わらない。** サインインが断られたとき（学校のドメイン以外など）は、`/login?error=…` に戻る（`src/auth.ts` の `pages.error`・2026-10-27 に `localhost` で、遷移先を確かめた）。
- **サインインのあとに見えるもの（コードから言える範囲。実機では未確認）**
  - **学校のドメインのアカウントだけが通る**（`src/lib/auth/callbacks.ts` の `signIn`）。
  - **`DEV_TEACHER_EMAIL` のアカウント（先生）**：チーム一覧（`src/app/(real)/real/teams/page.tsx`）。画面の上部に「年度管理」へのリンクが出る（`src/app/(real)/real/layout.tsx`）。seed が入れる年度のうち、一覧に出るのは未アーカイブの 2026 年度だけ（2025 年度はアーカイブ済みで出ない。切り替えボタンも出ない）。seed はチームを入れないので、一覧は「2026年度には、まだチームがありません。」になる。チームの作成フォームが出る。
  - **それ以外の学校のアカウント**：初回のサインインで生徒として行が作られ、チーム一覧は開くが、作成フォームは出ない。
  - **seed の前にすでにサインインしていた場合は、seed のあとにサインインし直す**（ロールはサインインのときにトークンに載るため。`scripts/seed-dev.mjs` のコメントのとおり）。
- 確かめたこと（2026-10-27・デモ用 PC・`52b83ed` の版で、入口を変える前の Auth.js 既定のサインイン画面から）：OAuth クライアントに登録済みの redirect URI（`http://localhost:3000/api/auth/callback/google`）が、この構成で通る。サインインは 1 回目・2 回目とも通り、ロール（生徒・先生）が解決された。学校のドメイン以外のアカウントは、Google の入力画面が学校のドメインに固定していて、入力できなかった（アプリ側の拒否は単体テストで確認。実機では未確認）。別の PC への画面共有も映った（`../docs/findings.md` F-04 は別の環境で確認）。
- 確かめたこと（3 回目・2026-10-29・`2f25ce6` の版で、入口を変える前の Auth.js 既定のサインイン画面から）：この構成（サーバーにした PC の `http://localhost:3000`）で、Google サインインが一周通った（OAuth クライアントに登録済みの redirect URI を含む。生徒・先生の両方のロール。§1 の 3 回目の表）。`../docs/findings.md` F-04 は `localhost` の別の環境での確認。
- 確かめたこと（2 回目）：Windows のブラウザから WSL の `localhost:3000` に届く（`/api/health/db` が `{"status":"ok"}`）。

## ステップ 6. LAN への公開

**目的は、同じ教室の別の PC から `http://<Windows の IP>:3000/` に届くようにすること。** 方式は `../docs/findings.md` F-13（Windows 側のポート転送とファイアウォールの許可）。**2026-10-23、2 回目の実測で、別の PC から `/api/health/db` が `{"status":"ok"}` を返した**（実測の範囲：同じ教室の 1 台の PC へ、1 回。ほかの教室・時間帯は未確認）。

**IP アドレスは、このリポジトリが公開なので書かない。** 以下では `<WSL の IP>`・`<Windows の IP>` と書く。**打つときは、`<` と `>` ごと、本物の値に置き換える。** 実測では、`<WSL の IP>` を置き換えずに打ってしまい、転送先に文字がそのまま入った（`netsh` はエラーを出さずに受け付ける）。`show` の右列が数字になっているかを必ず見る。

### 6-1. 値を調べる

```bash
# [Ubuntu] WSL の IP。eth0 の inet の値（/ より前）を使う
ip -4 addr show eth0 | grep inet
```

- **`hostname -I` は使わない。** Docker の内部ネットワーク（`docker0`）のアドレスも並び、取り違えやすい。
- 実測では、`eth0` は 172 系ではなかった（NAT 方式の WSL が 172 系とは限らない）。

```powershell
# [PowerShell] Windows の IP と、ネットワークの種類
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object InterfaceAlias, IPAddress
Get-NetConnectionProfile | Select-Object InterfaceAlias, NetworkCategory
```

- **使う IP は、教室の LAN につながっている行（Wi-Fi なら `Wi-Fi`）。** **実測**（3 回目）：`Wi-Fi` の行の IP で、別の PC から届いた。**仕組みからの説明（実測では確かめていない）**：`vEthernet (WSL …)` は Windows と WSL の内部用で、別の PC からは見えないので使わない。
- **`NetworkCategory` を見る。** 実測では **`DomainAuthenticated`**（ドメインに参加した Wi-Fi）で、F-13 の `Private` とは違った。**ファイアウォールの許可は、ここで出た種類のプロファイルに付ける**（6-3）。

### 6-2. ポート転送（3000 番だけ）

**管理者として開いた PowerShell で行う**（§3。管理者の資格情報が要る。普通に開いた PowerShell では通らない）。開き方は、`Win + X` →「ターミナル (管理者)」（または「Windows PowerShell (管理者)」）で、確認のダイアログが出る。**3 回目の実測では、管理者のアカウントの資格情報（ID とパスワード）を求められた**（値は書かない）。**この PowerShell では `wsl` を打たない。**

```powershell
# [PowerShell・管理者] 入っている転送を確かめる（空なら何も出ない）
netsh interface portproxy show v4tov4

# 転送を入れる（<WSL の IP> は本物の値に置き換える）
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3000 connectaddress=<WSL の IP> connectport=3000
netsh interface portproxy show v4tov4
```

- **合格の基準**：`show` に、`0.0.0.0` の 3000 番から、`<WSL の IP>` の 3000 番への 1 行だけが出る。**5432 番は転送しない**（ステップ 4-2）。
- 入れ直すときは、先に消す。

```powershell
# [PowerShell・管理者]
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=3000
```

### 6-3. ファイアウォールの受信許可（3000 番だけ）

```powershell
# [PowerShell・管理者] Profile は 6-1 の NetworkCategory に合わせる（実測は DomainAuthenticated なので Domain）
New-NetFirewallRule -DisplayName "yse-compass demo 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Domain
Get-NetFirewallRule -DisplayName "yse-compass demo 3000" | Select-Object DisplayName, Enabled, Profile
```

- **合格の基準**：`Enabled` が `True`、`Profile` が 6-1 の種類と合っている。
- **ドメインのグループポリシーが、ローカルのルールを上書きすることがある**（見込み。実測では上書きされなかった）。

### 6-4. 確かめる

1. サーバーにした PC の Windows のブラウザで、`http://<Windows の IP>:3000/api/health/db`（`pnpm start` を動かしたまま）。転送が効いているかの確認。
2. **同じ教室の別の PC のブラウザで、同じ URL。** `{"status":"ok"}` が返れば合格。

- **DB（5432 番）が LAN に出ていないことの確認**：別の PC の PowerShell で `Test-NetConnection <Windows の IP> -Port 5432` を打つ。**合格の基準は、`TCP connect … failed`（`TcpTestSucceeded` が `False`）。** 2 回目の実測で、別の PC から `False` だった（同じ教室の 1 台・1 回）。同時に出る `Ping … TimedOut` は、Windows が既定で ICMP を通さないためで、ホストの停止を意味しない（3000 番には届いている）。`True` なら、5432 番が出ているので、転送（6-2）を確かめる。
- **サーバーにした PC の Windows のブラウザから、`http://<WSL の IP>:3000/` へ直接は届かなかった**（2 回目の実測。原因は未確認。転送は通っているので、公開には影響しない。ブラウザのプロキシ設定などが見込み）。
- 別の PC から繋がらないときの見立て（実測していない）：タイムアウトなら、ファイアウォールの許可のプロファイルか、Wi-Fi の端末分離。接続拒否なら、ポート転送（`iphlpsvc` が動いているか：`Get-Service iphlpsvc`）。

### 6-5. 元に戻す

```powershell
# [PowerShell・管理者]
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=3000
Remove-NetFirewallRule -DisplayName "yse-compass demo 3000"
```

### 再起動の試験（2 回目・1 回）

`wsl --shutdown` を PowerShell（普通に開いたもの）で打ち、別の PC からの確認が切れたあと、Ubuntu を開き直した。**アプリが止まったことは、別の PC からの確認が切れたことでみた。`ss` などで止まった状態を確かめてはいない**（§3 の表と同じ範囲）。

- **DB は自動で戻った。** `docker compose ps` が `Up … (healthy)`（`~/workspace/yse_compass` で打つ。ホームだと `no configuration file provided`）。
- **`eth0` の IP は変わらなかった**（1 回だけ）。転送は入れ直さずに通った。
- **アプリは `pnpm start` を打ち直して戻した。**
- Windows の再起動・サインアウト・スリープは、試していない（§3）。

## 片付け

- **10/23 にリーダーの Windows アカウントで作った仮置きのサーバーは、新しい持ち主（インフラ担当：§2）の側が立ち上がったら止める。** 2 台が同時に動くと、どちらが本物か分からなくなるため。
  - 止め方：`pnpm start` の端末で Ctrl-C。続けて、Ubuntu の端末で、リポジトリのディレクトリ（`~/workspace/yse_compass`）に入って `docker compose down`（データは残る。`-v` は付けない）。
- **仮置きの側の Ubuntu そのものを消すかは、あとで決める。** 消すと、中身は戻せない。
- 立ち上がったかの判断は、新しい持ち主の側で、ステップ 5 の 9 が `{"status":"ok"}` を返すこと。
- **2026-10-23 の 2 回目の側（インフラ担当のアカウント）は、この判断を満たした**（ステップ 5 の 9 が `{"status":"ok"}`）。リーダーの仮置きを止めるかどうかは、リーダーの判断。
- **12/18 のあとは、ステップ 6-5 の「元に戻す」で、ポート転送とファイアウォールの許可を外す。** 残すと、使わない転送と許可が残る。

## 関連

- 方式設計の開発・実行環境（確度は暫定。本書では、コマンドと実測の出どころとしてだけ指す）：`../docs/design/08-architecture.md` 8-6・8-7-3
- 別の PC から届くか・サインインの見込み：`../docs/findings.md` F-04・F-13、`../docs/open-questions.md` H-38
- デモ環境の決定：`../docs/decisions.md` 2026-10-20 のデモ環境の行
- 学校の了承：`../docs/hearing.md` §16-3
