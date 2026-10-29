// 本実装の画面だけを包む。モックのセッション・ヘッダー・デモ用の時計は付けない（#185）。
// モックの画面と並べて動かす間の最小の枠で、中身の余白は MockChrome が /real にだけ付けていたものと同じ。
export default function RealGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main className="flex-1 px-6 py-8">{children}</main>;
}
