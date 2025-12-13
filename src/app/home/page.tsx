"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // 추가
import { supabase } from "@/lib/supabase/client";

// shadcn UI 컴포넌트 추가
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type UserProfile = {
  id: string;
  name: string;
  nickname: string | null;
  position: string | null;
  avatar_url: string | null; // 추가
  email?: string;
};

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [sessionUser, setSessionUser] = useState<{
    id: string;
    email: string | null;
  } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [kakaoImageUrl, setKakaoImageUrl] = useState<string | null>(null); // 카카오 프로필 이미지
  const [openProfile, setOpenProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 로그인 체크 & 프로필 로드
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      const user = data.session.user;
      setSessionUser({ id: user.id, email: user.email ?? null });

      // 카카오 프로필 이미지 후보 키들
      const kakaoImg =
        user.user_metadata?.profile_image ||
        user.user_metadata?.profile_image_url ||
        user.user_metadata?.picture ||
        user.user_metadata?.avatar_url ||
        null;
      setKakaoImageUrl(kakaoImg);

      const { data: row, error: selectErr } = await supabase
        .from("users")
        .select("id,name,nickname,position,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (selectErr) console.error(selectErr);

      if (!row) {
        const inferredName =
          (user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.display_name ||
            user.email?.split("@")[0]) ??
          "회원";

        const { error: insertErr } = await supabase.from("users").insert({
          id: user.id,
          name: inferredName,
          nickname: null,
          position: null,
          avatar_url: kakaoImg, // 최초 저장
        });
        if (insertErr) console.error(insertErr);

        setProfile({
          id: user.id,
          name: inferredName,
          nickname: null,
          position: null,
          avatar_url: kakaoImg,
          email: user.email ?? undefined,
        });
      } else {
        // DB에 없고 카카오 이미지가 있으면 업데이트
        if (!row.avatar_url && kakaoImg) {
          const { error: updateAvatarErr } = await supabase
            .from("users")
            .update({ avatar_url: kakaoImg })
            .eq("id", user.id);
          if (updateAvatarErr) console.error(updateAvatarErr);
          row.avatar_url = kakaoImg;
        }

        setProfile({
          id: row.id,
          name: row.name,
          nickname: row.nickname,
          position: row.position,
          avatar_url: row.avatar_url,
          email: user.email ?? undefined,
        });
        setNicknameInput(row.nickname ?? "");
      }

      setChecking(false);
    });
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // 닉네임만 수정 (화면 표시는 항상 name 사용)
  async function handleSaveNickname() {
    if (!sessionUser) return;
    setSaving(true);
    setError(null);

    const nickname = nicknameInput.trim() || null;

    const { data: updated, error: updateErr } = await supabase
      .from("users")
      .update({ nickname })
      .eq("id", sessionUser.id)
      .select("id,nickname")
      .single();

    if (updateErr) {
      console.error(updateErr);
      setError("저장 실패. 다시 시도하세요.");
    } else {
      setProfile((p) => (p ? { ...p, nickname: updated.nickname } : p));
      setOpenProfile(false);
    }
    setSaving(false);
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // 화면 표시용 이름은 항상 name
  const displayName = profile?.name ?? "회원";
  const positionDisplay = profile?.position ?? "미지정";
  const avatarSrc =
    profile?.avatar_url ||
    kakaoImageUrl ||
    (profile ? `/avatars/${profile.id}.png` : "");

  return (
    <div className="min-h-screen w-full bg-white text-[15px] text-slate-800 sm:text-base">
      <header className="sticky top-0 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-10">
          <h1 className="text-2xl font-bold">배토디 블로그</h1>
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus-visible:ring-ring flex items-center gap-3 rounded-full px-2 py-1 focus:outline-none focus-visible:ring-0">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={avatarSrc} alt={profile?.name} />
                    <AvatarFallback className="text-lg">
                      {profile?.name?.slice(0, 1) ?? "유"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>계정</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push("/mypage")}>
                  마이페이지
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setNicknameInput(profile?.nickname ?? "");
                    setOpenProfile(true);
                  }}
                >
                  프로필 설정
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-600 focus:text-red-700"
                >
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <section className="w-full px-4 py-16 sm:px-6 lg:px-10">
        <div className="space-y-4 text-left">
          <h2 className="text-5xl leading-tight font-extrabold tracking-tight">
            배토디 — 배드민턴 토할때까지 디질때까지
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            일정 관리, 참여 투표, 공지 확인을 한 곳에서.
          </p>
        </div>
        <Separator className="my-10" />
      </section>

      <section className="grid w-full gap-6 px-4 pb-24 sm:px-6 md:grid-cols-3 lg:px-10">
        <Link href="/notice" className="group block focus:outline-none">
          <Card className="group-focus:ring-ring transition group-focus:ring-2 group-focus:ring-offset-2 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">공지</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                동호회 주요 안내 및 업데이트
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 sm:text-base">
              일정 및 운영 공지가 업로드되면 여기에서 확인 가능합니다.
            </CardContent>
          </Card>
        </Link>
        <Link href="/schedule" className="group block focus:outline-none">
          <Card className="group-focus:ring-ring transition group-focus:ring-2 group-focus:ring-offset-2 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">일정 관리</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                모임 참석 및 투표
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 sm:text-base">
              참석 여부, 날짜 투표, 코트 배정 등 기능을 확장할 수 있습니다.
            </CardContent>
          </Card>
        </Link>
        <Link href="/community" className="group block focus:outline-none">
          <Card className="group-focus:ring-ring transition group-focus:ring-2 group-focus:ring-offset-2 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">커뮤니티</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                기록 및 교류
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 sm:text-base">
              출석, 경기 기록, 사진 공유 기능을 점진적으로 추가할 예정입니다.
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Footer */}
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

      {/* 프로필 Dialog (shadcn) */}
      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        <DialogContent className="text-[15px] sm:max-w-md sm:text-base">
          <DialogHeader>
            <DialogTitle>프로필 설정</DialogTitle>
            <DialogDescription>
              이름은 고정, 닉네임만 수정 가능합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">이름</Label>
              <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
                {profile?.name}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="nickname" className="text-xs">
                닉네임
              </Label>
              <Input
                id="nickname"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="닉네임 입력"
              />
              <p className="text-[11px] text-slate-500">
                미입력 시 닉네임은 표시되지 않습니다.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">직책</Label>
              <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
                {positionDisplay}
              </div>
              <p className="text-[11px] text-slate-500">
                운영진이 지정한 역할(예: 운영진, 회원).
              </p>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenProfile(false)}>
              닫기
            </Button>
            <Button onClick={handleSaveNickname} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
