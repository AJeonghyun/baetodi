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
import {
  Vote as VoteIcon,
  Users as UsersIcon,
  Vote,
  Trash2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [showVoters, setShowVoters] = useState<Record<string, boolean>>({}); // 기존 상태 사용 안 함
  // 후보별 투표자 모달
  const [voterModalOpen, setVoterModalOpen] = useState(false);
  const [voterModalScheduleId, setVoterModalScheduleId] = useState<
    string | null
  >(null);
  const [confirmClose, setConfirmClose] = useState<{
    open: boolean;
    batchId?: string | null;
    singleId?: string | null;
  }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    batchId?: string | null;
    singleId?: string | null;
  }>({ open: false });

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

  const userIsChairman = sessionUserPosition === "협회장"; // 종료/삭제 권한

  async function closePoll(batchId: string) {
    // 권한 체크
    if (sessionUserPosition !== "협회장") {
      alert("협회장만 종료할 수 있습니다.");
      return;
    }

    // 1) batch 내 후보 가져오기
    const { data: schedulesInBatch, error: sErr } = await supabase
      .from("schedules")
      .select("id,date")
      .eq("batch_id", batchId);
    if (sErr || !schedulesInBatch?.length) {
      console.error("batch schedules load error:", sErr);
      return;
    }
    const ids = schedulesInBatch.map((r) => r.id);

    // 2) 각 후보의 투표 수 집계
    const { data: votesData, error: vErr } = await supabase
      .from("schedule_votes")
      .select("schedule_id, user_id")
      .in("schedule_id", ids);
    if (vErr) {
      console.error("votes load error:", vErr);
      return;
    }

    const counts = new Map<string, number>();
    ids.forEach((id) => counts.set(id, 0));
    (votesData || []).forEach((v) => {
      counts.set(v.schedule_id, (counts.get(v.schedule_id) || 0) + 1);
    });

    // 3) 최다 득표 일정 선정(동률이면 가장 이른 날짜)
    const sortedByRule = schedulesInBatch.sort((a, b) => {
      const diff = (counts.get(b.id) || 0) - (counts.get(a.id) || 0);
      if (diff !== 0) return diff;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    const winnerId = sortedByRule[0]?.id;
    if (!winnerId) {
      console.warn("no winner found");
      return;
    }

    // 4) 종료/확정 플래그 업데이트
    const { error: closeErr } = await supabase
      .from("schedules")
      .update({ closed: true })
      .eq("batch_id", batchId);
    if (closeErr) {
      console.error("close update error:", closeErr);
      return;
    }

    const { error: markWinnerErr } = await supabase
      .from("schedules")
      .update({ is_event: true })
      .eq("id", winnerId);
    if (markWinnerErr) {
      console.error("winner mark error:", markWinnerErr);
      return;
    }

    const losers = ids.filter((id) => id !== winnerId);
    if (losers.length) {
      await supabase
        .from("schedules")
        .update({ is_event: false })
        .in("id", losers);
    }

    // 5) 자동 출석 처리: winnerId에 투표한 사용자들 출석 upsert(late=false, exempt=false)
    const winnerVoters = (votesData || []).filter(
      (v) => v.schedule_id === winnerId,
    );
    if (winnerVoters.length) {
      const payload = winnerVoters.map((v) => ({
        schedule_id: winnerId,
        user_id: v.user_id,
        late: false,
        exempt: false,
      }));
      // upsert: unique(schedule_id,user_id) 기준
      const { error: attErr } = await supabase
        .from("attendance")
        .upsert(payload, {
          onConflict: "schedule_id,user_id",
          ignoreDuplicates: false,
        });
      if (attErr) console.error("attendance upsert error:", attErr);
    }

    // 6) 로컬 상태 업데이트(낙관적)
    setSchedulesRaw((prev) =>
      prev.map((s) => {
        if (s.batch_id !== batchId) return s;
        return { ...s, closed: true } as any;
      }),
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

  function openVoterModal(scheduleId: string) {
    setVoterModalScheduleId(scheduleId);
    setVoterModalOpen(true);
  }

  // 종료된 투표 삭제(묶음)
  async function deletePoll(batchId: string) {
    if (!userIsChairman) return;
    // 해당 배치의 schedule id 수집
    const { data: scheds, error: sErr } = await supabase
      .from("schedules")
      .select("id, closed")
      .eq("batch_id", batchId);
    if (sErr || !scheds?.length) return;

    // 종료된 투표만 삭제 허용
    const allClosed = scheds.every((s: any) => !!s.closed);
    if (!allClosed) {
      alert("진행 중인 투표는 삭제할 수 없습니다.");
      return;
    }

    const ids = scheds.map((s: any) => s.id);

    // 관련 투표/출석 삭제 후 스케줄 삭제
    if (ids.length) {
      await supabase.from("schedule_votes").delete().in("schedule_id", ids);
      await supabase.from("attendance").delete().in("schedule_id", ids);
      await supabase.from("schedules").delete().in("id", ids);
    }

    // 로컬 상태 갱신
    setSchedulesRaw((prev) => prev.filter((s) => s.batch_id !== batchId));
    setVotes((prev) => prev.filter((v) => !ids.includes(v.schedule_id)));
  }

  // 종료된 단일 일정 삭제
  async function deleteSingle(scheduleId: string) {
    if (!userIsChairman) return;
    const { data: sched, error } = await supabase
      .from("schedules")
      .select("id, closed, batch_id")
      .eq("id", scheduleId)
      .maybeSingle();
    if (error || !sched) return;
    if (!sched.closed || sched.batch_id) {
      alert("종료된 단일 일정만 삭제할 수 있습니다.");
      return;
    }
    await supabase
      .from("schedule_votes")
      .delete()
      .eq("schedule_id", scheduleId);
    await supabase.from("attendance").delete().eq("schedule_id", scheduleId);
    await supabase.from("schedules").delete().eq("id", scheduleId);

    setSchedulesRaw((prev) => prev.filter((s) => s.id !== scheduleId));
    setVotes((prev) => prev.filter((v) => v.schedule_id !== scheduleId));
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
          pollCards.map((card) => {
            return (
              <Card
                key={card.batch_id || card.schedules[0].id}
                className="overflow-hidden"
              >
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[11px] font-medium",
                          card.isClosed
                            ? "bg-slate-200 text-slate-700"
                            : "bg-green-100 text-green-700",
                        )}
                      >
                        <VoteIcon className="h-3 w-3" />
                        {card.isClosed ? "종료됨" : "진행중"}
                      </span>

                      {/* 종료된 경우에만 삭제 버튼 표시(협회장만) */}
                      {card.isClosed && userIsChairman && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-white hover:bg-rose-50"
                                aria-label="투표 삭제"
                                onClick={() =>
                                  setConfirmDelete({
                                    open: true,
                                    batchId: card.isPoll ? card.batch_id : null,
                                    singleId: card.isPoll
                                      ? null
                                      : card.schedules[0].id,
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4 text-rose-600" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[11px]">
                              종료된 투표 삭제
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    후보 {card.schedules.length}개
                  </CardDescription>
                </CardHeader>

                {/* ...existing CardContent... */}
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
                          <div
                            className={cn(
                              "group relative flex w-[140px] flex-col items-center justify-center rounded-md border px-3 py-2 text-xs transition",
                              myVoted
                                ? "border-sky-500 bg-sky-50 text-sky-700"
                                : "border-slate-200 bg-white",
                              card.isClosed && "opacity-60",
                            )}
                          >
                            <button
                              disabled={card.isClosed}
                              onClick={() => toggleVote(opt.id)}
                              className="flex w-full flex-col items-center"
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

                            {/* 아이콘 버튼: 투표자 보기 */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => openVoterModal(opt.id)}
                                    className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-md border bg-white hover:bg-slate-50"
                                    aria-label="투표자 보기"
                                  >
                                    <Vote className="h-4 w-4 text-slate-700" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="text-[11px]"
                                >
                                  투표한 사람
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
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
                          setConfirmClose({
                            open: true,
                            batchId: card.isPoll ? card.batch_id : null,
                            singleId: card.isPoll ? null : card.schedules[0].id,
                          });
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
                placeholder="0월 0주차 모임"
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

      {/* 투표 종료 확인 AlertDialog */}
      <AlertDialog
        open={confirmClose.open}
        onOpenChange={(open: any) =>
          setConfirmClose((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>투표를 종료할까요?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              종료하면 최다 득표 날짜를 확정하고, 해당 날짜에 투표한 사람들은
              자동으로 출석 처리됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">취소</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              onClick={() => {
                if (confirmClose.batchId) closePoll(confirmClose.batchId);
                if (confirmClose.singleId) closeSingle(confirmClose.singleId);
                setConfirmClose({ open: false, batchId: null, singleId: null });
              }}
            >
              종료하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 삭제 확인 AlertDialog */}
      <AlertDialog
        open={confirmDelete.open}
        onOpenChange={(open: any) =>
          setConfirmDelete((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>종료된 투표를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              삭제하면 해당 투표의 후보, 투표 내역, 출석 기록이 함께 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">취소</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              onClick={async () => {
                if (confirmDelete.batchId)
                  await deletePoll(confirmDelete.batchId);
                if (confirmDelete.singleId)
                  await deleteSingle(confirmDelete.singleId);
                setConfirmDelete({
                  open: false,
                  batchId: null,
                  singleId: null,
                });
              }}
            >
              삭제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 후보별 투표자 모달 (수정) */}
      <Dialog open={voterModalOpen} onOpenChange={setVoterModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>이 날짜에 투표한 사람</DialogTitle>
          </DialogHeader>
          <div className="max-h-[40vh] overflow-y-auto">
            {(() => {
              const voters = votes.filter(
                (v) => v.schedule_id === voterModalScheduleId,
              );
              if (!voters.length) {
                return (
                  <p className="text-xs text-slate-500">
                    아직 투표한 사람이 없습니다.
                  </p>
                );
              }
              return (
                <ul className="space-y-1">
                  {voters.map((v) => {
                    const profile = userProfiles[v.user_id];
                    const name = profile?.name;
                    const positionLabel = profile?.position?.trim()
                      ? profile.position
                      : "미지정";
                    return (
                      <li
                        key={v.user_id}
                        className="flex items-center justify-between text-[12px] text-black"
                      >
                        <span>• {name}</span>
                        <span className="text-[11px] text-amber-600">
                          ({positionLabel})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoterModalOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
