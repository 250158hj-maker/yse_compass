import type { Team } from "@/lib/types";

// SC-13 のチーム作成(先生)。入力は正典にある属性だけ:
// - チーム名(クラス内で一意。design/06-data.md `teams` の UNIQUE(class_id, name))
// - クラス(チームはクラスに属する。年度はクラスから導く — glossary.md §3 チーム)
// - メンバーの氏名(先生が入力・1 人以上。メールアドレスの欄は持たない — H-29 決着)
// - リーダー(メンバーから 1 名。チーム作成時に先生が指定する — glossary.md §3 リーダー)
// - 作品名(任意。空でも作れる — decisions.md 2026-09-21 `works.title` は NULL 可)
// 置かないもの: 発表番号(H-21 で実在しないと決着)・作品の説明(Team.summary はモックが補った属性で、正典に無い)。

export type NewTeamInput = {
  yearId: string;
  name: string;
  className: string;
  members: string[];
  leaderName: string;
  projectTitle: string;
};

export type CreatedTeam = NewTeamInput & { id: string };

export type NewTeamDraft = {
  name: string;
  className: string;
  // 入力欄の並びのまま(空欄を含む)。
  members: string[];
  leaderName: string;
  projectTitle: string;
};

export type NewTeamErrors = Partial<Record<"name" | "className" | "members" | "leaderName", string>>;

// 入力欄の値から、空欄を除いて前後の空白を落としたメンバーの氏名。
export function normalizeMembers(members: string[]): string[] {
  return members.map((m) => m.trim()).filter((m) => m !== "");
}

// 入力を検査する。existing は同じ年度のチーム(モックのチーム＋このデモで作ったチーム)。
export function validateNewTeam(draft: NewTeamDraft, existing: Pick<Team, "name" | "className">[]): NewTeamErrors {
  const errors: NewTeamErrors = {};
  const name = draft.name.trim();
  const members = normalizeMembers(draft.members);

  if (name === "") {
    errors.name = "チーム名を入力してください。";
  } else if (draft.className && existing.some((t) => t.className === draft.className && t.name === name)) {
    errors.name = `${draft.className} には「${name}」というチームがすでにあります。別の名前にしてください。`;
  }

  if (!draft.className) errors.className = "クラスを選んでください。";

  if (members.length === 0) {
    errors.members = "メンバーを 1 人以上入力してください。";
  } else if (new Set(members).size !== members.length) {
    // 正典の制約ではない。モックはメンバーを氏名の文字列で持ち、リーダーも氏名で指すため、同名を区別できない。
    errors.members = "同じ氏名が 2 回入力されています。";
  }

  if (!draft.leaderName || !members.includes(draft.leaderName)) {
    errors.leaderName = "リーダーをメンバーから 1 名選んでください。";
  }

  return errors;
}

export function createdTeamToTeam(team: CreatedTeam): Team {
  return { ...team, summary: "", publishPermission: "未設定" };
}
