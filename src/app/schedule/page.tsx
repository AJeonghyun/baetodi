"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";

type VoteRow = {
  schedule_id: string;
  user_id: string;
};

type UserProfile = {
  id: string;
  name?: string | null; // 추가
  nickname?: string | null;
  email?: string | null;
  position?: string | null;
};

type LocalSchedule = {
  id: string;
  dateObj: Date;
  dateStr: string;
  batch_id: string | null;
  closed: boolean;
  poll_title: string | null;
};

type PollCard = {
  batch_id: string | null;
  schedules: LocalSchedule[];
  isClosed: boolean;
  isPoll: boolean;
  createdByMe: boolean;
  title: string;
};

export default function SchedulePage() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionUserPosition, setSessionUserPosition] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  // 새 투표 Dialog
  const [openNew, setOpenNew] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [pollTitle, setPollTitle] = useState("");
  const [savingPoll, setSavingPoll] = useState(false);

  // 데이터
  const [schedulesRaw, setSchedulesRaw] = useState<LocalSchedule[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>(
    {},
  );
  const [showVoters, setShowVoters] = useState<Record<string, boolean>>({}); // schedule_id -> bool

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      setSessionUserId(user?.id ?? null);
      if (!user) return;

      // position 포함 사용자 정보 조회
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, position, name, nickname, email") // name 포함
        .eq("id", user.id)
        .limit(1)
        .maybeSingle();

      if (!existingUser) {
        await supabase.from("users").insert({ id: user.id });
      } else {
        setSessionUserPosition((existingUser as any).position || null);
      }
      fetchAll();
    });
  }, []);

  async function fetchAll() {
    setLoading(true);
    const { data: scheduleRows, error: sErr } = await supabase
      .from("schedules")
      .select("id,date,batch_id,created_by,closed,poll_title,created_at")
      .order("created_at", { ascending: false });
    if (sErr) {
      console.error(sErr);
      setLoading(false);
      return;
    }
    const mapped: LocalSchedule[] = (scheduleRows || []).map((r) => ({
      id: r.id,
      dateObj: new Date(r.date),
      dateStr: format(new Date(r.date), "yyyy-MM-dd (EEE)", { locale: ko }),
      batch_id: r.batch_id,
      closed: !!r.closed,
      poll_title: (r as any).poll_title || null,
    }));
    setSchedulesRaw(mapped);

    const scheduleIds = mapped.map((r) => r.id);
    let voteRows: VoteRow[] = [];
    if (scheduleIds.length) {
      const { data: vData, error: vErr } = await supabase
        .from("schedule_votes")
        .select("schedule_id,user_id")
        .in("schedule_id", scheduleIds);
      if (!vErr && vData) voteRows = vData as VoteRow[];
    }
    setVotes(voteRows);

    // 사용자 프로필 로드
    const userIds = Array.from(new Set(voteRows.map((v) => v.user_id)));
    if (userIds.length) {
      const { data: uData } = await supabase
        .from("users")
        .select("id,name,nickname,email,position") // name 포함
        .in("id", userIds);
      const map: Record<string, UserProfile> = {};
      (uData || []).forEach((u) => {
        map[u.id] = {
          id: u.id,
          name: (u as any).name,
          nickname: (u as any).nickname,
          email: (u as any).email,
          position: (u as any).position,
        };
      });
      setUserProfiles(map);
    } else {
      setUserProfiles({});
    }
    setLoading(false);
  }

  // 그룹화 (votes 변경 시 자동 재계산)
  const pollCards: PollCard[] = useMemo(() => {
    const map: Record<string, LocalSchedule[]> = {};
    schedulesRaw.forEach((r) => {
      const key = r.batch_id || `single-${r.id}`;
      map[key] = map[key] || [];
      map[key].push(r);
    });

    return Object.entries(map)
      .map(([key, arr], idx) => {
        const isPoll = arr.some((s) => s.batch_id);
        const closed = arr.every((s) => s.closed);
        const title = isPoll
          ? arr[0].poll_title || "제목 없음"
          : arr[0].poll_title || "단일 일정";
        // createdByMe 판단 위해 schedulesRaw 원본 필요 → 첫 row id로 찾기
        const createdByMe = false; // 필요 시 created_by 컬럼 추가 select 후 로직 복원
        return {
          batch_id: isPoll ? arr[0].batch_id : null,
          schedules: arr.sort(
            (a, b) => a.dateObj.getTime() - b.dateObj.getTime(),
          ),
          isClosed: closed,
          isPoll,
          createdByMe,
          title,
        };
      })
      .sort((a, b) => {
        if (a.isPoll !== b.isPoll) return a.isPoll ? -1 : 1;
        return 0;
      });
  }, [schedulesRaw, votes]);

  async function createPoll() {
    if (!selectedDates.length || !sessionUserId) return;
    setSavingPoll(true);
    const batchId = crypto.randomUUID();
    const rows = selectedDates.map((d) => ({
      date: format(d, "yyyy-MM-dd"),
      created_by: sessionUserId,
      time: null,
      place: null,
      memo: null,
      batch_id: batchId,
      closed: false,
      poll_title: pollTitle.trim() || null,
    }));
    const { error } = await supabase.from("schedules").insert(rows);
    if (error) console.error(error);
    setSavingPoll(false);
    setOpenNew(false);
    setSelectedDates([]);
    setPollTitle("");
    fetchAll();
  }

  // 낙관적 업데이트
  async function toggleVote(scheduleId: string) {
    if (!sessionUserId) return;
    const already = votes.some(
      (v) => v.schedule_id === scheduleId && v.user_id === sessionUserId,
    );
    if (already) {
      setVotes((prev) =>
        prev.filter(
          (v) => !(v.schedule_id === scheduleId && v.user_id === sessionUserId),
        ),
      );
      const { error } = await supabase
        .from("schedule_votes")
        .delete()
        .eq("schedule_id", scheduleId)
        .eq("user_id", sessionUserId);
      if (error) {
        // 실패 시 되돌리기
        fetchAll();
      }
    } else {
      setVotes((prev) => [
        ...prev,
        { schedule_id: scheduleId, user_id: sessionUserId },
      ]);
      const { error } = await supabase
        .from("schedule_votes")
        .insert({ schedule_id: scheduleId, user_id: sessionUserId });
      if (error) {
        fetchAll();
      }
    }
  }

  const userIsChairman = sessionUserPosition === "협회장"; // 종료 권한

  async function closePoll(batchId: string) {
    if (!userIsChairman) return; // 권한 체크
    const { error } = await supabase
      .from("schedules")
      .update({ closed: true })
      .eq("batch_id", batchId);
    if (error) console.error(error);
    // 부분 상태 업데이트
    setSchedulesRaw((prev) =>
      prev.map((s) => (s.batch_id === batchId ? { ...s, closed: true } : s)),
    );
  }

  async function closeSingle(scheduleId: string) {
    if (!userIsChairman) return;
    const { error } = await supabase
      .from("schedules")
      .update({ closed: true })
      .eq("id", scheduleId)
      .is("batch_id", null);
    if (error) console.error(error);
    setSchedulesRaw((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, closed: true } : s)),
    );
  }

  function toggleShowVoters(scheduleId: string) {
    setShowVoters((prev) => ({ ...prev, [scheduleId]: !prev[scheduleId] }));
  }

  return (
    <div className="min-h-screen w-full bg-white text-slate-800">
      <header className="sticky top-0 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <h1 className="text-2xl font-bold">날짜 투표</h1>
          <div className="flex items-center gap-3">
            <Button onClick={() => setOpenNew(true)}>새 투표 만들기</Button>
            <Link
              href="/home"
              className="text-sm text-slate-600 hover:underline"
            >
              홈으로
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-8 sm:px-6 lg:px-10">
        <p className="text-sm text-slate-600">
          여러 날짜를 후보로 등록하고 가능한 날짜를 클릭해 투표하세요.
        </p>
        <Separator className="my-6" />

        {loading && <p className="text-sm text-slate-500">불러오는 중...</p>}

        {!loading &&
          pollCards.map((card, i) => {
            const totalVotes = card.schedules.reduce(
              (acc, s) =>
                acc + votes.filter((v) => v.schedule_id === s.id).length,
              0,
            );

            return (
              <Card
                key={card.batch_id || card.schedules[0].id}
                className="overflow-hidden"
              >
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <CardDescription className="flex items-center justify-between text-xs">
                    <span>
                      후보 {card.schedules.length}개 · 총 투표 {totalVotes}회
                    </span>
                    <span
                      className={cn(
                        "rounded px-2 py-[2px] text-[10px] font-medium",
                        card.isClosed
                          ? "bg-slate-200 text-slate-700"
                          : "bg-green-100 text-green-700",
                      )}
                    >
                      {card.isClosed ? "종료됨" : "진행중"}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {card.schedules.map((opt) => {
                      const voters = votes.filter(
                        (v) => v.schedule_id === opt.id,
                      );
                      const myVoted = voters.some(
                        (v) => v.user_id === sessionUserId,
                      );
                      return (
                        <div
                          key={opt.id}
                          className="flex flex-col items-center"
                        >
                          <button
                            disabled={card.isClosed}
                            onClick={() => toggleVote(opt.id)}
                            className={cn(
                              "group relative flex w-[118px] flex-col items-center justify-center rounded-md border px-3 py-2 text-xs transition",
                              myVoted
                                ? "border-sky-500 bg-sky-50 text-sky-700"
                                : "border-slate-200 bg-white hover:bg-slate-50",
                              card.isClosed && "cursor-not-allowed opacity-60",
                            )}
                            aria-label={opt.dateStr}
                          >
                            <span className="font-medium">
                              {format(opt.dateObj, "MM/dd", { locale: ko })}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {format(opt.dateObj, "(EEE)", { locale: ko })}
                            </span>
                            <span
                              className={cn(
                                "mt-1 rounded-full px-2 py-[1px] text-[10px] font-semibold",
                                myVoted
                                  ? "bg-sky-500 text-white"
                                  : "bg-slate-100 text-slate-600",
                              )}
                            >
                              {voters.length}명
                            </span>
                          </button>
                          {voters.length > 0 && (
                            <button
                              onClick={() => toggleShowVoters(opt.id)}
                              className="mt-1 text-[10px] text-slate-500 hover:underline"
                            >
                              {showVoters[opt.id]
                                ? "투표자 숨기기"
                                : "투표자 보기"}
                            </button>
                          )}
                          {showVoters[opt.id] && (
                            <div className="mt-1 w-[118px] rounded border bg-white p-1">
                              <ul className="space-y-[2px]">
                                {voters.map((v) => {
                                  const profile = userProfiles[v.user_id];
                                  const label =
                                    profile?.name ||
                                    profile?.nickname ||
                                    profile?.email ||
                                    v.user_id.slice(0, 6);
                                  return (
                                    <li
                                      key={v.user_id}
                                      className="truncate text-[10px] text-slate-600"
                                    >
                                      • {label}
                                      {profile?.position && (
                                        <span className="ml-1 text-[9px] text-amber-600">
                                          ({profile.position})
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!card.isClosed && (
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (!userIsChairman) {
                            alert("협회장만 종료할 수 있습니다.");
                            return;
                          }
                          card.isPoll
                            ? card.batch_id && closePoll(card.batch_id)
                            : closeSingle(card.schedules[0].id);
                        }}
                        className="text-xs"
                      >
                        투표 종료
                      </Button>
                    </div>
                  )}

                  {card.isClosed && (
                    <p className="text-[11px] text-slate-500">
                      종료된 투표입니다. 더 이상 선택을 변경할 수 없습니다.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}

        {!loading && pollCards.length === 0 && (
          <p className="text-sm text-slate-500">등록된 투표가 없습니다.</p>
        )}
      </main>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>새 날짜 투표 생성</DialogTitle>
            <DialogDescription className="text-xs">
              가능한 날짜 여러 개와 제목을 입력한 뒤 저장하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                투표 제목
              </label>
              <Input
                placeholder="예: 3월 정기 모임 날짜"
                value={pollTitle}
                onChange={(e) => setPollTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  후보 날짜 선택
                </span>
                <span className="text-[11px] text-slate-500">
                  선택: {selectedDates.length}개
                </span>
              </div>
              <div className="rounded-md border p-2">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates: any) => setSelectedDates(dates || [])}
                  locale={ko}
                  className="w-full"
                />
              </div>
              {selectedDates.length > 0 && (
                <div className="text-xs text-slate-600">
                  {selectedDates
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((d) => format(d, "yyyy-MM-dd", { locale: ko }))
                    .join(", ")}
                </div>
              )}
            </div>

            <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-600">
              <p className="mb-1 font-medium">미리보기</p>
              {selectedDates.length === 0 ? (
                <p>날짜가 선택되지 않았습니다.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-4">
                  {selectedDates
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((d) => (
                      <li key={d.toISOString()}>
                        {format(d, "yyyy-MM-dd (EEE)", { locale: ko })}
                      </li>
                    ))}
                </ul>
              )}
              <p className="mt-2 text-[11px]">
                저장 후 후보별로 사용자들이 투표할 수 있습니다.
              </p>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setOpenNew(false);
                setSelectedDates([]);
                setPollTitle("");
              }}
            >
              취소
            </Button>
            <Button
              disabled={
                !selectedDates.length || savingPoll || !pollTitle.trim()
              }
              onClick={createPoll}
            >
              {savingPoll ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
