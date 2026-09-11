# 06. データ設計

> **位置づけ**：語彙をどうテーブルへ落とすか — ER・テーブル定義・コード定義を答える
> **確度**：**暫定（レビュー未了）**
> **正典**：このファイル（テーブル定義の正典。**語彙の正典は `../glossary.md`**）
> **更新のしかた**：上書き
> **主担当**：蒲山
> **最終更新**：2026-09-11（水戸・H-21 決着＝`hearing.md` §7-2 現物照合の結果、`teams.number` を置かないことを確定）／2026-09-11（蒲山・水戸レビュー2周目（PR #23）対応。N-1〜N-6 を反映。H-21・H-22 は引き続き水戸の判断待ち）／2026-09-11（蒲山・水戸レビュー（PR #23）対応。A-1〜A-5・B-2・C-1〜C-4・D-1〜D-3 を反映し、B-1・B-3 は水戸の判断待ちとして `open-questions.md` H-21・H-22 へ起票）／2026-09-11（蒲山・6-1〜6-6 の初稿を執筆。H-20 を新規起票し、時刻枠は先行方針で除外して組んだ）

## この章が答える問い

`../glossary.md` が「この言葉は何を指すか」に答えるのに対し、この章は「**それをどう格納するか**」に答える。**別の問いなので、両方が正典として並存する。**

> **`glossary.md` の定義を転記しない。** 各テーブルに「対応する語彙：`../glossary.md` §4 提出」と書き、定義本体は参照で済ませる（`00-conventions.md` §4-1）。

## 書くもの

| # | 成果物 | 形式 |
| --- | --- | --- |
| 6-1 | 概念 ER 図 | 図（エンティティと関連のみ。属性は載せない） |
| 6-2 | 論理 ER 図 | 図（属性・主キー・外部キー・カーディナリティ） |
| 6-3 | テーブル定義 | テーブルごとに：列名 ／ 型 ／ NULL ／ 既定値 ／ 制約 ／ **対応する語彙** ／ **根拠（決定日）** |
| 6-4 | コード定義 | 表（クラス ／ 回種別 ／ 提出状態 ／ 公開許可状態 などの列挙値と、その出典） |
| 6-5 | インデックス方針 | 検索・提出状況一覧の想定クエリに対する設計 |
| 6-6 | 導出値の一覧 | **テーブルに持たない値**（遅延・提出率など）と、その導出式 |

> **6-6 を必ず置く。** 「遅延は状態ではなく導出値」（`../glossary.md` §4）のような決定が、列として実装されるのを防ぐ。

## 書かないもの

| 書かないこと | 参照先 |
| --- | --- |
| 語の定義・粒度・アンカー | `../glossary.md` |
| 決定の根拠の全文 | `../decisions.md` |
| 物理設計（パーティション・チューニング） | 詳細設計の範囲 |

## 埋まる条件

**着手可能。ただし障害は依然として最も多く、かつ本設計書のクリティカルパス。**

### 先に解く必要があった正典の矛盾 — 2026-09-04 決着

**A-1（発表順の所属）・A-3（概要の粒度）は decisions.md へ記録して決着済み。** 発表順は発表エンティティの整数属性、概要は発表（チーム×発表会）にひもづく年4件。**ER の形を縛る矛盾は解消し、本章は着手可能になった**（H-6・#7 等の ER 直結未決は下表に残る）。

**2026-09-04 追加決着 — ER の形が確定した箇所**（`../decisions.md` 同日）

- **クラス**：年度セットアップで生成する**運用データ**。登録主体は先生。**クラス名は分解せず文字列 1 つ**で持つ（学科・学年・組へ分解することを要求する要件が正典に無い）。命名は「学科＋学年＋組」＝ `IG21` は IG 科 2 年 1 組（H-3 決着）
- **チーム**：**先生（担任）が作成する。生徒はチームを作成できない**（#6 決着）
- **リーダー**：**チームの属性**（代表者 1 名への参照）であって**ロールではない**。ロールが DB で持つ値は「先生／生徒」の 2 値のまま。責務は公開許可の設定のみ
- **年度セットアップとチーム登録**：**独立した操作**で順序を強制しない。チーム 0 件のときの提出状況一覧は空状態（H-9 決着）

### ER 直結の未決

| 障害 | 内容 | 先行方針 |
| --- | --- | --- |
| **H-6** | 提出日時が単一だと期限内提出が遅延に化ける | **2 値で組む**（初回提出日時＋最終更新日時） |
| **#7** | テンプレートの扱い | — |
| **#8** | 先生ロールの親子二層構造の要否 | 単層で組む |
| **#10** | Drive 統合の範囲（提出のリンク列の形が変わる） | Stage 1＝リンク登録 |
| **T-3** | 使用技術欄の表記ゆれ（自由記述か統制語彙か） | — |
| **H-14**（旧 `cond`） | 試作品一式は「必須／任意」の 2 値で表せない | 必須／任意の 2 値のまま組み、部分提出は表現しない |
| **H-20**（新規・2026-09-11 起票） | 当日タイムテーブルの「時刻枠」の中身（開始時刻・所要・休憩）が未定義 | 発表エンティティは発表順（整数）のみを持つ。時刻枠の列は追加しない |
| **H-22**（新規・2026-09-11 起票・水戸レビュー B-3） | 公開許可の値が2値（許可／非表示）か3値（＋拒否）かが未決 | `works.is_public_approved` は boolean のまま。「拒否」の区別は表現しない |

