// Qısa/kriptik izahları dolğun, başa düşülən izahlarla əvəz edir.
// İşlətmə: node scripts/expand-explanations.js
const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '..', 'src', 'data', 'quizzes.json')
const qs = JSON.parse(fs.readFileSync(FILE, 'utf8'))

// ─── Hər qrammatika mövzusunun qayda izahı (bir dəfə, dolğun) ───
const RULES = {
  'To be': '"To be" feli (am/is/are) mübtədaya görə dəyişir: I → am; he/she/it → is; we/you/they → are.',
  'Articles a/an': 'Qeyri-müəyyən artikl: növbəti söz samit SƏSLƏ başlayırsa "a" (a book), sait SƏSLƏ başlayırsa "an" (an apple) işlənir.',
  'Plural nouns': 'Cəm qaydaları: adətən -s (books); -s/-ss/-sh/-ch/-x sonluqlu sözlərə -es (boxes); samit+y → -ies (cities); bəzi sözlər qaydasızdır (man → men, child → children).',
  'Subject pronouns': 'Mübtəda əvəzlikləri adların yerinə işlənir: kişi → he, qadın → she, əşya/heyvan → it, mən + başqaları → we, çoxluq → they.',
  'Present Simple': 'Present Simple gündəlik və təkrarlanan işlər üçündür. He/she/it ilə felə -s artırılır (she works). İnkar: don\'t / doesn\'t + əsas forma; sual: Do / Does.',
  "Can / can't": '"Can" bacarıq bildirir, inkarı "can\'t". Qayda: can/can\'t + felin əsas forması ("to"suz, "-s"siz): She can swim.',
  'There is / There are': 'Mövcudluq bildirir: tək və sayılmayan isimlərlə "There is", cəm isimlərlə "There are" işlənir.',
  'Possessives': 'Yiyəlik sözləri: my, your, his, her, its, our, their. Adlara \'s artırılır (Ali\'s book). Diqqət: "its" apostrofsuz yazılır — "it\'s" isə "it is" deməkdir.',
  'was / were': '"To be" felinin keçmiş zamanı: I/he/she/it → was; we/you/they → were.',
  'Past Simple': 'Past Simple bitmiş keçmiş hadisələr üçündür. Qaydalı fellərə -ed artırılır (worked), qaydasızlar əzbərlənir (go → went). İnkar: didn\'t + əsas forma; sual: Did.',
  'Present Continuous': 'Present Continuous məhz İNDİ baş verən işlər üçündür. Qayda: am/is/are + fel+ing (She is reading).',
  'Comparatives': 'Müqayisə dərəcəsi: qısa sifətlərə -er (big → bigger), uzun sifətlərə "more" (more beautiful) artırılır, sonra "than" gəlir. Qaydasız: good → better, bad → worse.',
  'Comparatives & Superlatives': 'Müqayisə: qısa sifətlər -er / the -est (big → bigger → the biggest), uzun sifətlər more / the most. Qaydasız: good → better → the best.',
  'going to': '"Going to" planlaşdırılmış gələcək üçündür. Qayda: am/is/are + going to + felin əsas forması (I am going to study).',
  'going to (future)': '"Going to" planlaşdırılmış gələcək üçündür. Qayda: am/is/are + going to + felin əsas forması (I am going to study).',
  'Adverbs of frequency': 'Tezlik zərfləri (always, usually, often, sometimes, never) adi feldən ƏVVƏL, "to be" felindən SONRA gəlir: She always works. / She is always late.',
  'much / many': 'Sayılmayan isimlərlə "much" (much water), sayılan cəm isimlərlə "many" (many books) işlənir.',
  'some / any': 'Təsdiq cümlələrində "some" (I have some money), inkar və sual cümlələrində "any" (Do you have any money?) işlənir.',
  'First Conditional': 'First Conditional real gələcək şərt bildirir. Qayda: If + Present Simple, ... will + əsas forma. Diqqət: "if" hissəsində "will" İŞLƏNMİR — If it rains, I will stay home.',
  'Modals': 'Modal fellər: must (məcburiyyət), should (məsləhət), might (ehtimal), can (bacarıq). Qayda: modal + felin əsas forması ("to"suz).',
  'Modals (should/must/might)': 'Modal fellər: must (məcburiyyət), should (məsləhət), might (ehtimal). Qayda: modal + felin əsas forması ("to"suz).',
  'Present Perfect': 'Present Perfect keçmişdə baş vermiş, indi ilə əlaqəli hadisələr üçündür. Qayda: have/has + felin 3-cü forması (I have seen). Açar sözlər: just, already, yet, ever, never.',
  'Present Perfect vs Past Simple': 'Konkret keçmiş vaxt varsa (yesterday, last year, ago) → Past Simple. Vaxt deyilmirsə və ya nəticə indiyə bağlıdırsa (just, already, ever) → Present Perfect.',
  'Past Continuous': 'Past Continuous keçmişdə müəyyən anda DAVAM EDƏN iş üçündür. Qayda: was/were + fel+ing (I was sleeping at 10 o\'clock).',
  'Passive voice': 'Məchul növ işi görən yox, işin özü vacib olanda işlənir. Qayda: "to be" (uyğun zamanda) + felin 3-cü forması (The letter was written).',
  'Relative clauses': 'Budaq cümlə bağlayıcıları: insan üçün who, əşya üçün which, hər ikisi üçün that, yer üçün where, sahiblik üçün whose.',
  'will vs going to': 'Anlıq qərar və ümumi proqnoz → will (I\'ll help you!). Əvvəlcədən plan və ya görünən sübuta əsaslanan proqnoz → going to (I\'m going to travel).',
}

