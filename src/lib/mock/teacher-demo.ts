import type { Material, SummaryEntry } from "@/lib/types";

// 先生の筋(デモ動画の区間 A)だけが読む、提出の「時刻つきの補い」。
//
// なぜ submissions.ts を直さずに別ファイルに持つか:
// submissions.ts の値は生徒の画面(区間 B・C)にそのまま出ている。たとえば
//   - Cheers の設計書発表会の summary を埋めると、水戸の概要入力フォーム(SC-10)の初期値と「提出済み」バッジに出る
//     (SummaryFormClient.tsx の useState(submission?.summary))
//   - どのチームの summary でも、使用技術を足すと SC-10 の候補タグの並びが変わる
//     (SummaryFormClient.tsx は submissions 全件の techUsed を数えている)
//   - 概要・プレゼン資料の status を「提出済み」にすると、水戸のホームの必須枠の未提出件数・リング、
//     発表会一覧の「提出完了 n/3 チーム」が変わる(app/page.tsx・announcements/page.tsx は status を直に読む)
// ので、既存のレコードには触らず、先生用の導出(lib/demo/teacher-derived.ts)だけがここを読む。
// ここに無い発表会・チーム・資料は、submissions.ts の値(firstSubmittedAt・summary)をそのまま使う。

export type TeacherDemoMaterialPatch = Pick<Material, "firstSubmittedAt" | "updatedAt" | "driveUrl">;

export type TeacherDemoSubmissionPatch = {
  announcementId: string;
  teamId: string;
  // 資料名(= 資料枠名)ごとの補い。
  materials?: Record<string, TeacherDemoMaterialPatch>;
  summary?: SummaryEntry;
};

export const teacherDemoSubmissionPatches: TeacherDemoSubmissionPatch[] = [
  // --- 2026年度 設計書発表会(締切 2026-10-14 23:59) ---
  // Cheers のプレゼン資料は submissions.ts の 8/18 提出のまま。概要は場面 1(10/12)の後・締切前の 10/13 に出す
  // (区間 B の生徒の画面では Cheers の概要がまだ未提出なので、区間 A の場面 1 でも未提出にそろえる)。
  {
    announcementId: "ann-2026-sekkei",
    teamId: "team-cheers",
    materials: {
      概要: {
        firstSubmittedAt: "2026-10-13T21:40:00+09:00",
        updatedAt: "2026-10-13T21:40:00+09:00",
        driveUrl: null,
      },
    },
    summary: {
      background:
        "発表会の運営は、提出の確認・発表順の整理・概要集づくりを先生が手作業でこなしており、回を重ねても同じ手間がかかり続けている。",
      techUsed: ["Next.js", "TypeScript", "Prisma", "PostgreSQL", "Auth.js"],
      opening: "資料を出すだけで、提出の確認も発表順も概要集もそろうとしたら?",
      closing: "提出という 1 つの行為から運営の仕事が導かれる設計を固め、試作へ進む。",
      onePageBody:
        "YSE Compass は卒業制作発表会の運営プラットフォームです。設計では、生徒の提出(資料のリンク登録・概要のフォーム入力)を起点に、先生の提出状況の確認・発表順の決定・概要集の生成・資料の公開が副産物として成り立つよう、画面とデータの構造を決めました。資料の実体は Google ドライブに置いたまま、システムは提出の記録とコメントだけを持ちます。",
      submittedAt: "2026-10-13T21:40:00+09:00",
    },
  },
  // Nova・Lumen は場面 1(10/12)の時点では未提出で、締切までに出す。
  {
    announcementId: "ann-2026-sekkei",
    teamId: "team-nova",
    materials: {
      プレゼン資料: {
        firstSubmittedAt: "2026-10-13T19:20:00+09:00",
        updatedAt: "2026-10-13T19:20:00+09:00",
        driveUrl: "https://docs.google.com/document/d/nova-sekkei/edit",
      },
      概要: {
        firstSubmittedAt: "2026-10-14T21:05:00+09:00",
        updatedAt: "2026-10-14T21:05:00+09:00",
        driveUrl: null,
      },
    },
    summary: {
      background: "企画で示した備品予約を、貸出の重なりが起きない仕組みとして具体化する段階。",
      techUsed: ["React", "Firebase", "TypeScript"],
      opening: "同じボールを 2 つの部が同時に予約したら、どちらが借りられるのか。",
      closing: "予約の確定の規則と在庫のデータ構造を固め、試作で貸出から返却までを動かす。",
      onePageBody:
        "部活動・委員会の備品予約システムの設計です。備品・予約・貸出の 3 つのデータを分け、予約が重なったときは先着で確定する規則にしました。貸出簿の画面と、在庫を一覧で見る画面の流れを設計しました。",
      submittedAt: "2026-10-14T21:05:00+09:00",
    },
  },
  {
    announcementId: "ann-2026-sekkei",
    teamId: "team-lumen",
    materials: {
      プレゼン資料: {
        firstSubmittedAt: "2026-10-14T22:40:00+09:00",
        updatedAt: "2026-10-14T22:40:00+09:00",
        driveUrl: "https://docs.google.com/document/d/lumen-sekkei/edit",
      },
      概要: {
        firstSubmittedAt: "2026-10-14T23:30:00+09:00",
        updatedAt: "2026-10-14T23:30:00+09:00",
        driveUrl: null,
      },
    },
    summary: {
      background: "学習の記録が続かない原因を入力の手間と見て、記録の流れを短くする設計に取り組んだ。",
      techUsed: ["Next.js", "Chart.js", "Supabase"],
      opening: "記録が三日で止まるのは、入力が面倒だからではないか。",
      closing: "1 タップで記録できる流れと、教科の偏りを見せるグラフの仕様を固めた。",
      onePageBody:
        "学習記録トラッカーの設計です。タイマーを止めるだけで記録が残る入力の流れと、週ごとの教科の偏りを見せるグラフの仕様を決めました。記録・教科・目標のデータ構造と、主要な 4 画面の遷移を設計しました。",
      submittedAt: "2026-10-14T23:30:00+09:00",
    },
  },
];

export function getTeacherDemoPatch(announcementId: string, teamId: string): TeacherDemoSubmissionPatch | null {
  return (
    teacherDemoSubmissionPatches.find((p) => p.announcementId === announcementId && p.teamId === teamId) ?? null
  );
}

// SC-11 の［PDF を開く］が開く、モックの概要集 PDF。public/ 配下に置いた固定のファイルで、生成のたびに作り直しはしない。
// 中身は設計書発表会の統一レイアウトを、デモ動画の場面 2 で SC-08 を入れ替えた後の順(Cheers → Nova → Lumen)で書き出したもの。
// SC-08 で別の順にしても、締切前で未提出のチームがスキップされても、中身は変わらない(モックは UI/UX の検証なので、この食い違いは許容)。
// pages はこの PDF のページ数(1 チーム 1 ページ)。PDF を作り直したら合わせる。
export type TeacherDemoBookletPdf = { href: string; pages: number };

const teacherDemoBookletPdfs: Record<string, TeacherDemoBookletPdf> = {
  "ann-2026-sekkei": { href: "/mock/summary-booklet-sekkei.pdf", pages: 3 },
};

export function getTeacherDemoBookletPdf(announcementId: string): TeacherDemoBookletPdf | null {
  return teacherDemoBookletPdfs[announcementId] ?? null;
}