### 既存モック実装との差（2026-09-03 監査）

**`src/lib/types.ts` は「モック画面用の仮スキーマ」であり、この章の下書きではない。** 監査で以下の乖離が確認されている。ER を引くときに引きずらないこと。

| 項目 | 正典 | モック実装 |
| --- | --- | --- |
| クラス | AI21 / BD21 / GS21 / IG21 / IG22 | 1年A組〜3年C組（**5つとも不一致**） |
| 定番の資料枠 | 概要／プレゼン資料／概要設計書／詳細設計書／試作品一式／完成作品一式 | 企画書／補足資料／設計書／ER図／発表スライド／デモ動画／成果報告書（**全不一致・概要枠が無い**） |
| 締切 | **資料枠**の属性（確定・2026-07-26） | 発表会に 1 つだけ |
| 発表順 | 発表エンティティの整数属性 | タイムテーブル行にのみ存在 |
| 提出日時 | 2 値で組んでよい（H-6） | 単一フィールド（**H-6 の破綻形**） |
| 正典に無い属性 | — | 発表会の3値ステータス／Template エンティティと形式区分／Team.summary／Material.driveUrl |

> **訂正（水戸レビュー B-3）**：上表はモック実装の「公開許可の『拒否』」を正典に無い属性と分類していたが、これは誤り。`requirements.md` §3-7 受け入れ基準に「公開許可が**未設定・拒否**の作品は…表示されない」と明記されており、「拒否」は正典に実在する語である。**H-22 として起票し直した。**

## 現在の状態

**2周目のレビュー指摘（N-1〜N-6）まで対応済み**（2026-09-11・蒲山）。水戸の1周目レビュー（PR #23・Request changes）のA〜D群、2周目のN-1〜N-6群とも本稿に反映した。**H-21（チーム番号）は水戸が現物照合し決着**（`number`列を置かない）。残るのは**H-22（公開許可の値の数）のみ**。**全体が確度「暫定」でレビュー未了**（`CLAUDE.md` 禁則6）— 水戸の Approve が済むまで、他章から「決定」として引用しないこと。

**この章が開くと 03・04・05・07 が一斉に開く**（`00-conventions.md` §5-4）。逆に言えば、ここを開けない限り設計書は完成しない。

---

## 6-1. 概念 ER 図

エンティティと関連のみ。属性は載せない（`glossary.md` の粒度定義に対応）。

```mermaid
erDiagram
    FISCAL_YEAR ||--o{ SCHOOL_CLASS : "生成する"
    FISCAL_YEAR ||--o{ EVENT_OCCASION : "4回持つ"
    SCHOOL_CLASS ||--o{ TEAM : "属する"
    TEAM ||--|| WORK : "1つ持つ"
    TEAM ||--o{ USER : "所属する（生徒）"
    TEAM |o--o{ USER : "代表する（リーダー）"
    EVENT_OCCASION ||--o{ MATERIAL_SLOT : "定義する"
    TEAM ||--o{ PRESENTATION : "参加する"
    EVENT_OCCASION ||--o{ PRESENTATION : "束ねる"
    TEAM ||--o{ SUBMISSION : "提出する"
    MATERIAL_SLOT ||--o{ SUBMISSION : "対象になる"
    TEAM ||--o{ SUMMARY : "提出する"
    EVENT_OCCASION ||--o{ SUMMARY : "対象になる"
    PRESENTATION ||--o{ COMMENT : "アンカーになる"
    USER ||--o{ COMMENT : "投稿する"
    COMMENT |o--o{ COMMENT : "返信する"
    PRESENTATION ||--o{ PRESENTATION_LIKE : "いいねされる"
    COMMENT ||--o{ COMMENT_LIKE : "いいねされる"
    USER ||--o{ PRESENTATION_LIKE : "いいねする"
    USER ||--o{ COMMENT_LIKE : "いいねする"
```

> **「発表」は「チーム×発表会」の安定エンティティ**（`glossary.md` §4）。コメント・いいね・発表順はここにぶら下がる。
> **「提出」と「概要」は別エンティティ**（H-2・A-3 決着）。概要枠はフォーム入力で内容そのものを保持し、他の資料枠はリンク登録として「提出」に集約する。
> **`SCHOOL_CLASS` は Mermaid の描画都合による表記**（`CLASS` が erDiagram の予約語と衝突するため改名・`48eef0e`）。**実テーブル名は `classes`**（6-3）（水戸レビュー N-5）。

