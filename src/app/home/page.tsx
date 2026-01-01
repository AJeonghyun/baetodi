"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

const pixelAvatar = (fg: string, bg: string) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'><rect width='16' height='16' fill='${bg}'/><rect x='5' y='3' width='6' height='6' rx='1' fill='${fg}'/><rect x='4' y='7' width='8' height='6' rx='1' fill='${fg}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

export default function HomePage() {
  return (
    <div className="min-h-screen w-full bg-white text-[15px] text-slate-800 sm:text-base">
      <main className="w-full space-y-24 px-4 pt-20 pb-24 sm:px-6 lg:px-10">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold tracking-[0.12em] text-slate-500 uppercase">
              배드민턴 동호회 · BAETODI
            </p>
            <h2 className="text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
              함께 치고, 함께 성장하는
              <span className="ml-2 inline-block rounded-full bg-slate-900 px-3 py-1 text-white">
                배토디
              </span>
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              일정, 투표, 공지, 커뮤니티는 상단 네비게이션에서 바로 이동하세요.
              스크롤하며 인사말, 연혁, 회원 소개를 만나볼 수 있습니다.
            </p>
          </div>
          <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <CardContent className="space-y-3 p-6 sm:p-8">
              <p className="text-sm font-semibold text-slate-600">
                오늘도 한 게임
              </p>
              <p className="text-2xl font-bold text-slate-900">
                코트에서 땀 흘리고, 온라인에서 연결되는 배토디
              </p>
              <p className="text-sm text-slate-600">
                상단 메뉴로 공지·일정·커뮤니티에 바로 접근하세요.
              </p>
            </CardContent>
          </Card>
        </section>

        <section id="greeting" className="space-y-6">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Greeting
              </p>
              <h3 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                협회장 인사말
              </h3>
            </div>
            <Link
              href="/greeting"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              자세히 보기 →
            </Link>
          </div>
          <Card className="overflow-hidden border-slate-200">
            <div className="h-1 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500" />
            <CardContent className="space-y-4 p-6 sm:p-8">
              <p className="text-lg leading-relaxed text-slate-700 sm:text-xl">
                배토디는 즐거운 배드민턴을 통해 건강과 유대를 키우는 모임입니다.
                모두가 주인공이 되는 코트, 함께 땀 흘리고 웃으며 성장합시다.
              </p>
              <p className="text-sm text-slate-500">— 협회장 드림</p>
            </CardContent>
          </Card>
        </section>

        <section id="history" className="space-y-6">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Timeline
              </p>
              <h3 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                배토디 출범 과정
              </h3>
            </div>
            <Link
              href="/history"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              자세히 보기 →
            </Link>
          </div>
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
        </section>

        <section id="members" className="space-y-6">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Members
              </p>
              <h3 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                회원 소개
              </h3>
            </div>
            <Link
              href="/members"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              자세히 보기 →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "홍길동",
                role: "협회장",
                note: "배드민턴 전략과 운영을 총괄합니다.",
                avatar: pixelAvatar("#0f172a", "#e2e8f0"),
              },
              {
                name: "김철수",
                role: "코치",
                note: "기술 클리닉과 연습 세션을 주도합니다.",
                avatar: pixelAvatar("#0ea5e9", "#e0f2fe"),
              },
              {
                name: "박영희",
                role: "회원",
                note: "즐겁게 참여하며 함께 성장합니다.",
                avatar: pixelAvatar("#22c55e", "#dcfce7"),
              },
              {
                name: "이민수",
                role: "회원",
                note: "신입 환영 담당, 첫 발을 돕습니다.",
                avatar: pixelAvatar("#f97316", "#fff7ed"),
              },
            ].map((member) => (
              <Card key={member.name} className="border-slate-200">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div
                    className="size-14 rounded-xl border border-slate-200"
                    style={{
                      backgroundImage: member.avatar,
                      imageRendering: "pixelated",
                    }}
                    aria-hidden
                  />
                  <div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-700">
                      {member.role}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  {member.note}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="flex w-full justify-between px-4 text-sm text-slate-500 sm:px-6 lg:px-10">
          <p>© 2025 배토디</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-700">
              Instagram
            </a>
            <a href="#" className="hover:text-slate-700">
              KakaoTalk
            </a>
            <a href="#" className="hover:text-slate-700">
              문의
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
