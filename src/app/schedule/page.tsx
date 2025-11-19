import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SchedulePage() {
  return (
    <div className="min-h-screen w-full bg-white text-slate-800">
      <header className="sticky top-0 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <h1 className="text-xl font-bold">일정 관리</h1>
          <Link href="/home" className="text-sm text-slate-600 hover:underline">
            홈으로
          </Link>
        </div>
      </header>

      <main className="w-full px-4 py-8 sm:px-6 lg:px-10">
        <p className="text-slate-600">
          모임 일정 확인 및 참석 여부를 관리합니다.
        </p>
        <Separator className="my-6" />

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>정기 모임 #1</CardTitle>
              <CardDescription>
                2025-12-06 (토) 19:00 · ○○체육관
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-slate-600">
              <span>신청 8 / 16</span>
              <Button size="sm">참석</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>정기 모임 #2</CardTitle>
              <CardDescription>
                2025-12-13 (토) 19:00 · ○○체육관
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-slate-600">
              <span>신청 3 / 16</span>
              <Button size="sm" variant="outline">
                관심
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