---

## 6-2. 論理 ER 図

属性・主キー・外部キー・カーディナリティ。**H-20 が未決のため、発表（PRESENTATION）は発表順のみを持ち、時刻枠の列は含めない**（先行方針）。

```mermaid
erDiagram
    FISCAL_YEAR {
        int id PK
        int year UK
        boolean is_archived
    }
    SCHOOL_CLASS {
        int id PK
        int fiscal_year_id FK
        string name
    }
    TEAM {
        int id PK
        int class_id FK
        string name
        int leader_user_id FK "nullable"
    }
    WORK {
        int id PK
        int team_id FK, UK
        string title "nullable・C-3"
        boolean is_public_approved
    }
    USER {
        int id PK
        string email UK
        string name
        string role
        int team_id FK "nullable・生徒のみ"
    }
    EVENT_OCCASION {
        int id PK
        int fiscal_year_id FK
        string kind
        date event_date "nullable"
        boolean is_published
        int current_presentation_id FK "nullable"
    }
    MATERIAL_SLOT {
        int id PK
        int event_occasion_id FK
        string slot_type
        timestamp deadline
        boolean is_required
        string template_url "nullable"
    }
    SUBMISSION {
        int id PK
        int team_id FK
        int material_slot_id FK
        string url
        timestamp first_submitted_at
        timestamp last_submitted_at
    }
    SUMMARY {
        int id PK
        int team_id FK
        int event_occasion_id FK
        text tech_stack "nullable・T-3未決"
        timestamp first_submitted_at
        timestamp last_submitted_at
    }
    PRESENTATION {
        int id PK
        int team_id FK
        int event_occasion_id FK
        int display_order "nullable・H-5確定分のみ"
    }
    COMMENT {
        int id PK
        int presentation_id FK
        int user_id FK
        int parent_comment_id FK "nullable"
        string label "nullable"
        text body
        timestamp created_at
    }
    PRESENTATION_LIKE {
        int id PK
        int presentation_id FK
        int user_id FK
    }
    COMMENT_LIKE {
        int id PK
        int comment_id FK
        int user_id FK
    }

    FISCAL_YEAR ||--o{ SCHOOL_CLASS : has
    FISCAL_YEAR ||--o{ EVENT_OCCASION : has
    SCHOOL_CLASS ||--o{ TEAM : has
    TEAM ||--|| WORK : has
    TEAM ||--o{ USER : has
    TEAM |o--o| USER : "leader_user_id"
    EVENT_OCCASION ||--o{ MATERIAL_SLOT : has
    EVENT_OCCASION |o--o| PRESENTATION : "current_presentation_id"
    TEAM ||--o{ PRESENTATION : has
    EVENT_OCCASION ||--o{ PRESENTATION : has
    TEAM ||--o{ SUBMISSION : has
    MATERIAL_SLOT ||--o{ SUBMISSION : has
    TEAM ||--o{ SUMMARY : has
    EVENT_OCCASION ||--o{ SUMMARY : has
    PRESENTATION ||--o{ COMMENT : has
    USER ||--o{ COMMENT : posts
    COMMENT |o--o{ COMMENT : "parent_comment_id"
    PRESENTATION ||--o{ PRESENTATION_LIKE : has
    COMMENT ||--o{ COMMENT_LIKE : has
    USER ||--o{ PRESENTATION_LIKE : posts
    USER ||--o{ COMMENT_LIKE : posts
```

---

## 6-3. テーブル定義

### `fiscal_years`（年度）

対応する語彙：`../glossary.md` §2 年度

| 列名 | 型 | NULL | 既定値 | 制約 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| id | serial | NOT NULL | — | PK | — |
| year | int | NOT NULL | — | UNIQUE | 年度は西暦4桁で一意（例：2026） |
| is_archived | boolean | NOT NULL | false | — | アーカイブは可逆（2026-07-26） |

### `classes`（クラス）

対応する語彙：`../glossary.md` §3 クラス

| 列名 | 型 | NULL | 既定値 | 制約 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| id | serial | NOT NULL | — | PK | — |
| fiscal_year_id | int | NOT NULL | — | FK → fiscal_years.id | 年度セットアップで生成（2026-09-04・H-3） |
| name | varchar | NOT NULL | — | UNIQUE(fiscal_year_id, name) | **分解せず文字列1つ**で持つ（H-3 決着。現行値は AI21/BD21/GS21/IG21/IG22 → 6-4） |

### `teams`（チーム）

対応する語彙：`../glossary.md` §3 チーム／リーダー

| 列名 | 型 | NULL | 既定値 | 制約 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| id | serial | NOT NULL | — | PK | — |
| class_id | int | NOT NULL | — | FK → classes.id | チームはクラスに属する |
| name | varchar | NOT NULL | — | UNIQUE(class_id, name) | チーム名。`requirements.md:181`・`glossary.md:195`「検索対象は基本メタデータ（年度・**チーム名**・作品名・資料種別）」／`hearing.md:35`「タイムテーブル・**チーム名**・作品・メンバーをスプレッドシートで手作業管理」（水戸レビュー A-1・現行運用に実在） |
| leader_user_id | int | NULL | — | FK → users.id・複合 FK（後述） | チームの属性としてのリーダー参照。ロールではない（2026-09-04 決着） |

