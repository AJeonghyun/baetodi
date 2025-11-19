import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function NoticePage() {
  return (
    <div className="min-h-screen w-full bg-white text-slate-800">
      <header className="sticky top-0 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <h1 className="text-xl font-bold">공지</h1>
          <Link href="/home" className="text-sm text-slate-600 hover:underline">
            홈으로
          </Link>
        </div>
      </header>

      <main className="w-full px-4 py-8 sm:px-6 lg:px-10">
        <div className="space-y-2">
          <p className="text-slate-600">동호회 공지와 업데이트를 확인하세요.</p>
        </div>
        <Separator className="my-6" />

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>신규 회원 OT 안내</CardTitle>
              <CardDescription>2025-12-05</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              이번 주 토요일 연습 전에 간단한 오리엔테이션이 진행됩니다.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>코트 예약 변경</CardTitle>
              <CardDescription>2025-12-03</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              체육관 공사로 인해 2코트만 사용 가능합니다.
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
