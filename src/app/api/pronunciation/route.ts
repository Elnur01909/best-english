import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Ortaq Azure açarı ilə aylıq pulsuz qiymətləndirmə limiti (hər user üçün)
// Hesab: Azure Free F0 = 5 audio-saat/ay (~18 000 san) ÷ ~4 san/cəhd ≈ 4500 cəhd/ay
//        4500 ÷ 20 ≈ ~225 aktiv istifadəçi/ay rahat sığır (bufer ilə ~150-200 real)
const MONTHLY_LIMIT = 20

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const audio = form.get('audio') as File | null
    const referenceText = String(form.get('referenceText') ?? '')
    const accessToken = String(form.get('accessToken') ?? '')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const azureKey = process.env.AZURE_SPEECH_KEY
    const azureRegion = process.env.AZURE_SPEECH_REGION

    if (!azureKey || !azureRegion || !serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'NO_SHARED_KEY' }, { status: 503 })
    }
    if (!accessToken) {
      return NextResponse.json({ error: 'NO_AUTH' }, { status: 401 })
    }
    if (!audio || !referenceText) {
      return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // İstifadəçini token-dən təsdiqlə
    const { data: userData, error: userErr } = await admin.auth.getUser(accessToken)
    if (userErr || !userData.user) {
      return NextResponse.json({ error: 'BAD_AUTH' }, { status: 401 })
    }
    const userId = userData.user.id
    const month = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

    // Bu ayın sayğacını oxu
    const { data: usage } = await admin
      .from('pronunciation_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle()

    const count = usage?.count ?? 0
    if (count >= MONTHLY_LIMIT) {
      return NextResponse.json({ error: 'SHARED_LIMIT', limit: MONTHLY_LIMIT }, { status: 429 })
    }

    // Klient artıq 16kHz/mono/16-bit PCM WAV-a çevirib göndərir
    const wavBuffer = Buffer.from(await audio.arrayBuffer())

    const pronAssessmentConfig = Buffer.from(
      JSON.stringify({
        ReferenceText: referenceText,
        GradingSystem: 'HundredMark',
        Granularity: 'Phoneme',
        Dimension: 'Comprehensive',
        EnableMiscue: true,
      })
    ).toString('base64')

    const azureUrl = `https://${azureRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`

    const azureRes = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Pronunciation-Assessment': pronAssessmentConfig,
        Accept: 'application/json',
      },
      body: wavBuffer,
    })

    if (!azureRes.ok) {
      return NextResponse.json({ error: 'AZURE_ERROR', status: azureRes.status }, { status: 502 })
    }

    const data = await azureRes.json()
    if (data.RecognitionStatus && data.RecognitionStatus !== 'Success') {
      return NextResponse.json({ error: 'NO_SPEECH' }, { status: 422 })
    }

    const best = data.NBest?.[0]
    if (!best) {
      return NextResponse.json({ error: 'NO_RESULT' }, { status: 502 })
    }

    const pa = best.PronunciationAssessment ?? {}
    const words = (best.Words ?? []).map((w: any) => ({
      word: w.Word,
      accuracyScore: w.PronunciationAssessment?.AccuracyScore ?? 0,
      errorType: w.PronunciationAssessment?.ErrorType ?? 'None',
    }))

    // Sayğacı artır
    await admin
      .from('pronunciation_usage')
      .upsert({ user_id: userId, month, count: count + 1 }, { onConflict: 'user_id,month' })

    return NextResponse.json({
      accuracyScore: pa.AccuracyScore ?? 0,
      fluencyScore: pa.FluencyScore ?? 0,
      completenessScore: pa.CompletenessScore ?? 0,
      pronScore: pa.PronScore ?? 0,
      words,
      recognizedText: best.Display ?? best.Lexical ?? '',
      remaining: MONTHLY_LIMIT - (count + 1),
    })
  } catch {
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
