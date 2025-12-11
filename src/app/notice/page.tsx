"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/client";

type NoticeRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string | null;
};

export default function NoticePage() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState<NoticeRow[]>([]);

  // 작성 다이얼로그
  const [openNew, setOpenNew] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // 수정 다이얼로그
  const [openEdit, setOpenEdit] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      setSessionUserId(user?.id ?? null);
      fetchNotices();
    });
  }, []);

  async function fetchNotices() {
    setLoading(true);
    const { data, error } = await supabase
      .from("notices")
      .select("id,title,content,created_at,created_by")
      .order("created_at", { ascending: false });
    if (!error && data) setNotices(data as NoticeRow[]);
    setLoading(false);
  }

  async function createNotice() {
    if (!title.trim() || !content.trim() || !sessionUserId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("notices")
      .insert({
        title: title.trim(),
        content: content.trim(),
        created_by: sessionUserId,
      })
      .select("id,title,content,created_at,created_by")
      .single();
    setSaving(false);
    if (error) return;
    setNotices((prev) => (data ? [data as NoticeRow, ...prev] : prev));
    setOpenNew(false);
    setTitle("");
    setContent("");
  }

  function startEdit(n: NoticeRow) {
    setEditingNotice(n);
    setEditTitle(n.title);
    setEditContent(n.content);
    setOpenEdit(true);
  }

  async function updateNotice() {
    if (!editingNotice || !sessionUserId) return;
    if (editingNotice.created_by !== sessionUserId) {
      alert("본인이 작성한 공지만 수정할 수 있습니다.");
      return;
    }
    if (!editTitle.trim() || !editContent.trim()) return;
    setUpdating(true);
    const { error } = await supabase
      .from("notices")
      .update({ title: editTitle.trim(), content: editContent.trim() })
      .eq("id", editingNotice.id);
    setUpdating(false);
    if (error) return;
    setNotices((prev) =>
      prev.map((n) =>
        n.id === editingNotice.id
          ? { ...n, title: editTitle.trim(), content: editContent.trim() }
          : n,
      ),
    );
    setOpenEdit(false);
    setEditingNotice(null);
    setEditTitle("");
    setEditContent("");
  }

  async function deleteNotice(id: string, createdBy: string | null) {
    if (!sessionUserId) return;
    if (createdBy !== sessionUserId) {
      alert("본인이 작성한 공지만 삭제할 수 있습니다.");
      return;
    }
    const ok = confirm("이 공지를 삭제할까요?");
    if (!ok) return;
    // 낙관적 제거
    setNotices((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) {
      // 실패 시 복구
      fetchNotices();
    }
  }

  return (
    <div className="min-h-screen w-full bg-white text-slate-800">
      <header className="sticky top-0 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <h1 className="text-xl font-bold">공지</h1>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => setOpenNew(true)}>
              공지 작성
            </Button>
            <Link
              href="/home"
              className="text-sm text-slate-600 hover:underline"
            >
              홈으로
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-8 sm:px-6 lg:px-10">
        <div className="space-y-2">
          <p className="text-slate-600">동호회 공지와 업데이트를 확인하세요.</p>
        </div>
        <Separator className="my-6" />

        {loading && <p className="text-sm text-slate-500">불러오는 중...</p>}

        <div className="grid gap-4">
          {notices.map((n) => {
            const isMine = sessionUserId && n.created_by === sessionUserId;
            return (
              <Card key={n.id}>
                <CardHeader className="flex items-start justify-between">
                  <div>
                    <CardTitle>{n.title}</CardTitle>
                    <CardDescription>
                      {format(new Date(n.created_at), "yyyy-MM-dd")}
                    </CardDescription>
                  </div>
                  {isMine && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(n)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteNotice(n.id, n.created_by)}
                      >
                        삭제
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="text-sm whitespace-pre-wrap text-slate-800">
                  {/* 마크다운 제거: 일반 텍스트로 표시 */}
                  {n.content}
                </CardContent>
              </Card>
            );
          })}
          {!loading && notices.length === 0 && (
            <p className="text-sm text-slate-500">등록된 공지가 없습니다.</p>
          )}
        </div>
      </main>

      {/* 작성 다이얼로그 */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>공지 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="내용을 입력하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-40"
            />
            {/* 미리보기 제거 */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>
              취소
            </Button>
            <Button
              disabled={!title.trim() || !content.trim() || saving}
              onClick={createNotice}
            >
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>공지 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="제목"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <Textarea
              placeholder="내용을 입력하세요"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-40"
            />
            {/* 미리보기 제거 */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>
              취소
            </Button>
            <Button
              disabled={!editTitle.trim() || !editContent.trim() || updating}
              onClick={updateNotice}
            >
              {updating ? "수정 중..." : "수정"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