// Qısaltmaları aç
function expandAbbrev(s) {
  return s
    .replace(/\bPS\b/g, 'Present Simple')
    .replace(/\bPC\b/g, 'Present Continuous')
    .replace(/\bPP\b/g, 'Present Perfect')
    .replace(/\bV1\b/g, 'felin əsas forması')
    .replace(/\bV2\b/g, 'felin 2-ci forması')
    .replace(/\bV3\b/g, 'felin 3-cü forması')
}

let gramCount = 0
let vocabCount = 0

for (const q of qs) {
  if (!q.explanation || q.explanation.length >= 60) continue
  if (q.explanation.includes('Bu sualda')) continue // artıq genişləndirilib

  const topic = (q.topic || '').replace(/^Qrammatika · /, '')

  if ((q.topic || '').startsWith('Qrammatika') && RULES[topic]) {
    // Qayda + bu sualın konkret izahı
    const hint = expandAbbrev(q.explanation.replace(/\.$/, ''))
    q.explanation = `${RULES[topic]}\n\nBu sualda: ${hint} → düzgün cavab «${q.correct}».`
    gramCount++
    continue
  }

  // Lüğət tipli qısa izahlar: "X = Y" və ya "\"X\" — Y."
  let m = q.explanation.match(/^([A-Za-z][A-Za-z' -]*) = (.+?)\.?$/)
  if (m) {
    q.explanation = `«${m[1].trim()}» sözünün mənası: «${m[2].trim()}». Düzgün cavab «${q.correct}»dır.`
    vocabCount++
    continue
  }
  m = q.explanation.match(/^"([^"]+)" — (.+?)\.?$/)
  if (m) {
    q.explanation = `«${m[1]}» ifadəsi «${m[2]}» deməkdir. İngilis dilində bu sözlər birlikdə işlənir — kollokasiya kimi əzbərlə.`
    vocabCount++
    continue
  }

  // True/False izahları: "Doğru. family = ailə" / "Yanlış. mother = ana"
  m = q.explanation.match(/^(Doğru|Yanlış)\. ([A-Za-z][A-Za-z' -]*) = (.+?)\.?$/)
  if (m) {
    q.explanation = m[1] === 'Doğru'
      ? `Doğru ✓ «${m[2]}» sözünün mənası həqiqətən «${m[3].trim()}»dır.`
      : `Yanlış ✗ «${m[2]}» sözünün əsl mənası: «${m[3].trim()}». Verilən tərif başqa sözə aiddir.`
    vocabCount++
    continue
  }

  // İngiliscə termin tərifi: "Merger — iki şirkətin birləşməsi."
  m = q.explanation.match(/^([A-Za-z][A-Za-z' -]*) — (.+?)\.?$/)
  if (m) {
    q.explanation = `«${m[1].trim()}» termini «${m[2].trim()}» deməkdir. Düzgün cavab «${q.correct}»dır.`
    vocabCount++
    continue
  }
}

fs.writeFileSync(FILE, JSON.stringify(qs, null, 2))
console.log(`Genişləndirildi: qrammatika ${gramCount}, lüğət ${vocabCount}`)
