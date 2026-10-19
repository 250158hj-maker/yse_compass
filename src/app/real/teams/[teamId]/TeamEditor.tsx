"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { addMemberAction, renameMemberAction, setLeaderAction, updateTeamAction } from "@/lib/actions/teams";
import { useTeamAction } from "../use-team-action";

type Team = {
  id: number;
  name: string;
  workTitle: string;
  leaderMemberId: number | null;
  members: { id: number; name: string }[];
};

// 先生の編集。削除と他チームへの移動は作らない（H-41）。誤りは氏名の編集で直す。
export function TeamEditor({ team }: { team: Team }) {
  return (
    <>
      <TeamInfoForm team={team} />
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">メンバー</h2>
        {team.leaderMemberId === null && <InlineNotice tone="warning">リーダーが決まっていません。下で指定してください。</InlineNotice>}
        <ul className="mt-3 space-y-2">
          {team.members.map((m) => (
            <MemberRow key={m.id} member={m} teamId={team.id} isLeader={m.id === team.leaderMemberId} />
          ))}
        </ul>
        <AddMemberForm teamId={team.id} />
      </Card>
    </>
  );
}

function TeamInfoForm({ team }: { team: Team }) {
  const { run, pending, error } = useTeamAction();
  const [name, setName] = useState(team.name);
  const [workTitle, setWorkTitle] = useState(team.workTitle);
  const [saved, setSaved] = useState(false);
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">チーム情報</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          run(() => updateTeamAction(team.id, { name, workTitle }), () => setSaved(true));
        }}
      >
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField label="チーム名" htmlFor="team-name" required>
            <input id="team-name" className={fieldClassName} value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="作品名" htmlFor="work-title" hint="空にすると未入力に戻ります。">
            <input id="work-title" className={fieldClassName} value={workTitle} onChange={(e) => setWorkTitle(e.target.value)} />
          </FormField>
        </div>
        {error && <InlineNotice tone="danger">{error}</InlineNotice>}
        {saved && !error && <InlineNotice tone="info">保存しました。</InlineNotice>}
        <div className="mt-3">
          <Button type="submit" variant="primary" disabled={pending}>
            保存
          </Button>
        </div>
      </form>
    </Card>
  );
}

function MemberRow({ member, teamId, isLeader }: { member: { id: number; name: string }; teamId: number; isLeader: boolean }) {
  const { run, pending, error } = useTeamAction();
  const [name, setName] = useState(member.name);
  return (
    <li>
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label={`${member.name} の氏名`}
          className={`${fieldClassName} max-w-xs`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button className="whitespace-nowrap" disabled={pending || name.trim() === member.name} onClick={() => run(() => renameMemberAction(member.id, name))}>
          氏名を直す
        </Button>
        {isLeader ? (
          <Badge tone="amber">リーダー</Badge>
        ) : (
          <Button className="whitespace-nowrap" disabled={pending} onClick={() => run(() => setLeaderAction(teamId, member.id))}>
            リーダーにする
          </Button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </li>
  );
}

function AddMemberForm({ teamId }: { teamId: number }) {
  const { run, pending, error } = useTeamAction();
  const [name, setName] = useState("");
  return (
    <form
      className="mt-4 border-t border-slate-200 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addMemberAction(teamId, name), () => setName(""));
      }}
    >
      <FormField label="メンバーを足す" htmlFor="new-member" hint="名簿の足し忘れを直すときに使います。削除と、他チームへの移動はできません。">
        <div className="flex gap-2">
          <input id="new-member" className={fieldClassName} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" className="shrink-0 whitespace-nowrap" disabled={pending || name.trim() === ""}>
            足す
          </Button>
        </div>
      </FormField>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </form>
  );
}
