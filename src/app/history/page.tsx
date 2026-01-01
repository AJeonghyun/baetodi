"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Globe,
  Bookmark,
  MessagesSquare,
  MonitorSmartphone,
  Users,
} from "lucide-react";

const historyItems = [
  {
    year: "2023",
    title: "시작",
    desc: "첫 모임과 함께 배토디 탄생",
    Icon: Globe,
  },
  {
    year: "2024",
    title: "성장",
    desc: "정기 모임·투표 시스템 도입",
    Icon: Bookmark,
  },
  {
    year: "2025",
    title: "확장",
    desc: "공지·일정·커뮤니티 온라인 통합",
    Icon: MessagesSquare,
  },
  {
    year: "2026",
    title: "도약",
    desc: "참여형 운영과 신규 코트 확보",
    Icon: MonitorSmartphone,
  },
  {
    year: "2027",
    title: "함께",
    desc: "회원 100+명, 더 넓은 네트워크",
    Icon: Users,
  },
];

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pt-20 pb-20 sm:px-6 lg:px-10">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
            Timeline
          </p>
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
            배토디 출범 과정
          </h1>
          <p className="text-slate-600">
            메인 페이지와 동일한 타임라인 스타일로, 배토디의 발자취를 한 눈에
            확인하세요.
          </p>
        </div>

        <Card className="overflow-hidden border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">타임라인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-10 p-6 sm:p-10">
            <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="absolute top-16 right-6 left-6 hidden h-px bg-slate-200 sm:block" />
              <div className="relative grid gap-10 sm:grid-cols-5 sm:items-start">
                {historyItems.map((item, idx) => {
                  const Icon = item.Icon;
                  return (
                    <div
                      key={item.year}
                      className="flex flex-col items-start sm:items-center"
                    >
                      <div className="hidden flex-col items-center gap-3 sm:flex">
                        <div className="flex items-center gap-3">
                          <div className="size-3 rounded-full bg-slate-200" />
                          <div className="grid place-items-center rounded-full bg-slate-900 p-3 text-white shadow-md">
                            <Icon className="size-6" />
                          </div>
                          <div className="size-3 rounded-full bg-slate-200" />
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {item.year}
                        </span>
                      </div>
                      <div className="mt-4 flex w-full flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm sm:mt-6">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Icon className="size-4 text-slate-600 sm:hidden" />
                          {item.year} · {item.title}
                        </div>
                        <p className="text-sm text-slate-600">{item.desc}</p>
                      </div>
                      {idx < historyItems.length - 1 && (
                        <div className="mt-4 hidden h-[2px] w-full max-w-[160px] rounded-full bg-slate-200 sm:block" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
