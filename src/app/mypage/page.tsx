"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

type EventRow = { id: string; date: string };
type AttendanceRow = {
  schedule_id: string;
  user_id: string;
  late: boolean;
  exempt: boolean;
};
type MatchRow = {
  id: string;
  date: string;
  opponent: string;
  result: "win" | "loss"; // 무승부 제거
  my_user_id: string;
  score_for?: number | null;
  score_against?: number | null;
};

export default function CommunityPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMonthAttendance();
    fetchMyMatches();
  }, []);

  // 출석: attendance ←→ schedules 조인으로 월간 데이터 한 번에 조회
  async function fetchMonthAttendance() {
    setLoading(true);
    const s = startOfMonth(new Date());
    const e = endOfMonth(new Date());

    // FK: attendance.schedule_id → schedules.id 가 있다고 가정
    // schedules(date, is_event) 포함해서 범위/이벤트 필터링
    const { data, error } = await supabase
      .from("attendance")
      .select(
        `
        schedule_id,
        user_id,
        late,
        exempt,
        schedules:schedule_id (
          id,
          date,
          is_event
        )
      `,
      )
      .gte("schedules.date", format(s, "yyyy-MM-dd"))
      .lte("schedules.date", format(e, "yyyy-MM-dd"));

    if (error) {
      setAttendanceRows([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    const rows = (data || []) as unknown as (AttendanceRow & {
      schedules: { id: string; date: string; is_event: boolean } | null;
    })[];

    // 이벤트 스케줄만 추출
    const evMap = new Map<string, EventRow>();
    for (const r of rows) {
      if (r.schedules && r.schedules.is_event) {
        evMap.set(r.schedules.id, {
          id: r.schedules.id,
          date: r.schedules.date,
        });
      }
    }
    setEvents(
      Array.from(evMap.values()).sort((a, b) => (a.date < b.date ? -1 : 1)),
    );

    // attendanceRows는 그대로 유지(면제 제외 로직은 렌더링에서 처리)
    setAttendanceRows(
      rows
        .filter((r) => r.schedules?.is_event)
        .map((r) => ({
          schedule_id: r.schedule_id,
          user_id: r.user_id,
          late: r.late,
          exempt: r.exempt,
        })),
    );

    setLoading(false);
  }

  // 경기: 내 참가 행 + 경기 기본정보를 조인해 한 번에 조회
  async function fetchMyMatches() {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;

    const { data, error } = await supabase
      .from("match_participants")
      .select(
        `
        match_id,
        user_id,
        team,
        score_for,
        score_against,
        match:match_id (
          id,
          date,
          team_a_name,
          team_b_name
        )
      `,
      )
      .eq("user_id", uid)
      .order("match_id", { ascending: false })
      .limit(20);

    if (error || !data) {
      setMatches([]);
      return;
    }

    const built: MatchRow[] = (data as any[])
      .map((p) => {
        const m = p.match as {
          id: string;
          date: string;
          team_a_name: string;
          team_b_name: string;
        } | null;
        if (!m) return null;

        const myTeam: "A" | "B" = p.team;
        const myOpponent = myTeam === "A" ? m.team_b_name : m.team_a_name;

        // 승/패 계산: 내 참가 행의 score_for/score_against만으로 가능
        const sFor: number | null = p.score_for ?? null;
        const sAgainst: number | null = p.score_against ?? null;

        let result: "win" | "loss" = "loss";
        if (sFor != null && sAgainst != null) {
          result = sFor > sAgainst ? "win" : "loss";
        }

        return {
          id: m.id,
          date: m.date,
          opponent: myOpponent,
          result,
          my_user_id: uid,
          score_for: sFor,
          score_against: sAgainst,
        } as MatchRow;
      })
      .filter(Boolean) as MatchRow[];

    built.sort((a, b) => (a.date < b.date ? 1 : -1));
    setMatches(built);
  }

  // 월간 요약(출석/지각 수)
  const summary = useMemo(() => {
    let present = 0;
    let late = 0;
    events.forEach((ev) => {
      const rows = attendanceRows.filter(
        (r) => r.schedule_id === ev.id && !r.exempt,
      );
      present += rows.filter((r) => !r.late).length;
      late += rows.filter((r) => r.late).length;
    });
    return { present, late };
  }, [events, attendanceRows]);

  const matchSummary = useMemo(() => {
    const total = matches.length;
    const win = matches.filter((m) => m.result === "win").length;
    const loss = total - win; // 무승부 없음
    const winRate = total ? Math.round((win / total) * 100) : 0;
    return { total, win, loss, winRate };
  }, [matches]);

  const statusBadge = (scheduleId: string) => {
    const rows = attendanceRows.filter(
      (r) => r.schedule_id === scheduleId && !r.exempt,
    );
    const hasLate = rows.some((r) => r.late);
    if (rows.length === 0)
      return {
        label: "미기록",
        cls: "bg-slate-100 text-slate-700 border-slate-200",
      };
    if (hasLate)
      return {
        label: "결석 있음",
        cls: "bg-amber-100 text-amber-700 border-amber-200",
      };
    return {
      label: "출석",
      cls: "bg-green-100 text-green-700 border-green-200",
    };
  };

  // 달력 셀 상태/색상(요약 카드 내 시각화)
  const dayCell = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    const ev = events.find((e) => e.date.slice(0, 10) === key);
    if (!ev) return { status: "none", cls: "" as string };
    const rows = attendanceRows.filter(
      (r) => r.schedule_id === ev.id && !r.exempt,
    );
    const hasLate = rows.some((r) => r.late);
    if (rows.length === 0) return { status: "no-record", cls: "" };
    if (hasLate) return { status: "late", cls: "" };
    return { status: "present", cls: "" };
  };

  // 이번 달 달력 그리드 날짜 생성(주 시작 기준)
  const monthGridDays = useMemo(() => {
    const sMonth = startOfMonth(new Date());
    const sGrid = startOfWeek(sMonth, { weekStartsOn: 0 }); // 일요일 시작
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(sGrid, i);
      days.push(d);
    }
    return days;
  }, []);

  async function checkIn(scheduleId: string, { late = false } = {}) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    await supabase
      .from("attendance")
      .upsert({ schedule_id: scheduleId, user_id: user.id, late })
      .select("schedule_id,user_id,late,exempt");
    // 낙관적 반영
    setAttendanceRows((prev) => {
      const idx = prev.findIndex(
        (r) => r.schedule_id === scheduleId && r.user_id === user.id,
      );
      const next = {
        schedule_id: scheduleId,
        user_id: user.id,
        late,
        exempt: false,
      };
      if (idx >= 0) return prev.map((r, i) => (i === idx ? next : r));
      return [...prev, next];
    });
  }

  return (
    <div className="min-h-screen w-full bg-white text-slate-800">
      <header className="sticky top-0 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <h1 className="text-xl font-bold">마이페이지</h1>
          <Link href="/home" className="text-sm text-slate-600 hover:underline">
            홈으로
          </Link>
        </div>
      </header>

      <main className="w-full px-4 py-8 sm:px-6 lg:px-10">
        <p className="text-slate-600">
          출석, 경기 기록, 최근 전적 등 마이페이지 공간입니다.
        </p>
        <Separator className="my-6" />

        {/* 레이아웃: 2열, 좌측(출석 현황) 넓게 / 우측(경기 요약 + 최근 전적) 세로 스택 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* 출석 현황 */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>출석 현황</CardTitle>
              <CardDescription>이번 달 기준</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-700">
              {loading ? (
                "불러오는 중..."
              ) : (
                <>
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    <div className="rounded-md border bg-green-50 p-2.5">
                      <div className="text-[11px] font-semibold text-green-700">
                        출석
                      </div>
                      <div className="text-green-800">{summary.present}</div>
                    </div>
                    <div className="rounded-md border bg-amber-50 p-2.5">
                      <div className="text-[11px] font-semibold text-amber-700">
                        결석
                      </div>
                      <div className="text-amber-800">{summary.late}</div>
                    </div>
                    <div className="rounded-md border bg-slate-50 p-2.5">
                      <div className="text-[11px] font-semibold text-slate-700">
                        모임
                      </div>
                      <div className="text-slate-800">{events.length}</div>
                    </div>
                  </div>

                  {/* 컴팩트 달력 */}
                  <div className="rounded-md border p-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-medium">
                        {format(new Date(), "yyyy년 MM월")}
                      </span>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />{" "}
                          출석
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-transparent ring-2 ring-amber-400" />{" "}
                          결석
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-flex h-2 w-2 rounded-full bg-slate-300" />{" "}
                          미기록
                        </span>
                      </div>
                    </div>

                    <div className="mb-1 grid grid-cols-7 gap-1">
                      {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                        <div
                          key={d}
                          className="py-0.5 text-center text-[10px] text-slate-500"
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {monthGridDays.map((d, i) => {
                        const inMonth = d.getMonth() === new Date().getMonth();
                        const { status } = dayCell(d);
                        const baseCircle =
                          "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[10px]";
                        const dimCls = inMonth ? "" : "opacity-40";
                        const presentCls = "bg-green-500 text-white";
                        const lateCls =
                          "ring-2 ring-amber-400 bg-white text-slate-700";
                        const noRecordCls = "bg-slate-100 text-slate-700";
                        const cls =
                          status === "present"
                            ? presentCls
                            : status === "late"
                              ? lateCls
                              : status === "no-record"
                                ? noRecordCls
                                : "bg-transparent text-slate-400";
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-center py-0.5"
                          >
                            <div className={`${baseCircle} ${cls} ${dimCls}`}>
                              {format(d, "d", { locale: ko })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 우측 컬럼: 경기 요약 + 최근 전적 스택 */}
          <div className="flex flex-col gap-4">
            {/* 간결한 경기 요약 - 승률 + W/L 만 표기 */}
            <Card>
              <CardHeader>
                <CardTitle>경기 요약</CardTitle>
                <CardDescription>최근 {matches.length}경기</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex items-center justify-between">
                  <div className="rounded-md border bg-emerald-50 px-3 py-2">
                    <div className="text-[11px] font-semibold text-emerald-700">
                      승률
                    </div>
                    <div className="text-base text-emerald-900">
                      {matchSummary.winRate}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border bg-green-50 px-2 py-[2px] text-xs text-green-700">
                      W {matchSummary.win}
                    </span>
                    <span className="rounded border bg-rose-50 px-2 py-[2px] text-xs text-rose-700">
                      L {matchSummary.loss}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 최근 전적 */}
            <Card>
              <CardHeader>
                <CardTitle>최근 전적</CardTitle>
                <CardDescription>최대 20경기</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                {matches.length === 0 ? (
                  <p className="text-slate-500">경기 기록이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {matches.slice(0, 8).map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded border px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-500">
                            {format(new Date(m.date), "yyyy.MM.dd", {
                              locale: ko,
                            })}
                          </span>
                          <span className="text-sm font-medium text-slate-800">
                            {m.opponent}
                          </span>
                          {m.score_for != null && m.score_against != null && (
                            <span className="text-xs text-slate-600">
                              {m.score_for} : {m.score_against}
                            </span>
                          )}
                        </div>
                        <span
                          className={
                            "rounded px-2 py-[2px] text-xs font-semibold " +
                            (m.result === "win"
                              ? "border border-green-200 bg-green-100 text-green-700"
                              : "border border-rose-200 bg-rose-100 text-rose-700")
                          }
                        >
                          {m.result === "win" ? "승" : "패"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
