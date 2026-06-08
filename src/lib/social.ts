// ─── Dostluq Sistemi ──────────────────────────────────
// İstifadəçilər email ilə bir-birini tapıb dostluq sorğusu göndərə,
// qəbul/rədd edə və dost siyahısını idarə edə bilər.
import { supabase } from './supabase'
import type { FriendProfile, FriendRequest } from '@/types'

// Email ilə tam-uyğun istifadəçi axtar (özünü və artıq dost olduqlarını çıxar)
export async function searchUserByEmail(email: string, myUserId: string) {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return { data: null, error: null }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, display_name, level, toles_level, streak')
    .ilike('email', trimmed)
    .neq('id', myUserId)
    .limit(1)
    .maybeSingle()

  return { data: data as FriendProfile | null, error }
}

// Dostluq sorğusu göndər
export async function sendFriendRequest(senderId: string, receiverId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' })
    .select()
    .single()
  return { data: data as FriendRequest | null, error }
}

// Mənə gələn gözləyən sorğular
export async function getIncomingRequests(userId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*, sender:sender_id(id, email, display_name, level, toles_level, streak)')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  return { data, error }
}

// Mənim göndərdiyim, hələ cavablanmamış sorğular
export async function getOutgoingRequests(userId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*, receiver:receiver_id(id, email, display_name, level, toles_level, streak)')
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  return { data, error }
}

// Sorğunu qəbul et / rədd et
export async function respondToFriendRequest(requestId: string, accept: boolean) {
  const { data, error } = await supabase
    .from('friend_requests')
    .update({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single()
  return { data: data as FriendRequest | null, error }
}

// Göndərilmiş, hələ qəbul olunmamış sorğunu ləğv et
export async function cancelFriendRequest(requestId: string) {
  const { error } = await supabase.from('friend_requests').delete().eq('id', requestId)
  return { error }
}

// Qəbul olunmuş dostların siyahısı (hər iki istiqamətdə axtarır)
export async function getFriends(userId: string): Promise<{ data: FriendProfile[]; error: any }> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      sender_id, receiver_id,
      sender:sender_id(id, email, display_name, level, toles_level, streak),
      receiver:receiver_id(id, email, display_name, level, toles_level, streak)
    `)
    .eq('status', 'accepted')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

  if (error || !data) return { data: [], error }

  // Hər cərgədən qarşı tərəfin profilini götür
  const friends: FriendProfile[] = data.map((row: any) =>
    row.sender_id === userId ? row.receiver : row.sender
  ).filter(Boolean)

  return { data: friends, error: null }
}
