import { supabase } from './supabase/client';

export async function ensureUserRow() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

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
  return user.id;
}
