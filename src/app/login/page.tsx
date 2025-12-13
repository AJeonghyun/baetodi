"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      // 로그인되어 있으면 홈으로 이동 (온보딩 분기는 콜백 페이지에서 처리 중)
      router.replace("/home");
    });
  }, [router]);

  async function signInWithKakao() {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white shadow-sm">
        {/* 헤더 */}
        <div className="border-b p-6">
          <div className="mx-auto flex w-full flex-col items-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
              <span className="text-lg font-bold">B</span>
            </div>
            <h1 className="text-xl font-bold">배토디 로그인</h1>
            <p className="mt-1 text-xs text-slate-600">
              커뮤니티 참여를 위해 카카오로 로그인하세요.
            </p>
          </div>
        </div>

        {/* 본문 */}
        <div className="p-6">
          <button
            onClick={signInWithKakao}
            className="flex h-10 w-full items-center justify-center rounded-md bg-[#FEE500] text-sm font-medium text-black shadow-sm hover:brightness-95"
          >
            카카오로 로그인
          </button>

          {/* 기능 안내 */}
          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
            <p>로그인 후 포지션을 선택하면 커뮤니티 기능을 사용할 수 있어요.</p>
            <ul className="mt-1 list-disc pl-4">
              <li>경기 기록 추가/조회</li>
              <li>일정 투표와 출석</li>
              <li>활동 사진 공유</li>
            </ul>
          </div>
        </div>

        {/* 푸터 */}
        <div className="border-t p-6">
          <p className="text-center text-[11px] text-slate-500">
            로그인 과정에서 카카오 닉네임이 프로필에 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