> **生徒はチームを作成できない**（#6 決着）。作成主体は先生だが、作成者列は監査要件（G-5・未決）待ちのため持たない。
> **`number`（チーム番号）は置かない（決着済み）。** 当初 Drive ディレクトリ命名「番号_発表名」（`glossary.md` §3）から正典化したが、水戸のレビュー（PR #23）でクラス略称が「番号_発表名」の**下位**にある構造だと指摘された。**水戸が `hearing.md` §7-2 の現物を照合し、番号を伴わない発表名のみと確認**（H-21 決着・`decisions.md` 2026-09-11）
> **`leader_user_id` の複合 FK**：`teams(leader_user_id, id)` → `users(id, team_id)`（`users` 側に `UNIQUE(id, team_id)` を張る）。**リーダーは必ずそのチームに所属する生徒でなければならない**（`glossary.md` §3 リーダー＝チームの属性）ため、他チームの生徒を代表者に設定できないよう DB レベルで塞ぐ（水戸レビュー C-1）。**行の投入順**：チーム作成 → メンバー（`users.team_id`）割当 → リーダー指定、の順でなければ複合 FK を満たせない

### `works`（作品）

対応する語彙：`../glossary.md` §6 作品／公開許可

| 列名 | 型 | NULL | 既定値 | 制約 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| id | serial | NOT NULL | — | PK | — |
| team_id | int | NOT NULL | — | FK → teams.id・UNIQUE | 作品はチームが1つ持つ（`glossary.md` §3） |
| title | varchar | NULL | — | — | アーカイブ導線「年度→**作品名**」（`requirements.md` §3-7）から正典化（2026-09-11）。**NULL 可**（水戸レビュー C-3）：チーム作成時点（先生が担任として作成・#6 決着）で作品名が決まっている保証は正典に無い。行はチーム作成と同時に生成し、名称は後から編集する |
| is_public_approved | boolean | NOT NULL | false | — | 公開許可は既定**非表示**（2026-07-26）。**「拒否」を含む値の数は未決 — `open-questions.md` H-22 参照**（水戸レビュー B-3。`requirements.md` §3-7 受け入れ基準に「未設定・**拒否**」の語があり、2値で組んだ暫定実装は水戸の決定待ち） |

> **作品の年度は `team → class → fiscal_year` で導出できるため、独立した列を持たない**（6-6）。
> **行の生成タイミング**：チーム作成（先生の操作・#6 決着）と同時に1行生成する。`title` は空で作成でき、後から編集できる（水戸レビュー C-3）。
> **`title` はアプリ層で「公開許可の設定時点」に必須化する**（水戸レビュー N-6）：`is_public_approved = true` に更新する操作は、`title` が NULL の作品に対して拒否する。これにより `requirements.md` §3-7 のアーカイブ導線「年度→作品名」に無名の作品が並ぶ経路を塞ぐ。DB 制約（CHECK）ではなくアプリ層のバリデーションとする — 公開許可の設定操作自体がアプリ層の処理であり、二重に守る必要がない

### `users`（ユーザー）

対応する語彙：`../glossary.md` §3 ユーザーとロール

| 列名 | 型 | NULL | 既定値 | 制約 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| id | serial | NOT NULL | — | PK | — |
| email | varchar | NOT NULL | — | UNIQUE | 学校 Workspace ドメインのアカウント（`requirements.md` §5） |
| name | varchar | NOT NULL | — | — | 実名表示（2026-07-24。匿名化機能を持たない） |
| role | varchar | NOT NULL | 'student' | CHECK (role IN ('teacher','student')) | **先生／生徒の2値で足りる**（2026-09-05・H-10 先生ホワイトリスト方式）。既定は生徒（誤判定は安全側に倒す） |
| team_id | int | NULL | — | FK → teams.id・UNIQUE(id, team_id) | 生徒は1チームに所属（単純外部キー・2026-09-11 設計判断）。先生は NULL。**`UNIQUE(id, team_id)` は `teams.leader_user_id` からの複合 FK（C-1）を成立させるための制約**であり、それ自体は「1人が複数チームに所属しない」ことの追加保証にはならない |

> **ホワイトリストの実体は `role = 'teacher'` の行そのもの。** 別テーブルは持たない（役割そのものが登録の有無を表すため）。1人目の投入・「自分自身のロールを解除できない」という不変条件の実現方法は `../requirements.md` §3-6・**`design/10-operation.md` 10-2 で確定させる**（H-11 決着分）。

### `event_occasions`（発表会）

対応する語彙：`../glossary.md` §2 発表会

