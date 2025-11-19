import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function CommunityPage() {
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
            <CardHeader>
              <CardTitle>출석 현황</CardTitle>
              <CardDescription>이번 달</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              출석 집계가 표시됩니다.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>경기 기록</CardTitle>
              <CardDescription>복식/단식</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              경기 결과를 기록하세요.
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
        </div>
      </main>
    </div>
  );
}
