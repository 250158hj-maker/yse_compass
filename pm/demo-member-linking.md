# デモ環境で、サインインした生徒をメンバー行に結ぶ手順

> **位置づけ**：12/18 の試作版発表会のデモ環境で、サインイン済みの生徒をメンバー行（`team_members`）に結ぶ作業を、いつ・誰が・どの順で行うかと、その SQL に答える
> **確度**：暫定（レビュー未了・鵜呑みにしない）
> **正典**：このファイル
> **更新のしかた**：上書き
> **主担当**：蒲山
> **最終更新**：2026-11-10（蒲山）

---

## 1. 位置づけと範囲

- **何を、どの形で結ぶかは、`../docs/decisions.md` 2026-11-09 の行が決めている。** 本書はその行の②③のとおりに行う手順で、決定を書き写さない（結び方・照合・実行者・範囲は、その行を読む）。
- **まとめて 1 回の SQL で結ぶ形は、同行の②（手段は SQL）の範囲内で、【変更】は付けない。** 事前確認（A）で結べない行を洗い出してから、結べる行だけを結ぶ（B）。
- **本書が決めないもの**：サインインの依頼を誰がいつ出すか、受付の案内の中身（`../docs/open-questions.md` P-6 ⑤）。**本書は、サインインの依頼が済んだあとを前提にする。**
- **判定の分岐と、開発用の DB で確かめた結果は、本書に書き写さない。** `../docs/findings.md` F-18 の追記（2026-11-10）にある。
- **この手順は、12/18 のデモ環境に限る。本番の DB には持ち込まない**（決定行の④）。通し（遅くとも 2026-12-04：`../docs/decisions.md` 2026-11-06 の成功の定義の行）で、結びつけの前後を見るので、それまでに使える状態にしておく。

**書かないもの：メールアドレス・実名・チーム名・ID の実値。** 公開のリポジトリなので、値は `:変数` や `<…>` で書く。**打つときは、`:変数` や `<…>` を、本物の値（`<` `>` ごと）に書き直す。** `psql` は、`:変数` を置き換えない。

## 2. 前提

1. **結ぶ人が、先に一度サインインしている**（初回のサインインで `users` の行ができる）。
2. **対応表を作る**：メンバー行の `id` と、その人のアドレス（依頼のときに集めたもの）の組。対応表の実物は、手元にだけ置き、リポジトリに入れない。
3. **メンバー行の `id` は、チームの `id` から調べる**（チーム名だけで絞らない。別の年度・クラスの同名のチームが混ざるため）。

## 3. DB に入る

```bash
# [Ubuntu] リポジトリのディレクトリ（~/workspace/yse_compass）で。ユーザー名・DB 名は、コンテナの環境変数から読む（値を打たない・出さない）
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

- DB の認証情報は、`demo-server.md` のステップ 4-2 のとおり、既定から変えてある。**値を打たずに入る**この形にする。

## 4. メンバー行の `id` を調べる

```sql
-- チームの一覧（年度・クラス付き）
SELECT t.id, t.name, c.name AS class, f.year
FROM teams t JOIN classes c ON c.id = t.class_id JOIN fiscal_years f ON f.id = c.fiscal_year_id
ORDER BY f.year DESC, t.id;

-- あるチームのメンバー行（user_id が空の行が、結べる行）。1 を、本物のチームの id に書き直す
SELECT m.id, m.name, m.user_id, (m.id = t.leader_member_id) AS leader
FROM team_members m JOIN teams t ON t.id = m.team_id
WHERE m.team_id = 1 ORDER BY m.id;
```

## 5. A. 事前確認（読み取りだけ・何も変えない）

```sql
-- 対応表を、この接続の間だけ残る一時テーブルに入れる。(メンバー行の id, アドレス) を人数分
CREATE TEMP TABLE link_plan (mid int PRIMARY KEY, email text NOT NULL);
INSERT INTO link_plan VALUES
  (101, 'aaa@example.test'),
  (102, 'bbb@example.test');   -- 本物の値に書き直す。最後の行だけ , を付けない

