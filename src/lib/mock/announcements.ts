import type { Announcement, Template, Timetable } from "@/lib/types";

export const templates: Template[] = [
  {
    id: "template-kikaku-slide",
    name: "企画書テンプレート",
    relatedPhase: "企画",
    format: "Google スライド",
    url: "https://docs.google.com/presentation/d/template-kikaku/edit",
  },
  {
    id: "template-sekkei-doc",
    name: "設計書テンプレート",
    relatedPhase: "設計",
    format: "Google ドキュメント",
    url: "https://docs.google.com/document/d/template-sekkei/edit",
  },
  {
    id: "template-shisaku-slide",
    name: "試作品発表スライドテンプレート",
    relatedPhase: "試作",
    format: "Google スライド",
    url: "https://docs.google.com/presentation/d/template-shisaku/edit",
  },
  {
    id: "template-saishu-slide",
    name: "最終発表スライドテンプレート",
    relatedPhase: "最終",
    format: "Google スライド",
    url: "https://docs.google.com/presentation/d/template-saishu/edit",
  },
];

export const announcements: Announcement[] = [
  {
    id: "ann-2026-kikaku",
    yearId: "year-2026",
    phase: "企画",
    title: "企画書発表会",
    period: "2026-07-17",
    submissionDeadline: "2026-07-16T23:59:00+09:00",
    status: "終了",
    isPublished: true,
    materialSlots: [
      { id: "slot-kikaku-slide", name: "企画書", required: true, templateId: "template-kikaku-slide" },
      { id: "slot-kikaku-sub", name: "補足資料", required: false, templateId: null },
    ],
  },
  {
    id: "ann-2026-sekkei",
    yearId: "year-2026",
    phase: "設計",
    title: "設計書発表会",
    period: "2026-10-15",
    submissionDeadline: "2026-10-14T23:59:00+09:00",
    status: "受付中",
    isPublished: false,
    materialSlots: [
      { id: "slot-sekkei-doc", name: "設計書", required: true, templateId: "template-sekkei-doc" },
      { id: "slot-sekkei-er", name: "ER図", required: true, templateId: null },
    ],
  },
  {
    id: "ann-2026-shisaku",
    yearId: "year-2026",
    phase: "試作",
    title: "試作品版発表会",
    period: "2026-12-17",
    submissionDeadline: "2026-12-16T23:59:00+09:00",
    status: "開催予定",
    isPublished: false,
    materialSlots: [
      { id: "slot-shisaku-slide", name: "発表スライド", required: true, templateId: "template-shisaku-slide" },
      { id: "slot-shisaku-demo", name: "デモ動画", required: false, templateId: null },
    ],
  },
  {
    id: "ann-2026-saishu",
    yearId: "year-2026",
    phase: "最終",
    title: "最終発表会",
    period: "2027-02-09",
    submissionDeadline: "2027-02-08T23:59:00+09:00",
    status: "開催予定",
    isPublished: false,
    materialSlots: [
      { id: "slot-saishu-slide", name: "発表スライド", required: true, templateId: "template-saishu-slide" },
      { id: "slot-saishu-report", name: "成果報告書", required: true, templateId: null },
    ],
  },

  // 2025年度(アーカイブ済み) — Aurora の作品詳細(SC-17)を成立させるための4回分
  {
    id: "ann-2025-kikaku",
    yearId: "year-2025",
    phase: "企画",
    title: "企画書発表会",
    period: "2025-07-18",
    submissionDeadline: "2025-07-17T23:59:00+09:00",
    status: "終了",
    isPublished: true,
    materialSlots: [{ id: "slot-2025-kikaku", name: "企画書", required: true, templateId: null }],
  },
  {
    id: "ann-2025-sekkei",
    yearId: "year-2025",
    phase: "設計",
    title: "設計書発表会",
    period: "2025-10-16",
    submissionDeadline: "2025-10-15T23:59:00+09:00",
    status: "終了",
    isPublished: true,
    materialSlots: [{ id: "slot-2025-sekkei", name: "設計書", required: true, templateId: null }],
  },
  {
    id: "ann-2025-shisaku",
    yearId: "year-2025",
    phase: "試作",
    title: "試作品版発表会",
    period: "2025-12-18",
    submissionDeadline: "2025-12-17T23:59:00+09:00",
    status: "終了",
    isPublished: true,
    materialSlots: [{ id: "slot-2025-shisaku", name: "発表スライド", required: true, templateId: null }],
  },
  {
    id: "ann-2025-saishu",
    yearId: "year-2025",
    phase: "最終",
    title: "最終発表会",
    period: "2026-02-10",
    submissionDeadline: "2026-02-09T23:59:00+09:00",
    status: "終了",
    isPublished: true,
    materialSlots: [{ id: "slot-2025-saishu", name: "発表スライド", required: true, templateId: null }],
  },
];

export const timetables: Timetable[] = [
  {
    announcementId: "ann-2026-kikaku",
    slots: [
      { id: "tt-k-1", teamId: "team-nova", order: 1, startTime: "09:00", durationMin: 10, isBreak: false },
      { id: "tt-k-2", teamId: "team-cheers", order: 2, startTime: "09:10", durationMin: 10, isBreak: false },
      { id: "tt-k-break", order: 3, startTime: "09:20", durationMin: 10, isBreak: true, breakLabel: "休憩" },
      { id: "tt-k-3", teamId: "team-lumen", order: 4, startTime: "09:30", durationMin: 10, isBreak: false },
    ],
    currentPresentingTeamId: null,
  },
  {
    announcementId: "ann-2026-sekkei",
    slots: [
      { id: "tt-s-1", teamId: "team-nova", order: 1, startTime: "13:00", durationMin: 12, isBreak: false },
      { id: "tt-s-2", teamId: "team-cheers", order: 2, startTime: "13:12", durationMin: 12, isBreak: false },
      { id: "tt-s-break", order: 3, startTime: "13:24", durationMin: 10, isBreak: true, breakLabel: "休憩" },
      { id: "tt-s-3", teamId: "team-lumen", order: 4, startTime: "13:34", durationMin: 12, isBreak: false },
    ],
    // モック上のデモ用に「発表中」表示を確認できるよう、あえて進行中の状態を持たせている。
    currentPresentingTeamId: "team-cheers",
  },
];