| 列名 | 型 | NULL | 既定値 | 制約 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| id | serial | NOT NULL | — | PK | — |
| fiscal_year_id | int | NOT NULL | — | FK → fiscal_years.id | 年度に4回（2026-07-24） |
| kind | varchar | NOT NULL | — | CHECK（6-4 の4値） | 固定4種・順序つきの列挙（2026-07-24） |
| event_date | date | NULL | — | — | 「日程は個別編集できる」（`requirements.md` §3-1） |
| is_published | boolean | NOT NULL | false | — | 公開は発表会単位の先生の明示操作（2026-07-26） |
| current_presentation_id | int | NULL | — | 複合 FK（後述） | 「いま発表中のチーム」の手動切替（`requirements.md` §3-10）。**H-20（時刻枠未定義）とは別の確定済み機能** |

> **回種別の並び順は列を持たず、コード定義の順序（6-4）から導出する**（6-6）。
> **`current_presentation_id` の複合 FK**：`presentations` に `UNIQUE(id, event_occasion_id)` を張り、`event_occasions(current_presentation_id, id)` → `presentations(id, event_occasion_id)` とする。**「いま発表中」は自分自身の発表会に属する発表しか指せない**（水戸レビュー C-1。単純な単一列 FK では他発表会の発表を指せてしまう）。

### `material_slots`（資料枠）

対応する語彙：`../glossary.md` §2 資料枠

| 列名 | 型 | NULL | 既定値 | 制約 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| id | serial | NOT NULL | — | PK | — |
| event_occasion_id | int | NOT NULL | — | FK → event_occasions.id | 発表会が複数持つ |
| slot_type | varchar | NOT NULL | — | — | 定番構成はコード定義（2026-07-24）。**CHECK 制約は張らない**（水戸レビュー A-3）：6-4 の6値は「初期投入値」であって全集合ではなく、`hearing.md` §7-2 に実在する任意枠「その他補足資料」が6値に含まれていない。CHECK を張ると `requirements.md` §3-1「資料枠は個別に編集できる — 運用データ」と矛盾する |
| deadline | timestamp | NOT NULL | — | — | **ソフトデッドライン**（超過しても提出可・2026-07-26） |
| is_required | boolean | NOT NULL | — | — | 必須／任意の2値（2026-08-18）。**H-14（試作品一式）は2値のまま先行** |
| template_url | text | NULL | — | — | テンプレート参照（任意・2026-07-24） |

> **提出方式（フォーム／リンク）を列として持たない**（H-2 決着）。`slot_type = '概要'` の枠だけが `summaries` テーブルに対応し、他は `submissions` テーブルに対応する — この対応はコード側の分岐であり、DB のスキーマレベルでは強制しない（アプリ層の責務）。
> **概要枠の一意性は部分インデックスで保証する**（水戸レビュー N-2）：`CREATE UNIQUE INDEX ON material_slots (event_occasion_id) WHERE slot_type = '概要'`。1周目に指示した `UNIQUE(event_occasion_id, slot_type)`（A-4）は全 `slot_type` に効いてしまい、A-3 で CHECK を外して `slot_type` を自由値にしたことと噛み合わなかった（`requirements.md` §3-1「資料枠は個別に編集できる」＝同一発表会に同じ種類の任意枠を複数置く運用まで禁止してしまう）。部分インデックスなら**概要枠だけ**が一意になり、他の `slot_type` は同一発表会に複数存在できる

### `submissions`（提出・概要枠を除く）

対応する語彙：`../glossary.md` §4 提出

| 列名 | 型 | NULL | 既定値 | 制約 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| id | serial | NOT NULL | — | PK | — |
| team_id | int | NOT NULL | — | FK → teams.id・UNIQUE(team_id, material_slot_id) | 提出の粒度＝チーム×発表会×資料枠 |
| material_slot_id | int | NOT NULL | — | FK → material_slots.id | 同上。発表会への参照は `material_slots.event_occasion_id` 経由で辿る |
| url | text | NOT NULL | — | — | 形式検証のみ実施（2026-07-26）。アクセス可否は検証しない |
| first_submitted_at | timestamp | NOT NULL | — | — | **H-6 の2値方式**（初回提出日時。差し替えでも変わらない） |
| last_submitted_at | timestamp | NOT NULL | — | — | **H-6 の2値方式**（最終更新日時。差し替えのたびに上書き） |

> **状態列を持たない。** 「未提出／提出済み」（2値・`glossary.md` §4）は行の有無で導出する（6-6）。**版履歴は持たない**（2026-07-24）— 上書きは `url`・`last_submitted_at` の UPDATE で表現し、別テーブルへの追記はしない。
> **年度アーカイブ後は編集不可**（2026-07-26）だが、アプリ層の制御であり列は追加しない（`fiscal_years.is_archived` を経由して判定）。
> **`event_occasion_id` の非正規化は撤回した**（水戸レビュー B-2）。①遅延判定（6-6）が `material_slots.deadline` との結合を既に要求しており、非正規化で削減できる結合が無い ②年間の行数は概算1,000行未満（`hearing.md` §7-1）で、索引付き結合が p95≦1秒の予算に影響しない ③本 PR の他の判断（いいねの多態却下・中間テーブル却下・状態列却下）と同じ「正典に無い要件を先取りしない」原則（禁則1）に反していた。

