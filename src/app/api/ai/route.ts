import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Ortaq açarla gündəlik pulsuz mesaj limiti (hər user üçün)
const DAILY_LIMIT = 15
const MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.0-flash']

export async function POST(req: Request) {
  try {
    const { systemPrompt, messages, accessToken } = await req.json()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const geminiKey = process.env.GEMINI_API_KEY

    if (!geminiKey || !serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'NO_SHARED_KEY' }, { status: 503 })
    }
    if (!accessToken) {
      return NextResponse.json({ error: 'NO_AUTH' }, { status: 401 })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // İstifadəçini token-dən təsdiqlə
    const { data: userData, error: userErr } = await admin.auth.getUser(accessToken)
    if (userErr || !userData.user) {
      return NextResponse.json({ error: 'BAD_AUTH' }, { status: 401 })
    }
    const userId = userData.user.id
    const today = new Date().toISOString().slice(0, 10)

    // Bugünkü sayğacı oxu
    const { data: usage } = await admin
      .from('ai_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('day', today)
      .maybeSingle()

    const count = usage?.count ?? 0
    if (count >= DAILY_LIMIT) {
      return NextResponse.json({ error: 'SHARED_LIMIT', limit: DAILY_LIMIT }, { status: 429 })
    }

    // Gemini-yə sorğu (modelləri sıra ilə)
    const body = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: (messages || []).map((m: { role: string; text: string }) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
    })

    let text = ''
    for (const model of MODELS) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
      )
      if (r.ok) {
        const d = await r.json()
        text = d?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        if (text) break
      }
      // 429/404 → növbəti modelə keç
    }

    if (!text) {
      return NextResponse.json({ error: 'AI_ERROR' }, { status: 502 })
    }

    // Sayğacı artır
    await admin
      .from('ai_usage')
      .upsert({ user_id: userId, day: today, count: count + 1 }, { onConflict: 'user_id,day' })

    return NextResponse.json({ text: text.trim(), remaining: DAILY_LIMIT - (count + 1) })
  } catch {
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
