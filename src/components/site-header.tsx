"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserProfile = {
  id: string;
  name: string;
  nickname: string | null;
  position: string | null;
  avatar_url: string | null;
  email?: string;
};

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const hasFetched = useRef(false);

  const [checking, setChecking] = useState(true);
  const [sessionUser, setSessionUser] = useState<{
    id: string;
    email: string | null;
  } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [kakaoImageUrl, setKakaoImageUrl] = useState<string | null>(null);
  const [openProfile, setOpenProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const navItems = useMemo(
    () => [
      { href: "/notice", label: "공지" },
      { href: "/schedule", label: "일정관리" },
      { href: "/community", label: "커뮤니티" },
    ],
    [],
  );

  const introItems = useMemo(
    () => [
      { href: "/history", label: "연혁" },
      { href: "/greeting", label: "협회장 소개" },
      { href: "/members", label: "회원 소개" },
    ],
    [],
  );

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      setSessionUser(user ? { id: user.id, email: user.email ?? null } : null);

      if (!user) {
        setChecking(false);
        return;
      }

      const kakaoImg =
        user.user_metadata?.profile_image ||
        user.user_metadata?.profile_image_url ||
        user.user_metadata?.picture ||
        user.user_metadata?.avatar_url ||
        null;
      setKakaoImageUrl(kakaoImg);

      const { data: row } = await supabase
        .from("users")
        .select("id,name,nickname,position,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!row) {
        const inferredName =
          (user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.display_name ||
            user.email?.split("@")[0]) ??
          "회원";

        await supabase.from("users").insert({
          id: user.id,
          name: inferredName,
          nickname: null,
          position: null,
          avatar_url: kakaoImg,
        });

        setProfile({
          id: user.id,
          name: inferredName,
          nickname: null,
          position: null,
          avatar_url: kakaoImg,
          email: user.email ?? undefined,
        });
        setNicknameInput("");
      } else {
        if (!row.avatar_url && kakaoImg) {
          await supabase
            .from("users")
            .update({ avatar_url: kakaoImg })
            .eq("id", user.id);
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
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

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
      setError("저장 실패. 다시 시도하세요.");
    } else {
      setProfile((p) => (p ? { ...p, nickname: updated.nickname } : p));
      setOpenProfile(false);
    }
    setSaving(false);
  }

  const avatarSrc =
    profile?.avatar_url ||
    kakaoImageUrl ||
    (profile ? `/avatars/${profile.id}.png` : "");

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <Link href="/home" className="text-2xl font-bold">
            배토디 블로그
          </Link>

          <NavigationMenu className="flex flex-1 justify-start">
            <NavigationMenuList className="min-w-0 overflow-x-auto">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink
                      asChild
                      data-active={active}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        "px-3 sm:px-4",
                        active && "bg-slate-900 text-white hover:bg-slate-900",
                      )}
                    >
                      <Link href={item.href}>{item.label}</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
              <NavigationMenuItem className="hidden sm:block">
                <NavigationMenuTrigger
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "px-3 sm:px-4",
                    introItems.some((i) => i.href === pathname) &&
                      "bg-slate-900 text-white hover:bg-slate-900",
                  )}
                >
                  소개
                </NavigationMenuTrigger>
                <NavigationMenuContent className="sm:w-auto sm:min-w-[240px]">
                  <ul className="grid w-[220px] gap-4 p-3 sm:w-[240px]">
                    {introItems.map((link) => (
                      <li key={link.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={link.href}
                            className="block rounded-md px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            {link.label}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex items-center gap-2">
            {sessionUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus-visible:ring-ring flex items-center gap-3 rounded-full px-2 py-1 focus:outline-none focus-visible:ring-0">
                    <Avatar className="h-11 w-11">
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
            ) : (
              !checking && (
                <Button size="sm" onClick={() => router.push("/login")}>
                  로그인
                </Button>
              )
            )}
          </div>
        </div>
      </header>

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
                {profile?.position ?? "미지정"}
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
    </>
  );
}