-- 1 行ごとに、結べるかを見る
SELECT p.mid, tm.team_id, t.name AS team, tm.name AS member,
  (tm.id = t.leader_member_id) AS leader,
  CASE
    WHEN tm.id IS NULL THEN 'NG: メンバー行が無い'
    WHEN (SELECT count(*) FROM link_plan q WHERE q.email = p.email) > 1 THEN 'NG: 対応表で同じアドレスが 2 回出ている'
    WHEN u.id IS NULL AND hint.id IS NOT NULL THEN 'NG: 表記違い（大文字小文字だけ違う users の行がある）'
    WHEN u.id IS NULL THEN 'NG: サインインがまだ'
    WHEN tm.user_id = u.id THEN '済: すでに同じ人が結ばれている'
    WHEN tm.user_id IS NOT NULL THEN 'NG: 別の人がすでに結ばれている'
    WHEN other.id IS NOT NULL THEN 'NG: この人は別のメンバー行に結ばれている（行 id=' || other.id || '）'
    ELSE 'OK: 結べる'
  END AS status
FROM link_plan p
LEFT JOIN team_members tm ON tm.id = p.mid
LEFT JOIN teams t ON t.id = tm.team_id
LEFT JOIN users u ON u.email = p.email
LEFT JOIN users hint ON hint.email <> p.email AND lower(hint.email) = lower(p.email)
LEFT JOIN team_members other ON other.user_id = u.id AND other.id <> p.mid
ORDER BY tm.team_id, p.mid;
```

**見方**

- `OK: 結べる` の行数を、メモする（B で使う）。
- `NG` の行は、B では結ばれない。直し方：
  - **メンバー行が無い**：メンバー行の `id` が違う。4 で調べ直す。
  - **同じアドレスが 2 回**：対応表の書き間違い。
  - **表記違い**：対応表を、`users` の側の表記に合わせる（`users` は直さない）。
  - **サインインがまだ**：その人に、先にサインインしてもらう。
  - **別の人がすでに結ばれている**／**別のメンバー行に結ばれている**：誤って結んだか、前の年度の結びつけが残っている可能性がある。**自動では解かない。** 人に確かめてから、D で解く。
- リーダーの列が `t` の行は、`NG` のままにしない（リーダーの扱いは決定行のとおり）。

## 6. B. 結ぶ（OK の行だけ）

```sql
BEGIN;
UPDATE team_members tm SET user_id = u.id
FROM link_plan p JOIN users u ON u.email = p.email
WHERE tm.id = p.mid AND tm.user_id IS NULL
RETURNING tm.id, tm.name, tm.user_id;
-- 返ってきた行数が、A でメモした「OK: 結べる」の行数と同じかを見る
```

- **同じなら** `COMMIT;`。**違えば** `ROLLBACK;` して、A に戻る。
- 一意制約（`team_members.user_id`）の違反で止まったら、文全体が取り消される。`ROLLBACK;` して、A の `NG` を見直す。
- 結んだ行が 0 件のとき（`UPDATE 0`）は、結ばれていない扱い（決定行の②）。A の表示で、原因を区別できる。

## 7. C. 確認（結んだあと）

```sql
-- チームごとの結びつき。11, 12, 13 を、結んだチームの id に書き直す
SELECT t.id AS team_id, t.name AS team, tm.id AS mid, tm.name AS member,
  (tm.id = t.leader_member_id) AS leader, (tm.user_id IS NOT NULL) AS linked
FROM teams t JOIN team_members tm ON tm.team_id = t.id
WHERE t.id IN (11, 12, 13) ORDER BY t.id, tm.id;

-- リーダーが結ばれていないチーム（0 行が合格）
SELECT t.id, t.name
FROM teams t LEFT JOIN team_members l ON l.id = t.leader_member_id
WHERE t.id IN (11, 12, 13) AND l.user_id IS NULL;
```

- 画面（SC-09）から提出できるかの確認は、別に行う（`../docs/findings.md` F-18 の「確かめていないもの」）。

## 8. D. 解く（間違えて結んだとき）

```sql
UPDATE team_members SET user_id = NULL WHERE id = 101 RETURNING id, user_id;   -- 101 を、本物のメンバー行の id に書き直す
```

## 関連

- 決定：`../docs/decisions.md` 2026-11-09 の行（P-5 の決着）
- 判定の分岐と、開発用の DB での確認の結果：`../docs/findings.md` F-18
- サインインの依頼・受付の案内（未決）：`../docs/open-questions.md` P-6 ⑤
- サーバーの立ち上げと、DB の認証情報：`demo-server.md`
