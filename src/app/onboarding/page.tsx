"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, User2 } from "lucide-react";

const POSITIONS = [
  { key: "협회장", label: "협회장" }, // 협회장
  { key: "SNS·홍보 매니저", label: "SNS·홍보 매니저" }, // 부협회장
  { key: "운영·재정 매니저", label: "운영·재정 매니저" }, // 총무 담당
  { key: "정보 관리 매니저", label: "정보 관리 매니저" }, // SNS 담당
  { key: "맛집·회식 매니저", label: "맛집·회식 매니저" }, // 맛집 담당(행사/식음)
  { key: "일정 운영 매니저", label: "일정 운영 매니저" }, // 일정 담당
  { key: "회원", label: "회원" }, // 일반 회원
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [position, setPosition] = useState<string>(""); // key 저장
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        router.replace("/login");
        return;
      }
      setUid(u.id);
      const { data: profile } = await supabase
        .from("users")
        .select("name, position")
        .eq("id", u.id)
        .maybeSingle();

      setName(profile?.name || "");
      const pos = profile?.position?.trim();
      if (pos && pos !== "미지정") {
        router.replace("/home");
      }
    })();
  }, [router]);

  async function savePosition() {
    if (!uid || !position) return;
    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ position })
      .eq("id", uid);
    setSaving(false);
    if (!error) router.replace("/home");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
        <div className="w-full rounded-2xl border bg-white shadow-sm">
          {/* 헤더 */}
          <div className="border-b p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                <User2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-bold">프로필 온보딩</h1>
                <p className="text-xs text-slate-600">
                  커뮤니티에서 사용할 포지션을 선택하세요.
                </p>
              </div>
            </div>
            {/* 사용자 표시 */}
            <div className="mt-3 flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2">
              <span className="text-[12px] text-slate-600">이름</span>
              <span className="text-sm font-medium text-slate-900">
                {name || "알 수 없음"}
              </span>
            </div>
          </div>

          {/* 내용 */}
          <div className="p-6">
            <p className="mb-3 text-xs text-slate-600">
              포지션은 권한/표기용으로 사용됩니다. 나중에 설정에서 변경할 수
              있습니다.
            </p>

            {/* shadcn Select로 직책 선택 */}
            <div className="grid gap-2">
              <label className="text-xs text-slate-600">직책 선택</label>
              <Select
                value={position}
                onValueChange={(val) => setPosition(val)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="직책을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 선택 상태 */}
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-600">선택한 직책: </span>
              <span
                className={
                  position ? "font-medium text-slate-900" : "text-slate-400"
                }
              >
                {position || "없음"}
              </span>
            </div>
          </div>

          {/* 액션 */}
          <div className="flex gap-2 border-t p-6">
            <button
              onClick={() => router.replace("/home")}
              className="h-10 flex-1 rounded-md border border-slate-200 bg-white text-sm text-slate-800 hover:bg-slate-50"
            >
              나중에 하기
            </button>
            <button
              onClick={savePosition}
              disabled={!position || saving}
              className="h-10 flex-1 rounded-md bg-slate-900 text-sm text-white disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장하고 시작하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
