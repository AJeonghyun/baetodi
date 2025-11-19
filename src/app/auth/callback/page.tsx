'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

async function ensureUserRow() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return;

  // users 테이블에 없으면 삽입 (id = auth user id)
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();

  if (!existing) {
    await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.user_metadata?.nickname || null,
      phone: user.user_metadata?.phone || null,
    });
  }
}

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      // If no code is present, try to read an existing session or redirect.
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          ensureUserRow().finally(() => router.replace('/home'));
        } else {
          router.replace('/home');
        }
      });
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(ensureUserRow)
      .finally(() => router.replace('/home'));
  }, [router]);

  return <p>로그인 처리 중...</p>;
}
