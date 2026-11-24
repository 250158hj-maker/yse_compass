import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ExtraSection } from "@/lib/data/summaries";

// 対応: docs/requirements.md §3-3（概要集の生成）・design/05-output.md 5-1（目次とページ番号）・5-2（概要ページの統一レイアウト）・5-4（生成手段：純粋 JS の PDF ライブラリ）。
// 寸法・字体・節の順序は、5-2 の仮置き（決定ではない）のとおり。決着したら変わる箇所は、5-2 の「決着したときに変わる箇所」の表。
// 先行方針で組んでいる（open-questions.md H-69）:
//   ④ 芯の欄（はじめに・作品概要・開発環境・終わりに）が空のときは、節ごと出さない（既定なし。(a) を仮に採った。紙面は詰まる）。
//   ① 発表番号は紙面に出さない（出すかどうかが既定なし）。
//   ⑦⑧ 目次・ページ番号の形は決定（decisions.md 2026-11-24）。字の大きさ・行の間隔は仮置き（決定行が実装の担当に任せた）。
//   画像は、画像の枚数から配置を導く（0 枚は枠を置かない・1 枚は中央・2 枚は横 1 列。H-53 の先行方針）。
// 1 チーム 1 ページに収まることは、ここでは保証しない（5-2-4 の判定は提案で、合意前）。収まらないときは、そのチームが複数ページになる。
// 呼び出し側が、返したページ数と入れたチーム数を見比べられるように、ページ数も返す。ページ数には目次の分が入る。
// 目次の番号は、2 回組んで合わせる（1 回目で各チームの最初のページを数え、2 回目でそれを目次に入れる）。合わなければ、その生成では番号の欄を落とす（decisions.md 2026-11-24 ④）。

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

const NO_LINE_START = /[、。，．・：；？！ー)）」』】〕〉》ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ]/;

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
  // 日本語は文字の間で折り返せる。1 文字ずつの間に空の音節を挟むと、ハイフンを足さずに切れる位置になる（音節どうしの切れ目では textkit が「-」を足す）。
  // 行頭に置けない文字（閉じ括弧・句読点・小書きの仮名など）は、前の文字にくっつける。文字の集合は仮のもの（5-2-1 の範囲は未決）。開き括弧が行末に来るのは防がない。
  Font.registerHyphenationCallback((word) => {
    const units: string[] = [];
    for (const ch of Array.from(word)) {
      if (units.length > 0 && NO_LINE_START.test(ch)) units[units.length - 1] += ch;
      else units.push(ch);
    }
    return units.flatMap((u) => [u, ""]);
  });
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
  // ページ番号は下の余白（paddingBottom 48pt）の中に絶対位置で置く。本文の高さは変えない（decisions.md 2026-11-24 ①）。
  pageNumber: { position: "absolute", bottom: 22, left: 0, right: 0, textAlign: "center", fontSize: 9 },
  // チームの最初のページを数える印。絶対位置で、本文の流れに入れない。
  marker: { position: "absolute", fontSize: 1 },
  tocTitle: { fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 14 },
  tocRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#bbbbbb", paddingVertical: 4, fontSize: 10 },
  tocTeam: { width: "35%", paddingRight: 8 },
  tocWork: { flex: 1, paddingRight: 8 },
  tocPage: { width: 30, textAlign: "right" },
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

function PageNumber() {
  return <Text fixed style={styles.pageNumber} render={({ pageNumber }) => String(pageNumber)} />;
}

// 作品名が未設定のチームは、チーム名で埋めず空ける（目次にはチーム名の欄が別にある：decisions.md 2026-11-24 ②）。
// 番号の欄は、tocStartPages が null のときだけ出さない（番号が合わなかった生成）。
function TocPage({ teams, tocStartPages }: { teams: BookletTeam[]; tocStartPages: number[] | null }) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.tocTitle}>目次</Text>
      {teams.map((team, i) => (
        <View key={i} style={styles.tocRow} wrap={false}>
          <Text style={styles.tocTeam}>{team.teamName}</Text>
          <Text style={styles.tocWork}>{team.workTitle ?? ""}</Text>
          {tocStartPages && <Text style={styles.tocPage}>{tocStartPages[i]}</Text>}
        </View>
      ))}
      <PageNumber />
    </Page>
  );
}

