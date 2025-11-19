import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function proxy(request: Request) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Public routes (login, callback 등)
    const isPublic =
      pathname.startsWith('/login') || pathname.startsWith('/auth/callback');

    // supabase client 생성 (token 없는 상태도 허용)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 사용자 정보 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

    // 인증 안된 유저가 private route 접근하면 로그인으로
    if (!isPublic && !user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  } catch (e) {
    // proxy.ts 내부 에러는 라우터를 죽여버리므로
    // 절대 throw하면 안됨 -> 그냥 요청을 통과시킨다
    return NextResponse.next();
  }
}
