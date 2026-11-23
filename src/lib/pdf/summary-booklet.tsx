import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ExtraSection } from "@/lib/data/summaries";

// 対応: docs/requirements.md §3-3（概要集の生成）・design/05-output.md 5-2（概要ページの統一レイアウト）・5-4（生成手段：純粋 JS の PDF ライブラリ）。
// 寸法・字体・節の順序は、5-2 の仮置き（決定ではない）のとおり。決着したら変わる箇所は、5-2 の「決着したときに変わる箇所」の表。
// 先行方針で組んでいる（open-questions.md H-69）:
//   ④ 芯の欄（はじめに・作品概要・開発環境・終わりに）が空のときは、節ごと出さない（既定なし。(a) を仮に採った。紙面は詰まる）。
//   ① 発表番号は紙面に出さない（出すかどうかが既定なし）。
//   ⑦⑧ 目次とページ番号は、形が未決（⑧は「SC-11 の着手前に決める」）なので、まだ入れない。decisions.md 2026-11-09 で入れると決めたもの。
//   画像は、画像の枚数から配置を導く（0 枚は枠を置かない・1 枚は中央・2 枚は横 1 列。H-53 の先行方針）。
// 1 チーム 1 ページに収まることは、ここでは保証しない（5-2-4 の判定は提案で、合意前）。収まらないときは、そのチームが複数ページになる。
// 呼び出し側が、返したページ数と入れたチーム数を見比べられるように、ページ数も返す。

export type BookletTeam = {
  className: string;
  teamName: string;
  // 登録の順（team_members.id の順）。H-69 ②(a)。
  memberNames: string[];
  // 作品名が未設定（null）のときは、チーム名を出す（5-2-2）。
  workTitle: string | null;
  introduction: string | null;
  workOverview: string | null;
  techStack: string | null;
  closing: string | null;
  extraSections: ExtraSection[];
  // 並びの順（display_order の昇順）。縮めた JPEG のバイト列。
  images: Uint8Array[];
};

const FONT_FAMILY = "NotoSansJP";
const FONT_DIR = path.join(process.cwd(), "node_modules", "@expo-google-fonts", "noto-sans-jp");

let fontRegistered = false;
function registerFont() {
  if (fontRegistered) return;
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: path.join(FONT_DIR, "400Regular", "NotoSansJP_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "700Bold", "NotoSansJP_700Bold.ttf"), fontWeight: 700 },
    ],
  });
  // 日本語は文字の間で折り返せる。既定の音節分けは、長い英数字の連なりを割らずに枠から溢れさせるので、1 文字ずつ割る。
  Font.registerHyphenationCallback((word) => Array.from(word));
  fontRegistered = true;
}

// 寸法は 5-2-1・5-2-2・5-2-7 の仮置き（pt）。
const IMAGE_WIDTH_PT = 240;
const IMAGE_HEIGHT_PT = 135;

const styles = StyleSheet.create({
  page: { fontFamily: FONT_FAMILY, paddingTop: 40, paddingBottom: 48, paddingHorizontal: 50, color: "#000000" },
  header: { marginBottom: 6 },
  // 作品名の左右に 64pt ずつ空ける（5-2-2。発表番号を出す箱と重ならないため。出さなくても同じ幅にして、改行の位置を変えない）。
  title: { fontSize: 18, fontWeight: 700, textAlign: "center", marginHorizontal: 64 },
  meta: { fontSize: 9, textAlign: "right", marginTop: 4 },
  rule: { borderBottomWidth: 1.5, borderBottomColor: "#000000", marginTop: 6 },
  section: { marginTop: 10 },
  // 節の見出しは 1 行に収め、折り返さない（5-2-3）。
  sectionHeading: { fontSize: 10.5, fontWeight: 700, borderBottomWidth: 0.5, borderBottomColor: "#bbbbbb", paddingBottom: 2, marginBottom: 5, maxLines: 1 },
  body: { fontSize: 9.5, lineHeight: 1.7, textAlign: "justify" },
  imageRow: { marginTop: 10, flexDirection: "row", justifyContent: "center", gap: 10 },
  image: { width: IMAGE_WIDTH_PT, height: IMAGE_HEIGHT_PT, objectFit: "contain" },
});

type Section = { heading: string; body: string };

// 5-2-3 の順：はじめに・作品概要・（画像）・自由な欄・開発環境・終わりに。画像の位置は、作品概要の直後。
function sectionsBeforeImages(team: BookletTeam): Section[] {
  return [
    { heading: "はじめに", body: team.introduction ?? "" },
    { heading: "作品概要", body: team.workOverview ?? "" },
  ];
}

function sectionsAfterImages(team: BookletTeam): Section[] {
  return [
    ...team.extraSections.map((s) => ({ heading: s.heading, body: s.body })),
    { heading: "開発環境", body: team.techStack ?? "" },
    { heading: "終わりに", body: team.closing ?? "" },
  ];
}

function SectionView({ section }: { section: Section }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{section.heading}</Text>
      <Text style={styles.body}>{section.body}</Text>
    </View>
  );
}

function TeamPage({ team }: { team: BookletTeam }) {
  // 空の芯の欄は節ごと出さない。自由な欄は、保存の時点で見出しが空でないので、本文が空でも見出しは出す。
  const shown = (s: Section) => s.body !== "";
  const before = sectionsBeforeImages(team).filter(shown);
  const after = sectionsAfterImages(team).filter((s, i) => i < team.extraSections.length || shown(s));
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{team.workTitle ?? team.teamName}</Text>
        <Text style={styles.meta}>{team.className}</Text>
        <Text style={styles.meta}>{team.teamName}</Text>
        <Text style={styles.meta}>{team.memberNames.join("・")}</Text>
        <View style={styles.rule} />
      </View>
      {before.map((s) => (
        <SectionView key={s.heading} section={s} />
      ))}
      {team.images.length > 0 && (
        <View style={styles.imageRow}>
          {team.images.map((data, i) => (
            // Buffer をそのまま渡す。{ data, format } の形で渡すと、react-pdf 4.9.0 は Buffer.toString() を同じ画像かの判定キーにするため、
            // 末尾近くの 1 バイトだけが違う画像が 1 枚にまとまる（findings.md F-17。再現はテストにある）。
            // 縮めた JPEG だけを保存している（summary-image.ts）。代替テキストは置かない（5-2-7：属性が正典に無い）。react-pdf の Image は HTML の img ではなく、PDF に alt は載らない。
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image key={i} style={styles.image} src={Buffer.from(data)} />
          ))}
        </View>
      )}
      {after.map((s, i) => (
        <SectionView key={`${i}-${s.heading}`} section={s} />
      ))}
    </Page>
  );
}

export async function renderSummaryBooklet(teams: BookletTeam[]): Promise<{ pdf: Buffer; pageCount: number }> {
  registerFont();
  const pdf = await renderToBuffer(
    <Document title="概要集" language="ja">
      {teams.map((team, i) => (
        <TeamPage key={i} team={team} />
      ))}
    </Document>,
  );
  return { pdf, pageCount: countPages(pdf) };
}

// ページの辞書（/Type /Page）を数える。ページの木（/Type /Pages）は数えない。
function countPages(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}
