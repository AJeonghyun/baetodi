"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// 간단 모델
type Match = {
  id: string;
  date: string; // yyyy-mm-dd
  team_a_name: string;
  team_b_name: string;
  approved: boolean | null;
  created_by: string | null;
  created_at: string;
};

type Participant = {
  match_id: string;
  user_id: string;
  team: "A" | "B";
  result: "win" | "loss";
  score_for: number;
  score_against: number;
};

type User = {
  id: string;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
};
function labelFor(u?: User) {
  return (
    u?.name || u?.nickname || u?.email || (u?.id ? u.id.slice(0, 6) : "Unknown")
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [openCreate, setOpenCreate] = useState(false);

  // 폼 상태
  const [date, setDate] = useState("");
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [scoreA, setScoreA] = useState<string>("");
  const [scoreB, setScoreB] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const teamLimit = 2;

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const { data: m } = await supabase
      .from("matches_official")
      .select("id,date,team_a_name,team_b_name,approved,created_by,created_at")
      .order("date", { ascending: false })
      .limit(50);
    setMatches((m || []) as Match[]);

    const { data: p } = await supabase
      .from("match_participants")
      .select("match_id,user_id,team,result,score_for,score_against");
    setParticipants((p || []) as Participant[]);

    // 유저 프로필 맵
    const userIds = Array.from(new Set((p || []).map((r) => r.user_id)));
    if (userIds.length) {
      const { data: u } = await supabase
        .from("users")
        .select("id,name,nickname,email")
        .in("id", userIds);
      const map: Record<string, User> = {};
      (u || []).forEach((row) => (map[row.id] = row as User));
      setUsers(map);
    }
  }

  const joined = useMemo(() => {
    // match_id 기준으로 참가자 묶기
    const byMatch: Record<string, Participant[]> = {};
    participants.forEach((p) => {
      byMatch[p.match_id] ??= [];
      byMatch[p.match_id].push(p);
    });
    return matches.map((m) => ({
      match: m,
      parts: byMatch[m.id] || [],
    }));
  }, [matches, participants]);

  function isValidSelection() {
    const okNames = teamAName.trim().length > 0 && teamBName.trim().length > 0;
    const okTeams =
      teamA.length > 0 &&
      teamA.length <= teamLimit &&
      teamB.length > 0 &&
      teamB.length <= teamLimit;
    const okScores = scoreA !== "" && scoreB !== "";
    return okNames && okTeams && okScores;
  }

  async function createMatch() {
    if (!isValidSelection()) return;
    setSaving(true);
    const { data: creator } = await supabase.auth.getUser();
    const createdBy = creator?.user?.id || null;

    // 1) 경기 생성
    const payload = {
      date: date || new Date().toISOString().slice(0, 10),
      team_a_name: teamAName.trim(),
      team_b_name: teamBName.trim(),
      created_by: createdBy,
      approved: true,
    };
    const { data: inserted, error } = await supabase
      .from("matches_official")
      .insert(payload)
      .select("id")
      .single();
    if (error || !inserted?.id) {
      setSaving(false);
      return;
    }
    const matchId = inserted.id as string;

    // 2) 참가자/점수 저장
    const sA = Number(scoreA);
    const sB = Number(scoreB);
    const rows: Participant[] = [
      ...teamA.map((uid) => ({
        match_id: matchId,
        user_id: uid,
        team: "A" as const,
        result: sA > sB ? ("win" as const) : ("loss" as const),
        score_for: sA,
        score_against: sB,
      })),
      ...teamB.map((uid) => ({
        match_id: matchId,
        user_id: uid,
        team: "B" as const,
        result: sB > sA ? ("win" as const) : ("loss" as const),
        score_for: sB,
        score_against: sA,
      })),
    ];
    await supabase
      .from("match_participants")
      .upsert(rows, { onConflict: "match_id,user_id" });

    setSaving(false);
    setOpenCreate(false);
    // 폼 리셋
    setDate("");
    setTeamAName("");
    setTeamBName("");
    setTeamA([]);
    setTeamB([]);
    setScoreA("");
    setScoreB("");

    fetchAll();
  }

  return (
    <div className="min-h-screen w-full bg-white text-slate-800">
      <header className="sticky top-0 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <h1 className="text-xl font-bold">경기 기록 아카이브</h1>
          <Link
            href="/community"
            className="text-sm text-slate-600 hover:underline"
          >
            커뮤니티로
          </Link>
        </div>
      </header>

      <main className="w-full px-4 py-8 sm:px-6 lg:px-10">
        <p className="text-slate-600">
          배드민턴 경기 기록을 저장하고 카드로 아카이빙합니다.
        </p>
        <Separator className="my-6" />

        <div className="mb-4 flex items-center gap-2">
          <Button size="sm" onClick={() => setOpenCreate(true)}>
            경기 기록 추가
          </Button>
        </div>

        {/* 경기 카드 그리드 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {joined.length === 0 ? (
            <p className="text-sm text-slate-600">
              아직 저장된 경기가 없습니다.
            </p>
          ) : (
            joined.map(({ match, parts }) => {
              const sA = parts.find((p) => p.team === "A")?.score_for ?? null;
              const sB = parts.find((p) => p.team === "B")?.score_for ?? null;
              const winner =
                sA !== null && sB !== null
                  ? sA > sB
                    ? "A"
                    : sB > sA
                      ? "B"
                      : null
                  : null;

              const teamALabels = parts
                .filter((p) => p.team === "A")
                .map((p) => labelFor(users[p.user_id]));
              const teamBLabels = parts
                .filter((p) => p.team === "B")
                .map((p) => labelFor(users[p.user_id]));

              return (
                <div key={match.id} className="rounded-lg border">
                  <div className="border-b bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {match.date}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {match.team_a_name} vs {match.team_b_name}
                      </p>
                      <p className="font-mono text-sm">
                        {sA !== null && sB !== null ? `${sA} : ${sB}` : "- : -"}
                      </p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-emerald-50 p-2">
                        <p className="text-[12px] font-medium text-emerald-700">
                          {match.team_a_name}
                        </p>
                        <p className="mt-1 text-[12px] text-emerald-800">
                          {teamALabels.join(", ")}
                        </p>
                      </div>
                      <div className="rounded-md bg-sky-50 p-2">
                        <p className="text-[12px] font-medium text-sky-700">
                          {match.team_b_name}
                        </p>
                        <p className="mt-1 text-[12px] text-sky-800">
                          {teamBLabels.join(", ")}
                        </p>
                      </div>
                    </div>
                    {winner && (
                      <div className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[12px] text-amber-700">
                        승리 팀:{" "}
                        {winner === "A" ? match.team_a_name : match.team_b_name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 경기 기록 추가 다이얼로그(간소화 폼) */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>경기 기록 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 날짜/팀/참가자/점수: 커뮤니티 페이지 폼과 동일 구조로 사용해도 됩니다 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs text-slate-600">팀 A 이름</label>
                <Input
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  placeholder="예: 그린"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs text-slate-600">팀 B 이름</label>
                <Input
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  placeholder="예: 블루"
                />
              </div>
            </div>

            <div className="grid gap-1">
              <label className="text-xs text-slate-600">날짜(yyyy-mm-dd)</label>
              <Input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="예: 2025-12-13"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs text-slate-600">
                참가자 ID (팀 A / 팀 B)
              </label>
              <Input
                value={teamA.join(",")}
                onChange={(e) =>
                  setTeamA(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="예: uid1,uid2"
              />
              <Input
                value={teamB.join(",")}
                onChange={(e) =>
                  setTeamB(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="예: uid3,uid4"
              />
              <p className="text-[11px] text-slate-500">
                UI 선택 컴포넌트로 교체 가능. 현재는 간단 입력.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs text-slate-600">팀 A 점수</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs text-slate-600">팀 B 점수</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              취소
            </Button>
            <Button
              disabled={!isValidSelection() || saving}
              onClick={createMatch}
            >
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
