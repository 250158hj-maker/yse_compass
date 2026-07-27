import type { Announcement, Template, Timetable } from "@/lib/types";

export const templates: Template[] = [
  {
    id: "tpl-kikaku-plan",
    name: "企画書テンプレート",
    relatedPhase: "企画",
    format: "Google ドキュメント",
    url: "https://drive.google.com/mock/template-kikaku-plan",
  },
  {
    id: "tpl-sekkei-design",
    name: "設計書テンプレート",
    relatedPhase: "設計",
    format: "Word",
    url: "https://drive.google.com/mock/template-sekkei-design",
  },
  {
    id: "tpl-sekkei-screen",
    name: "画面設計書テンプレート",
    relatedPhase: "設計",
    format: "Google スライド",
    url: "https://drive.google.com/mock/template-sekkei-screen",
  },
  {
    id: "tpl-shisaku-demo",
    name: "試作品デモ資料テンプレート",
    relatedPhase: "試作",
    format: "PowerPoint",
    url: "https://drive.google.com/mock/template-shisaku-demo",
  },
  {
    id: "tpl-saishu-summary",
    name: "最終概要集テンプレート",
    relatedPhase: "最終",
    format: "Word",
    url: "https://drive.google.com/mock/template-saishu-summary",
  },
  {
    id: "tpl-slide-common",
    name: "発表スライドテンプレート",
    relatedPhase: "最終",
    format: "Google スライド",
    url: "https://drive.google.com/mock/template-slide-common",
  },
];

export const announcements: Announcement[] = [
  // --- 2026年度 ---
  {
    id: "kikaku",
    yearId: "year-2026",
    phase: "企画",
    title: "コンテンツ企画書発表会",
    period: "2026-07-17",
    submissionDeadline: "2026-07-16 17:00",
    status: "終了",
    isPublished: true,
    materialSlots: [
      { id: "kikaku-slot-plan", name: "企画書", required: true, templateId: "tpl-kikaku-plan" },
      { id: "kikaku-slot-slide", name: "発表スライド", required: true, templateId: "tpl-slide-common" },
    ],
  },
  {
    id: "sekkei",
    yearId: "year-2026",
    phase: "設計",
    title: "設計書発表会",
    period: "2026-10-15",
    submissionDeadline: "2026-10-14 17:00",
    status: "受付中",
    isPublished: false,
    materialSlots: [
      { id: "sekkei-slot-design", name: "設計書", required: true, templateId: "tpl-sekkei-design" },
      { id: "sekkei-slot-slide", name: "発表スライド", required: true, templateId: "tpl-slide-common" },
      { id: "sekkei-slot-screen", name: "画面設計書", required: false, templateId: "tpl-sekkei-screen" },
    ],
  },
  {
    id: "shisaku",
    yearId: "year-2026",
    phase: "試作",
    title: "試作品版発表会",
    period: "2026-12-17",
    submissionDeadline: "2026-12-16 17:00",
    status: "開催予定",
    isPublished: false,
    materialSlots: [
      { id: "shisaku-slot-demo", name: "試作品デモ資料", required: true, templateId: "tpl-shisaku-demo" },
      { id: "shisaku-slot-slide", name: "発表スライド", required: true, templateId: "tpl-slide-common" },
    ],
  },
  {
    id: "saishu",
    yearId: "year-2026",
    phase: "最終",
    title: "最終発表会",
    period: "2027-02-09",
    submissionDeadline: "2027-02-08 17:00",
    status: "開催予定",
    isPublished: false,
    materialSlots: [
      { id: "saishu-slot-summary", name: "最終概要集", required: true, templateId: "tpl-saishu-summary" },
      { id: "saishu-slot-slide", name: "発表スライド", required: true, templateId: "tpl-slide-common" },
      { id: "saishu-slot-appendix", name: "補足資料", required: false, templateId: null },
    ],
  },

  // --- 2025年度(アーカイブ済み・簡略) ---
  {
    id: "2025-saishu",
    yearId: "year-2025",
    phase: "最終",
    title: "最終発表会",
    period: "2026-02-06",
    submissionDeadline: "2026-02-05 17:00",
    status: "終了",
    isPublished: true,
    materialSlots: [
      { id: "2025-saishu-slot-summary", name: "最終概要集", required: true, templateId: "tpl-saishu-summary" },
      { id: "2025-saishu-slot-slide", name: "発表スライド", required: true, templateId: "tpl-slide-common" },
    ],
  },
];

export const timetables: Timetable[] = [
  {
    announcementId: "kikaku",
    currentPresentingTeamId: null,
    slots: [
      { id: "kikaku-tt-1", teamId: "team-cheers", order: 1, startTime: "09:30", durationMin: 15, isBreak: false },
      { id: "kikaku-tt-2", teamId: "team-nova", order: 2, startTime: "09:45", durationMin: 15, isBreak: false },
      { id: "kikaku-tt-break", order: 3, startTime: "10:00", durationMin: 10, isBreak: true, breakLabel: "休憩" },
      { id: "kikaku-tt-3", teamId: "team-lumen", order: 4, startTime: "10:10", durationMin: 15, isBreak: false },
    ],
  },
  {
    announcementId: "sekkei",
    currentPresentingTeamId: "team-nova",
    slots: [
      { id: "sekkei-tt-1", teamId: "team-cheers", order: 1, startTime: "13:00", durationMin: 15, isBreak: false },
      { id: "sekkei-tt-2", teamId: "team-nova", order: 2, startTime: "13:15", durationMin: 15, isBreak: false },
      { id: "sekkei-tt-break", order: 3, startTime: "13:30", durationMin: 10, isBreak: true, breakLabel: "休憩" },
      { id: "sekkei-tt-3", teamId: "team-lumen", order: 4, startTime: "13:40", durationMin: 15, isBreak: false },
    ],
  },
];