function TeamPage({ team, onFirstPage }: { team: BookletTeam; onFirstPage: (pageNumber: number) => void }) {
  // 空の芯の欄は節ごと出さない。自由な欄は、保存の時点で見出しが空でないので、本文が空でも見出しは出す。
  const shown = (s: Section) => s.body !== "";
  const before = sectionsBeforeImages(team).filter(shown);
  const after = sectionsAfterImages(team).filter((s, i) => i < team.extraSections.length || shown(s));
  return (
    <Page size="A4" style={styles.page}>
      <Text
        style={styles.marker}
        render={({ pageNumber }) => {
          onFirstPage(pageNumber);
          return "";
        }}
      />
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
            // Buffer をそのまま渡す。{ data, format } の形で渡すと、@react-pdf/layout 5.2.0 の fetchImage が data.toString() を画像のキーにし、
            // @react-pdf/render 4.7.0 の drawImage が 1 回の描画の中で同じキーの画像を使い回すため、末尾近くの 1 バイトだけが違う画像が 1 枚にまとまる（再現はテストにある）。
            // 縮めた JPEG だけを保存している（summary-image.ts）。代替テキストは置かない（5-2-7：属性が正典に無い）。react-pdf の Image は HTML の img ではなく、PDF に alt は載らない。
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image key={i} style={styles.image} src={Buffer.from(data)} />
          ))}
        </View>
      )}
      {after.map((s, i) => (
        <SectionView key={`${i}-${s.heading}`} section={s} />
      ))}
      <PageNumber />
    </Page>
  );
}

// 1 回組む。starts[i] は、i 番目のチームの最初のページの番号（目次を含む通しの番号）。
// 組んだあとに event loop を 1 回譲る。譲らないと、画像の Buffer の回収が次の 1 周まで遅れ、1 回組むごとに約 10MB（20 チーム・画像 2 枚）増える
// （開発 PC で測定：譲れば増えない。PR #348 の review thread。サーバーでの測定は H-53 ⑦）。
async function renderPass(teams: BookletTeam[], tocStartPages: number[] | null): Promise<{ pdf: Buffer; starts: number[] }> {
  const starts = teams.map(() => 0);
  const pdf = await renderToBuffer(
    <Document title="概要集" language="ja">
      <TocPage teams={teams} tocStartPages={tocStartPages} />
      {teams.map((team, i) => (
        <TeamPage
          key={i}
          team={team}
          onFirstPage={(pageNumber) => {
            starts[i] = pageNumber;
          }}
        />
      ))}
    </Document>,
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
  return { pdf, starts };
}

export type BookletPass = (tocStartPages: number[] | null) => Promise<{ pdf: Buffer; starts: number[] }>;

export type RenderedBooklet = {
  pdf: Buffer;
  // 目次を含む。
  pageCount: number;
  // 各チームの最初のページの番号（入れたチームの順）。
  teamStartPages: number[];
  // 目次の番号と実際の最初のページが合わず、番号の欄を落として組んだとき true。
  tocNumbersDropped: boolean;
};

// 目次の番号の合わせ方（decisions.md 2026-11-24 ③④）。pass は、テストで「合わない」場合を作るために引数にしている。
export async function composeBooklet(pass: BookletPass, teamCount: number): Promise<RenderedBooklet> {
  const counted = await pass(Array.from({ length: teamCount }, () => 0));
  const withNumbers = await pass(counted.starts);
  const matched = counted.starts.every((n, i) => n === withNumbers.starts[i]);
  const final = matched ? withNumbers : await pass(null);
  return { pdf: final.pdf, pageCount: countPages(final.pdf), teamStartPages: final.starts, tocNumbersDropped: !matched };
}

export async function renderSummaryBooklet(teams: BookletTeam[]): Promise<RenderedBooklet> {
  registerFont();
  return composeBooklet((tocStartPages) => renderPass(teams, tocStartPages), teams.length);
}

// ページの辞書（/Type /Page）を数える。ページの木（/Type /Pages）は数えない。
function countPages(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}