### `summaries`（概要）

対応する語彙：`../glossary.md` §5 概要

| 列名 | 型 | NULL | 既定値 | 制約 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| id | serial | NOT NULL | — | PK | — |
| team_id | int | NOT NULL | — | FK → teams.id・UNIQUE(team_id, event_occasion_id) | 1チーム×1発表会（年4件・A-3 決着） |
| event_occasion_id | int | NOT NULL | — | FK → event_occasions.id | 同上 |
| tech_stack | text | NULL | — | — | **使用技術欄**。アーカイブ検索の対象（2026-07-26）。**自由記述かどうかは T-3 未決 — 暫定で自由記述（text）とする** |
| first_submitted_at | timestamp | NOT NULL | — | — | H-6 の2値方式を提出と同じ形で適用。**`submissions` と NULL 可否を揃えた**（水戸レビュー A-2）：行の存在＝提出済みという 6-6 の導出規則を保つため、行は初回提出時にしか作らない |
| last_submitted_at | timestamp | NOT NULL | — | — | 同上 |

> **入力欄の具体（背景・動機／起・結／1ページ集約に対応する列）はここに含めない。** 現行テンプレの現物が未入手のため（`../open-questions.md` §6 保留）。決着まではアプリ層で構造化データを持たせる場合も本ファイルへの列追加はせず、決着後にまとめて反映する。
> **「概要」は資料枠（`material_slots.slot_type = '概要'`）の締切・必須／任意を参照する。** ただし `summaries` は `material_slot_id` を持たない — 概要枠は全発表会に1件ずつ存在する定番枠のため、`event_occasion_id` から一意に引ける（`material_slots` の部分インデックス `WHERE slot_type = '概要'`（N-2）で整合性を保証する）。

### `presentations`（発表）

対応する語彙：`../glossary.md` §4 発表／発表順

| 列名 | 型 | NULL | 既定値 | 制約 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| id | serial | NOT NULL | — | PK・UNIQUE(id, event_occasion_id) | — |
| team_id | int | NOT NULL | — | FK → teams.id・UNIQUE(team_id, event_occasion_id) | 発表の粒度＝チーム×発表会 |
| event_occasion_id | int | NOT NULL | — | FK → event_occasions.id | 同上。`UNIQUE(id, event_occasion_id)` は `event_occasions.current_presentation_id` の複合 FK（6-3 `event_occasions`・C-1）を成立させるための制約 |
| display_order | int | NULL | — | UNIQUE(event_occasion_id, display_order) DEFERRABLE INITIALLY DEFERRED | 発表エンティティの整数属性（H-5 決着）。**開始時刻・所要・休憩の列は追加しない（H-20・新規未決）**。**列名は `order` から改名**（水戸レビュー C-4）：`ORDER` は PostgreSQL の予約語で、生 SQL・ビュー・手動マイグレーションで引用符が必要になり事故りやすい |

> **コメント・いいねのアンカーはこのテーブル**（2026-07-24）。差し替え・リンク変更で対象がずれない安定エンティティ。
> **一意制約は `DEFERRABLE INITIALLY DEFERRED`**（水戸レビュー C-2）：発表順の並び替えは「ほぼ毎回」起きる主要操作（`hearing.md` §7-1）で、2チームの順番を1トランザクション内で入れ替える際に一時的な重複が生じうる。トランザクション終了時まで制約チェックを遅延させることで、一括更新を1本のUPDATEで書ける。**`display_order` が NULL の行**（発表順がまだ決まっていない）は、タイムテーブル・概要集の並びでは最後尾に置く
> **行の生成タイミング**：**年度セットアップとチーム登録のどちらが先でも成立する形**で生成する（水戸レビュー N-1）。
> - チーム作成時：そのチームの年度に、既に存在する `event_occasions` があれば、その分だけ `presentations` 行を生成する（`display_order` は NULL）
> - 年度セットアップ実行時（4発表会を生成する操作）：その年度に既に存在するチームがあれば、新しく生成した各 `event_occasion` に対して不足している `(team, event_occasion)` の `presentations` 行を補って生成する
> - **`年度セットアップとチーム登録は独立した操作で順序を強制しない`（H-9 決着）ため、どちらの操作にも「不足分を補う」ロジックを持たせる必要がある**。チーム 0 件・発表会 0 件のどちらの順で始まっても、両方が揃った時点で全 `(team, event_occasion)` の組が漏れなく存在する
> - コメント・いいねのアンカーとして発表会当日より前から存在している必要があるため（水戸レビュー C-3。生成タイミングの誤りはこの前提を壊すため N-1 として指摘された）

### `comments`（コメント）

対応する語彙：`../glossary.md` §4 発表（コメントのアンカー）／`requirements.md` §3-9

