"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// 날짜 포매팅용 import 추가
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type UserRow = {
  id: string;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
};

type Team = "A" | "B";

type VideoRow = {
  id: string;
  url: string;
  video_id: string;
  title: string | null;
  created_by: string | null;
  created_at: string;
};

export default function CommunityPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [date, setDate] = useState("");
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [scoreA, setScoreA] = useState<string>("");
  const [scoreB, setScoreB] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [dateObj, setDateObj] = useState<Date | undefined>(undefined);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const dateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [dateContentWidth, setDateContentWidth] = useState<number | undefined>(
    undefined,
  );
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [openVideoAdd, setOpenVideoAdd] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);
  const [previewOpenId, setPreviewOpenId] = useState<string | null>(null);

  // 팀 구성: 모드 제거 → 기본 2명까지(원하면 제한 변경 가능)
  const teamLimit = 2;

  useEffect(() => {
    fetchUsers();
    fetchVideos();
  }, []);

  useEffect(() => {
    if (datePopoverOpen && dateTriggerRef.current) {
      setDateContentWidth(dateTriggerRef.current.offsetWidth);
    }
  }, [datePopoverOpen]);

  async function fetchUsers() {
    const { data } = await supabase
      .from("users")
      .select("id,name,nickname,email")
      .order("name", { ascending: true });
    setUsers((data || []) as UserRow[]);
  }

  async function fetchVideos() {
    const { data } = await supabase
      .from("community_videos")
      .select("id,url,video_id,title,created_by,created_at")
      .order("created_at", { ascending: false });
    setVideos((data || []) as VideoRow[]);
  }

  function toggleMember(userId: string, team: Team) {
    if (team === "A") {
      const has = teamA.includes(userId);
      setTeamA(has ? teamA.filter((id) => id !== userId) : [...teamA, userId]);
      setTeamB(teamB.filter((id) => id !== userId));
    } else {
      const has = teamB.includes(userId);
      setTeamB(has ? teamB.filter((id) => id !== userId) : [...teamB, userId]);
      setTeamA(teamA.filter((id) => id !== userId));
    }
  }

  function labelFor(u: UserRow) {
    return u.name || u.nickname || u.email || u.id.slice(0, 6);
  }

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

    // 1) 공식 경기 생성(팀 이름 저장)
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

    // 2) 참가자 저장(팀 점수 기반 승패)
    const sA = Number(scoreA);
    const sB = Number(scoreB);
    const participants = [
      ...teamA.map((uid) => ({
        match_id: matchId,
        user_id: uid,
        team: "A" as Team,
        result: sA > sB ? "win" : "loss",
        score_for: sA,
        score_against: sB,
      })),
      ...teamB.map((uid) => ({
        match_id: matchId,
        user_id: uid,
        team: "B" as Team,
        result: sB > sA ? "win" : "loss",
        score_for: sB,
        score_against: sA,
      })),
    ];

    await supabase.from("match_participants").upsert(participants, {
      onConflict: "match_id,user_id",
    });

    // 리셋
    setSaving(false);
    setOpenCreate(false);
    setDate("");
    setTeamAName("");
    setTeamBName("");
    setTeamA([]);
    setTeamB([]);
    setScoreA("");
    setScoreB("");
  }

  function parseYouTubeId(url: string): string | null {
    try {
      const u = new URL(url);
      // youtu.be/<id>
      if (u.hostname.includes("youtu.be")) {
        return u.pathname.split("/")[1] || null;
      }
      // youtube.com/watch?v=<id>
      if (u.hostname.includes("youtube.com")) {
        const v = u.searchParams.get("v");
        if (v) return v;
        // /embed/<id> or /shorts/<id>
        const parts = u.pathname.split("/");
        const i = parts.findIndex((p) => p === "embed" || p === "shorts");
        if (i >= 0 && parts[i + 1]) return parts[i + 1];
      }
      return null;
    } catch {
      return null;
    }
  }

  async function addVideo() {
    const id = parseYouTubeId(newVideoUrl.trim());
    if (!id) return;
    setSavingVideo(true);
    const { data: userData } = await supabase.auth.getUser();
    const createdBy = userData?.user?.id || null;

    // 제목은 우선 null로 저장하고 클라이언트에서 카드에선 디폴트 처리
    const payload = {
      url: newVideoUrl.trim(),
      video_id: id,
      title: null,
      created_by: createdBy,
    };
    const { error } = await supabase.from("community_videos").insert(payload);
    setSavingVideo(false);
    if (!error) {
      setOpenVideoAdd(false);
      setNewVideoUrl("");
      fetchVideos();
    }
  }

  function ytThumb(id: string) {
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  return (
    <div className="min-h-screen w-full bg-white text-slate-800">
      <header className="sticky top-0 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <h1 className="text-xl font-bold">커뮤니티</h1>
          <Link href="/home" className="text-sm text-slate-600 hover:underline">
            홈으로
          </Link>
        </div>
      </header>

      <main className="w-full px-4 py-8 sm:px-6 lg:px-10">
        <p className="text-slate-600">
          출석, 경기 기록, 사진 공유 등 커뮤니티 활동 공간입니다.
        </p>
        <Separator className="my-6" />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>경기 기록</CardTitle>
                <CardDescription>모두가 기록하고 저장</CardDescription>
              </div>
              <Button size="sm" onClick={() => setOpenCreate(true)}>
                경기 기록 추가
              </Button>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              복식/단식 선택 후 참가자를 지정하고 점수/결과를 저장하세요.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>사진 공유</CardTitle>
              <CardDescription>최근 활동</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              활동 사진을 업로드하세요.
            </CardContent>
          </Card>

          {/* 유튜브 영상 공유 카드 */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>배드민턴 영상 아카이브</CardTitle>
                <CardDescription>유튜브 링크로 정보 공유</CardDescription>
              </div>
              <Link href="/community/videos" className="text-sm underline">
                전체 보기
              </Link>
            </CardHeader>
            <CardContent>
              {videos.length === 0 ? (
                <p className="text-sm text-slate-600">
                  아직 공유된 영상이 없습니다.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {videos.slice(0, 4).map((v) => (
                    <Link
                      key={v.id}
                      href="/community/videos"
                      className="rounded-lg border hover:bg-slate-50"
                    >
                      <div className="block w-full overflow-hidden rounded-t-lg">
                        <img
                          src={ytThumb(v.video_id)}
                          alt="YouTube thumbnail"
                          className="h-40 w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-sm font-medium text-slate-800">
                          {v.title || "배드민턴 정보 영상"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new URL(v.url).hostname}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* 경기 기록 추가 다이얼로그(간소화) */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>경기 기록 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 날짜: shadcn Calendar(dropdown 캡션) */}
            <div className="grid gap-1">
              <label className="text-xs text-slate-600">날짜</label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    ref={dateTriggerRef}
                    variant="outline"
                    className={cn(
                      "flex h-9 w-full items-center justify-between rounded-md px-3 text-left text-sm",
                      !dateObj && "text-slate-500",
                    )}
                  >
                    <span>
                      {dateObj ? format(dateObj, "yyyy-MM-dd") : "날짜 선택"}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="bottom"
                  style={{
                    width: dateContentWidth
                      ? `${dateContentWidth}px`
                      : undefined,
                  }}
                  className="overflow-hidden p-0"
                >
                  <Calendar
                    mode="single"
                    selected={dateObj}
                    captionLayout="dropdown"
                    locale={ko}
                    onSelect={(d) => {
                      if (!d) return;
                      setDateObj(d);
                      setDate(format(d, "yyyy-MM-dd"));
                      setDatePopoverOpen(false);
                    }}
                    initialFocus
                  />
                  <div className="flex items-center justify-between border-t px-3 py-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        setDateObj(today);
                        setDate(format(today, "yyyy-MM-dd"));
                        setDatePopoverOpen(false);
                      }}
                    >
                      오늘로
                    </Button>
                    <Button size="sm" onClick={() => setDatePopoverOpen(false)}>
                      확인
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* 팀 이름 */}
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

            {/* 참가자 선택 */}
            <div className="grid gap-2">
              <label className="text-xs text-slate-600">
                참가자(팀 A / 팀 B)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-[11px] text-slate-500">
                    팀 A (최대 {teamLimit})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {users.map((u) => {
                      const active = teamA.includes(u.id);
                      return (
                        <button
                          key={`A-${u.id}`}
                          type="button"
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-[3px] text-[12px]",
                            active
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-700",
                          )}
                          onClick={() => {
                            if (!active && teamA.length >= teamLimit) return;
                            toggleMember(u.id, "A");
                          }}
                        >
                          {labelFor(u)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-[11px] text-slate-500">
                    팀 B (최대 {teamLimit})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {users.map((u) => {
                      const active = teamB.includes(u.id);
                      return (
                        <button
                          key={`B-${u.id}`}
                          type="button"
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-[3px] text-[12px]",
                            active
                              ? "border-sky-500 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-white text-slate-700",
                          )}
                          onClick={() => {
                            if (!active && teamB.length >= teamLimit) return;
                            toggleMember(u.id, "B");
                          }}
                        >
                          {labelFor(u)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 점수 */}
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

      {/* 영상 추가 다이얼로그 */}
      <Dialog open={openVideoAdd} onOpenChange={setOpenVideoAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>유튜브 영상 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1">
              <label className="text-xs text-slate-600">유튜브 링크</label>
              <Input
                placeholder="예: https://www.youtube.com/watch?v=XXXXXXXX"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
              />
              {!newVideoUrl || parseYouTubeId(newVideoUrl) ? null : (
                <p className="text-[12px] text-rose-600">
                  유효한 유튜브 링크가 아닙니다.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenVideoAdd(false)}>
              취소
            </Button>
            <Button
              disabled={!parseYouTubeId(newVideoUrl) || savingVideo}
              onClick={addVideo}
            >
              {savingVideo ? "저장 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
