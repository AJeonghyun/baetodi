"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type VideoRow = {
  id: string;
  url: string;
  video_id: string;
  title: string | null;
  created_by: string | null;
  created_at: string;
};

function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be"))
      return u.pathname.split("/")[1] || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/");
      const i = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (i >= 0 && parts[i + 1]) return parts[i + 1];
    }
    return null;
  } catch {
    return null;
  }
}

function ytThumb(id: string) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

async function fetchOEmbedTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.title === "string" ? data.title : null;
  } catch {
    return null;
  }
}

export default function CommunityVideosPage() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [oembedTitlePreview, setOembedTitlePreview] = useState<string | null>(
    null,
  );
  const [oembedLoading, setOembedLoading] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  // URL 입력 시 즉시 oEmbed로 제목 프리뷰 가져오기
  useEffect(() => {
    const url = newUrl.trim();
    const valid = !!parseYouTubeId(url);
    if (!valid) {
      setOembedTitlePreview(null);
      return;
    }
    let active = true;
    setOembedLoading(true);
    fetchOEmbedTitle(url)
      .then((t) => {
        if (!active) return;
        setOembedTitlePreview(t);
      })
      .finally(() => active && setOembedLoading(false));
    return () => {
      active = false;
    };
  }, [newUrl]);

  async function fetchVideos() {
    const { data } = await supabase
      .from("community_videos")
      .select("id,url,video_id,title,created_by,created_at")
      .order("created_at", { ascending: false });

    const rows = (data || []) as VideoRow[];
    setVideos(rows);

    // 제목이 없는 항목은 비동기로 보강
    const missing = rows.filter((r) => !r.title);
    for (const r of missing) {
      const t = await fetchOEmbedTitle(r.url);
      if (t) {
        await supabase
          .from("community_videos")
          .update({ title: t })
          .eq("id", r.id);
        // 로컬 상태도 즉시 반영
        setVideos((prev) =>
          prev.map((p) => (p.id === r.id ? { ...p, title: t } : p)),
        );
      }
    }
  }

  async function addVideo() {
    const url = newUrl.trim();
    const id = parseYouTubeId(url);
    if (!id) return;
    setSaving(true);

    // oEmbed 제목 우선 시도(입력시 프리뷰가 있다면 재사용)
    const title = oembedTitlePreview ?? (await fetchOEmbedTitle(url));

    const { data: userData } = await supabase.auth.getUser();
    const createdBy = userData?.user?.id || null;

    const payload = {
      url,
      video_id: id,
      title: title || null, // oEmbed가 없으면 null
      created_by: createdBy,
    };

    const { error } = await supabase.from("community_videos").insert(payload);
    setSaving(false);
    if (!error) {
      setNewUrl("");
      setOembedTitlePreview(null);
      fetchVideos(); // 목록 새로고침 → 카드에 제목 바로 표시
    }
  }

  async function removeVideo(id: string) {
    await supabase.from("community_videos").delete().eq("id", id);
    fetchVideos();
  }

  async function backfillTitles() {
    // 제목이 비어있는 항목만 채움
    const targets = videos.filter((v) => !v.title);
    for (const v of targets) {
      const t = await fetchOEmbedTitle(v.url);
      if (!t) continue;
      await supabase
        .from("community_videos")
        .update({ title: t })
        .eq("id", v.id);
    }
    await fetchVideos();
  }

  return (
    <div className="min-h-screen w-full bg-white text-slate-800">
      <header className="sticky top-0 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <h1 className="text-xl font-bold">배드민턴 영상 아카이브</h1>
          <Link
            href="/community"
            className="text-sm text-slate-600 hover:underline"
          >
            커뮤니티로
          </Link>
        </div>
      </header>

      <main className="w-full px-4 py-8 sm:px-6 lg:px-10">
        <p className="text-slate-600">
          유튜브 링크로 배드민턴 정보를 공유하고 아카이빙합니다.
        </p>
        <Separator className="my-6" />

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            placeholder="예: https://www.youtube.com/watch?v=XXXXXXXX"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <Button
            disabled={!parseYouTubeId(newUrl) || saving || oembedLoading}
            onClick={addVideo}
          >
            {saving ? "추가 중..." : "영상 추가"}
          </Button>
        </div>

        {/* 제목 프리뷰 표시 */}
        {parseYouTubeId(newUrl) && (
          <div className="mt-2 text-xs text-slate-600">
            {oembedLoading
              ? "제목 불러오는 중..."
              : oembedTitlePreview
                ? `제목: ${oembedTitlePreview}`
                : "제목을 가져올 수 없습니다(추가 시 기본 제목 표시)."}
          </div>
        )}

        {/* 예: 상단 입력 옆에 보강 버튼(관리용) */}
        {/* <Button variant="outline" onClick={backfillTitles}>제목 보강</Button> */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.length === 0 ? (
            <p className="text-sm text-slate-600">
              아직 추가된 영상이 없습니다.
            </p>
          ) : (
            videos.map((v) => (
              <div key={v.id} className="rounded-lg border">
                <a
                  href={`https://www.youtube.com/watch?v=${v.video_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full overflow-hidden rounded-t-lg"
                >
                  {/* 4:3 비율 컨테이너 + contain */}
                  <div className="aspect-[4/3] w-full bg-black">
                    <img
                      src={ytThumb(v.video_id)}
                      alt="YouTube thumbnail"
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </a>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium text-slate-800">
                    {v.title || "배드민턴 정보 영상"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new URL(v.url).hostname}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-600 underline"
                    >
                      유튜브에서 보기
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeVideo(v.id)}
                      className="ml-auto"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
