"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/home");
    });
  }, [router]);

  async function signInWithKakao() {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <h1 style={{ fontSize: "28px", fontWeight: "bold" }}>배토디 로그인</h1>

      <button
        onClick={signInWithKakao}
        style={{
          padding: "12px 20px",
          fontSize: "18px",
          borderRadius: "8px",
          backgroundColor: "#FEE500",
          border: "none",
          cursor: "pointer",
        }}
      >
        카카오 로그인
      </button>
    </div>
  );
}