| 列名 | 型 | NULL | 既定値 | 制約 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| id | serial | NOT NULL | — | PK | — |
| presentation_id | int | NOT NULL | — | FK → presentations.id | アンカーは発表単位（2026-07-24） |
| user_id | int | NOT NULL | — | FK → users.id | 実名表示（`requirements.md` §3-9） |
| parent_comment_id | int | NULL | — | FK → comments.id | 発表チームの返信をスレッドとして辿る（§3-9） |
| label | varchar | NULL | — | CHECK（6-4 の3値） | 感想／批評／その他。絞り込みに使う |
| body | text | NOT NULL | — | — | — |
| created_at | timestamp | NOT NULL | now() | — | 新着反映はリアルタイム不要（再取得でよい・§3-9） |

> **編集・削除列は持たない。** 投稿者自身の編集・削除、先生によるモデレーションの要否は **T-2 未決**。決着まで「投稿は消えない」前提で組む。

### `presentation_likes`（発表へのいいね）／`comment_likes`（コメントへのいいね）

対応する語彙：`../glossary.md` §4／`requirements.md` §3-9

| 列名 | 型 | NULL | 既定値 | 制約 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| id | serial | NOT NULL | — | PK | — |
| presentation_id / comment_id | int | NOT NULL | — | FK・UNIQUE(対象, user_id) | 1人1回のいいね |
| user_id | int | NOT NULL | — | FK → users.id | — |

> **対象ごとに2テーブルへ分離し、汎用の `likeable_type` は持たない**（2026-09-11 設計判断）。対象の種類が増える見込みは正典に無い（禁則1）。

---

## 6-4. コード定義

| 区分 | 値（この順序が意味を持つ） | 出典 |
| --- | --- | --- |
| **クラス**（`classes.name` の現行値。DB上は文字列で CHECK は張らない — 学科構成は変わりうる） | AI21 / BD21 / GS21 / IG21 / IG22 | `glossary.md` §3（2026-08-19 分析） |
| **回種別**（`event_occasions.kind`） | 企画 → 設計 → 試作 → 最終（この順序で並び順・概要集・アーカイブの文脈表示に使う） | `glossary.md` §2（2026-07-24） |
| **資料枠種類**（`material_slots.slot_type`） | 概要／プレゼン資料／概要設計書／詳細設計書／試作品一式／完成作品一式（概要は全4発表会に1件） | `requirements.md` §3-1（2026-08-18 ヒヤリング回答）。各発表会への割り当ての逐語は `hearing.md` §7-2 |
| **ロール**（`users.role`） | 先生 ／ 生徒 | `glossary.md` §3（2026-09-05・H-10） |
| **コメントラベル**（`comments.label`） | 感想 ／ 批評 ／ その他 | `requirements.md` §3-9（企画書 §5-2 継承） |

> **クラス・資料枠種類は CHECK 制約で固定しない。** 年度セットアップが生成する運用データであり（`decisions.md` 2026-09-04）、学校側の事情（学科新設・組数変更）で来年度以降に値が増減しうるため、コードの列挙は「初期投入値」であって「取りうる値の全集合を保証する制約」ではない。**回種別・ロール・コメントラベルは仕様上閉じた集合**なので CHECK 制約を張る。

---

## 6-5. インデックス方針

**当日進行系（§3-2 提出状況一覧・§3-10 タイムテーブル）は p95 ≦ 1 秒**（`requirements.md` §4）が最優先の制約。

| クエリ | インデックス | 根拠 |
| --- | --- | --- |
| 発表会ごとの提出状況一覧（チーム×資料枠のマトリクス） | `material_slots(event_occasion_id)` に**明示的に**通常インデックスを張り、これを起点に `submissions(material_slot_id)`・`submissions(team_id)` を結合 | §3-2。**`event_occasion_id` の非正規化は撤回した**（水戸レビュー B-2）。年間 1,000 行未満（`hearing.md` §7-1）の規模では索引付き結合が p95≦1秒の予算に測定可能な影響を与えない。**PostgreSQL は外部キー列に自動で索引を作らない**（水戸レビュー N-3）ため、この索引は明示的に `CREATE INDEX` する — 概要枠の部分インデックス（N-2）とは別物 |
| 概要の提出状況（同上のマトリクスに合流） | `summaries(event_occasion_id, team_id)` | 同上（`summaries` は `event_occasion_id` を直接持つため結合不要） |
| タイムテーブル表示（発表順に並べる） | `presentations(event_occasion_id, display_order)` | §3-10・概要集の並び順の源（H-5） |
| 「いま発表中」の参照 | `event_occasions.current_presentation_id` は単一値参照のため追加索引は不要 | §3-10 |
| 発表詳細のコメント一覧（スレッド表示） | `comments(presentation_id, created_at)`・`comments(parent_comment_id)` | §3-5・§3-9 |
| アーカイブ検索（基本メタデータ：年度・チーム名・作品名・資料種別） | `teams(name)`・`works(title)`・`material_slots(slot_type)` への通常インデックス（`works(is_public_approved)` の部分インデックス `WHERE is_public_approved = true` と組み合わせる） | §3-7 受け入れ基準（水戸レビュー D-3）。検索対象は公開許可済みのみ |
| アーカイブ検索（概要の本文・使用技術欄） | `summaries.tech_stack` への全文検索用インデックス（GIN、日本語形態素解析は Ph.2 で検証）。**「概要の本文」は列自体が未定**（現行テンプレ現物未入手・`open-questions.md` §6 保留）のため索引方針も保留 | §3-7。検索対象は公開許可済みのみ |
| ユーザーのロール判定（認可の一次防衛線・H-16） | `users(email)` UNIQUE（既存）で足りる。全読み取りがここを通る（`design/09-nfr.md` 9-4） | §4 セキュリティ |

