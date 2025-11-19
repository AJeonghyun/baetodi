"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function MyPage() {
  return (
    <div className="min-h-screen w-full bg-white text-slate-800">
      <header className="sticky top-0 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-10">
          <h1 className="text-xl font-bold">마이페이지</h1>
          <Link href="/home" className="text-sm text-slate-600 hover:underline">
            홈으로
          </Link>
        </div>
      </header>

      <main className="w-full space-y-10 px-4 py-12 sm:px-6 lg:px-10">
        <section>
          <h2 className="text-2xl font-semibold">내 활동 요약</h2>
          <p className="mt-2 text-sm text-slate-600">
            출석, 경기 기록, 신청 현황 등이 여기에 표시될 예정입니다.
          </p>
          <Separator className="my-6" />
        </section>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>출석</CardTitle>
              <CardDescription>최근 4회</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              추후 집계 데이터 연결.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>경기 기록</CardTitle>
              <CardDescription>복식/단식</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              기록 기능 연동 예정.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>참여 신청</CardTitle>
              <CardDescription>다가오는 일정</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              일정 신청 목록 표시 예정.
            </CardContent>
          </Card>
        </div>
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
