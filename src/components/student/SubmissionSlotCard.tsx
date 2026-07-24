"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { FileDropzone } from "@/components/student/FileDropzone";
import type { TeamSubmissionRow } from "@/lib/mock-data";

interface SubmittedFile {
  displayName: string;
  blob: Blob;
  size: number;
  mimeType: string;
  objectUrl: string;
  uploadedAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("presentation")) return "📊";
  return "📁";
}

function isTextEditable(mimeType: string, name: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    /\.(txt|md|csv|json)$/i.test(name)
  );
}

export function SubmissionSlotCard({ row }: { row: TeamSubmissionRow }) {
  const { slot, submission, status } = row;
  const deadlinePassed = status === "期限切れ";

  const [mode, setMode] = useState<"link" | "file">("link");
  const [linkUrl, setLinkUrl] = useState(submission?.linkUrl ?? "");
  const [linkSaved, setLinkSaved] = useState(Boolean(submission?.linkUrl));
  const [file, setFile] = useState<SubmittedFile | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  const submitted = linkSaved || file !== null;

  function handleFileSelected(selected: File) {
    setFile({
      displayName: selected.name,
      blob: selected,
      size: selected.size,
      mimeType: selected.type || "application/octet-stream",
      objectUrl: URL.createObjectURL(selected),
      uploadedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    });
  }

  function handleDeleteFile() {
    if (file) URL.revokeObjectURL(file.objectUrl);
    setFile(null);
  }

  async function startEditing() {
    if (!file) return;
    setEditedName(file.displayName);
    setReplacementFile(null);
    if (isTextEditable(file.mimeType, file.displayName)) {
      setEditedContent(await file.blob.text());
    } else {
      setEditedContent(null);
    }
    setIsEditing(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    let newBlob: Blob = file.blob;
    let newMimeType = file.mimeType;
    if (editedContent !== null) {
      newBlob = new Blob([editedContent], { type: file.mimeType || "text/plain" });
    } else if (replacementFile) {
      newBlob = replacementFile;
      newMimeType = replacementFile.type || file.mimeType;
    }

    URL.revokeObjectURL(file.objectUrl);
    setFile({
      ...file,
      displayName: editedName.trim() || file.displayName,
      blob: newBlob,
      mimeType: newMimeType,
      size: newBlob.size,
      objectUrl: URL.createObjectURL(newBlob),
    });
    setIsEditing(false);
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">{slot.kind}</h3>
          <p className="text-sm text-gray-500">締切: {slot.deadline}</p>
        </div>
        <StatusBadge status={submitted ? "提出済み" : status} />
      </div>

      {deadlinePassed && !submitted ? (
        <p className="mt-3 text-sm text-red-600">締切を過ぎたため、新規の提出はできません。</p>
      ) : file ? (
        isEditing ? (
          <form className="mt-3 rounded-lg border border-gray-200 p-3" onSubmit={handleSaveEdit}>
            <label className="block text-xs font-medium text-gray-500">ファイル名</label>
            <input
              autoFocus
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            />

            {editedContent !== null ? (
              <>
                <label className="mt-3 block text-xs font-medium text-gray-500">ファイルの中身</label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={8}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-sm focus:border-gray-500 focus:outline-none"
                />
              </>
            ) : (
              <>
                <label className="mt-3 block text-xs font-medium text-gray-500">
                  ファイルの中身を差し替える（任意・このファイル形式は本文をテキスト編集できないため）
                </label>
                <div className="mt-1">
                  <FileDropzone onFileSelected={setReplacementFile} />
                </div>
                {replacementFile && (
                  <p className="mt-1 text-xs text-brand-teal">差し替え予定: {replacementFile.name}</p>
                )}
              </>
            )}

            <div className="mt-3 flex gap-3">
              <button
                type="submit"
                className="rounded-full bg-brand-teal px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-sm text-gray-500 hover:underline"
              >
                キャンセル
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 p-3">
            {file.mimeType.startsWith("image/") ? (
              <img src={file.objectUrl} alt={file.displayName} className="h-14 w-14 rounded-md object-cover" />
            ) : (
              <span className="text-3xl">{fileIcon(file.mimeType)}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900">{file.displayName}</p>
              <p className="text-xs text-gray-400">
                {formatFileSize(file.size)} ・ {file.uploadedAt} にアップロード
              </p>
            </div>
            <div className="flex shrink-0 gap-1 text-sm">
              <a
                href={file.objectUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100"
              >
                閲覧
              </a>
              <button
                type="button"
                onClick={startEditing}
                className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100"
              >
                編集
              </button>
              <button
                type="button"
                onClick={handleDeleteFile}
                className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
              >
                削除
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="mt-3">
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`rounded-full px-3 py-1 ring-1 ring-inset ${
                mode === "link" ? "bg-brand-teal text-white ring-brand-teal" : "bg-white text-gray-600 ring-gray-300"
              }`}
            >
              リンクで提出
            </button>
            <button
              type="button"
              onClick={() => setMode("file")}
              className={`rounded-full px-3 py-1 ring-1 ring-inset ${
                mode === "file" ? "bg-brand-teal text-white ring-brand-teal" : "bg-white text-gray-600 ring-gray-300"
              }`}
            >
              ファイルをアップロード
            </button>
          </div>

          {mode === "link" ? (
            linkSaved ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 text-sm">
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-brand-blue hover:underline"
                >
                  {linkUrl}
                </a>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setLinkSaved(false)}
                    className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100"
                  >
                    差し替える
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLinkUrl("");
                      setLinkSaved(false);
                    }}
                    className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setLinkSaved(linkUrl.trim().length > 0);
                }}
              >
                <input
                  type="url"
                  required
                  placeholder="資料へのリンク（例: Google Drive の共有URL）"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-full bg-brand-teal px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  登録する
                </button>
              </form>
            )
          ) : (
            <div className="mt-3">
              <FileDropzone onFileSelected={handleFileSelected} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