> **「それ以外」区分（p95 ≦ 3秒）のクエリは、上記に列挙した索引の外部キー列（`submissions.team_id`・`comments.presentation_id` など）に通常インデックスを明示的に張れば足りる。** PostgreSQL は主キー・UNIQUE制約には自動で索引を作るが、**外部キー列には作らない**（水戸レビュー N-3）ため「自動で足りる」という前提を置かない。個別のチューニングは詳細設計の範囲（本章の書かないもの）。

---

## 6-6. 導出値の一覧

**テーブルに持たない値**と、その導出式。「遅延は状態ではなく導出値」（`glossary.md` §4）を列として実装させないための一覧。

| 値 | 導出式 | 根拠 |
| --- | --- | --- |
| 提出状態（未提出／提出済み） | `submissions`（または概要枠なら `summaries`）に該当チーム×資料枠（×発表会）の行が**存在するか** | 2026-07-24（2値）・2026-09-11（行の有無で導出する設計判断） |
| 遅延（提出状況一覧・§3-2） | `submissions.first_submitted_at > material_slots.deadline`（概要枠は `summaries.first_submitted_at` と `slot_type='概要'` の `material_slots.deadline`） | H-6 決着（2026-09-04・先行方針）。**最終更新日時ではなく初回提出日時で判定する**ことで、期限内提出が差し替えで遅延に化ける問題を避ける |
| 回種別の並び順 | `event_occasions.kind` をコード定義（6-4）の列挙順で並べる。DB列は持たない | 2026-07-24 |
| 作品の年度 | `teams.class_id → classes.fiscal_year_id` | `glossary.md` §6（作品はチーム×年度だが、チームは常に1年度のクラスに属するため独立列が不要） |
| 資料枠の未提出集計（進捗の分母） | **必須枠（`is_required = true`）のみを分母とする。** 任意枠は未提出でも警告色を使わない | H-15 先行方針（決着まで全画面この規則で揃える） |
| 発表会単位の提出率 | `Σ(submissions の提出済み必須資料枠数 + summaries の提出済み必須資料枠数) / (必須資料枠数 × チーム数)`。**概要枠は `summaries`、他の必須枠は `submissions` に分かれているため分子は両テーブルの合算**（水戸レビュー D-2） | §3-2・H-15 先行方針の帰結 |
| 「いま発表中」のハイライト | `event_occasions.current_presentation_id` を直接参照（導出ではなく列だが、状態遷移は先生の手動操作のみで自動遷移はしない） | §3-10。設計原則（`requirements.md` §3 冒頭） |
| 当日タイムテーブルの時刻表示 | **現時点では導出できない。** H-20（時刻枠の中身）決着後に定義する | H-20（新規） |

---

## 6-7. Prisma スキーマへの落とし込みについて

**本章はスキーマ駆動実装（Prisma・H-17 決着）の入力**であり、`schema.prisma` は本章の 6-3 テーブル定義から機械的に導出できる状態を保つ。**列の型・制約に変更が生じたら、必ず本章を先に直してから `schema.prisma` を追随させる**（`00-conventions.md` §3-1 の「要件→設計要素」対応の原則を、実装レイヤーまで一貫させる）。マイグレーションファイル自体は本章の対象外（「書かないもの」の物理設計に含む）。

> **唯一の例外：`presentations.display_order` の `DEFERRABLE INITIALLY DEFERRED` 制約**（水戸レビュー N-4）。Prisma のスキーマ言語（`schema.prisma`）は deferrable 制約を宣言する構文を持たない（[prisma/prisma#8806](https://github.com/prisma/prisma/issues/8806)・[discussions#8789](https://github.com/prisma/prisma/discussions/8789)）。実装時は `prisma migrate dev --create-only` で生成した SQL を手で編集して `DEFERRABLE INITIALLY DEFERRED` を追記する必要があり、**この1箇所だけ「6-3 から機械的に導出できる」の対象外**になる。以後 `prisma migrate dev` を再実行するとこの手書き部分が失われる可能性があるため、実装時にマイグレーションファイルへコメントで明記すること。
