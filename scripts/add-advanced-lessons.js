const fs = require('fs');
const lessons = require('../src/data/lessons.json');

const newLessons = [
  {
    id: 23,
    title: "Dərs 23: Terms of Art vs Legalese — Hüquqi Dil Mədəniyyəti",
    description: "Advanced hüquqi yazım: 'term of art' ilə 'legalese' arasındakı fərq, Plain English hərəkatı və müasir müqavilə yazımının 6 əsas qaydası.",
    content: `Bu dərsdə iki əsas anlayış araşdırılır.

TERMS OF ART — məhkəmə tərəfindən dəqiq şəkildə müəyyən edilmiş mənası olan əvəzsiz hüquqi sözlər: məsələn, 'consideration', 'indemnify', 'novation'. Bunları daha sadə sözlərlə əvəz etmək olmaz — çünki məhkəmə onların məhz bu forması üzrə interpretasiya yaratmışdır.

LEGALESE — daha sadə alternativlər mövcud olduğu halda istifadə edilən lazımsız mürəkkəb dil. Nümunə: 'notwithstanding' əvəzinə 'despite'; 'forthwith' əvəzinə 'immediately'; 'aforementioned' əvəzinə 'previously mentioned'.

Texas hakimi Lynn Hughes legalese-i belə tərif edib: "tənbəllik, qarışıqlıq, qorxaqlıq, cəhalət, laqeydlik və mədəni yoxsulluğun məhsulu."

PLAIN ENGLISH YAZIMININ 6 QAYDASI:
1. Görüntüyü artırmaq üçün mürəkkəb söz işlətmə — 'furnish' yox, 'provide' işlət.
2. Müasir müqavilələrdən Latın ifadələrini çıxar.
3. Köhnəlmiş sözləri sil: 'heretofore', 'hereby', 'foregoing' — müasir qarşılıqlarını işlət.
4. Sinonimlər siyahısından istifadə etmə: 'alter, amend, vary or modify' əvəzinə bir söz seç.
5. Cümlələri qısa saxla.
6. Aktiv səs işlət: "The Buyer must pay by 9 February" — passiv deyil.

MƏŞQ: Florida ev satışı müqaviləsindəki bu parçanı Plain English-ə çevir:
"WHEREAS, Seller is desirous of selling the Property as hereinafter defined in Paragraph 2 hereof and Purchaser is desirous of purchasing the Property on the terms and conditions hereinafter set forth…"
Cavab: "The Seller agrees to sell the Property and the Buyer agrees to buy it on the terms set out below."`,
    terms: [3, 17, 20, 358, 364, 370, 379, 396],
    duration: 40,
    level: "A",
    objectives: [
      "'Term of art' ilə 'legalese' arasındakı fərqi konkret nümunələrlə izah et",
      "Plain English yazımının 6 qaydasını tətbiq et",
      "Klassik legalese ifadələrini (notwithstanding, forthwith, aforementioned) sadə dillə yenidən yaz"
    ],
    immersionLinks: [
      {
        type: "article",
        title: "Plain English in Legal Drafting",
        url: "https://www.lawteacher.net/free-law-essays/contract-law/"
      },
      {
        type: "youtube",
        title: "Plain English vs Legalese — Legal Drafting",
        url: "https://www.youtube.com/results?search_query=plain+english+legal+drafting"
      },
      {
        type: "podcast",
        title: "Legal English Boost — Advanced Writing",
        url: "https://legalenglishboost.com/"
      }
    ]
  },

  {
    id: 24,
    title: "Dərs 24: Süni İntellekt və Hüquq Peşəsi",
    description: "MIT Technology Review mənbəyinə əsasən: AI-nin hüquq peşəsinə təsiri, COIN, CaseIQ, McKinsey 22% avtomatlaşdırma hesabatı və gələcəyin vəkili.",
    content: `Bu dərsdə süni intellektin (AI) hüquq peşəsinə təsiri araşdırılır.

ƏSAS ANLAYIŞLAR:

Document Discovery Tools — milyonlarla sənəd üzərində öyrədilmiş AI alətləri; hüquqi iş üçün aktual mənbələri saniyələr içində müəyyən edir.

COIN (Contract Intelligence) — JPMorgan Chase-in müqavilə analiz sistemi; hüquqi köməkçilərin 360,000 saat ərzində etdiyi işi saniyələr içində yerinə yetirir.

CaseIQ — 'virtual associate'; məhkəmə brifinqini analiz edərək inkişaf tövsiyələri verir.

McKinsey hesabatına görə vəkilin işinin 22%-i avtomatlaşdırıla bilər.

MÜZAKİRƏ SUALLAR:
1. AI bir insan vəkili qədər dəqiq araşdırma apara bilərmi?
2. McKinsey 22% avtomatlaşdırmanı proqnozlaşdırır — siz bunu xoş qarşılayırsınız, yoxsa narahat edir?
3. COIN 360,000 saatı saniyələrə sıxışdırır — bu effektivlik iş itirilməsini əsaslandırırmı?
4. AI gənc vəkillərin təlim imkanlarını azaldırsa, gənc hüquqşünaslar necə 'əlavə dəyər' yarada bilər?

ƏSAS LÜĞƏT:
• augment — bir şeyi artırmaq, inkişaf etdirmək
• automate — texnologiya ilə insan müdaxiləsi olmadan iş yerinə yetirmək
• meticulous — çox diqqətli; detalları dəqiqliklə izləyən
• algorithm — kompüterin problemi həll etmək üçün izlədiyi qaydalar toplusu
• redundant — artıq lazımsız (işçi və ya iş haqqında)
• uptake — bir şeyin mənimsənilmə sürəti
• paralegal — hüquqşünas deyil, lakin vəkilə kömək edən hüquq bilikli şəxs
• repository — geniş məlumat arxivi`,
    terms: [35, 36, 40, 41, 91, 92, 382, 383],
    duration: 40,
    level: "A",
    objectives: [
      "AI-nin hüquq peşəsinə əsas təsirlərini (COIN, CaseIQ, document discovery) izah et",
      "Avtomatlaşdırma ilə insan ekspertizasının hüquqda balansını müzakirə et",
      "Dərsin 8 əsas texnologiya lüğəti terminini (augment, algorithm, redundant...) cümlələrdə işlət"
    ],
    immersionLinks: [
      {
        type: "article",
        title: "AI and the Law — MIT Technology Review",
        url: "https://www.technologyreview.com/topic/artificial-intelligence/"
      },
      {
        type: "youtube",
        title: "AI in Legal Practice — How Law is Changing",
        url: "https://www.youtube.com/results?search_query=artificial+intelligence+legal+profession"
      },
      {
        type: "podcast",
        title: "Legal Talk Network — AI and Law",
        url: "https://legaltalknetwork.com/"
      }
    ]
  },

  {
    id: 25,
    title: "Dərs 25: Hüquqi Kollokasiyalar — Düzgün Söz Birləşmələri",
    description: "Güclü və zəif kollokasiyalar; hüquqi kontekstdə verb+noun, adjective+noun nümunələri; Snapchat davası üzərindən kollokasiya məşqi.",
    content: `Bu dərsdə hüquqi İngiliscədəki kollokasiyalar — bir-birinə doğal yanaşan söz cütləri — öyrənilir.

KOLLOKASİYA NEDİR?
Kollokasiya bir-birini 'tutan' söz cütü və ya qrupudur. Yanlış kollokasiya işlətmək ingilisnizi qeyri-təbii edir, hətta məna aydın olsa belə.

Düzgün: "to make a decision" / "to adjourn a case" / "to mitigate a loss"
Yanlış: "to do a decision" / "to suspend a case" / "to reduce a loss"

GÜCLÜ KOLLOKASİYALAR — az alternativ var: "to mitigate a loss"
ZƏİF KOLLOKASİYALAR — bir neçə variant işləyir: "to fulfil / perform / carry out an obligation"

ƏSAS HÜQUQİ KOLLOKASİYALAR CƏDVƏLI:
Verb + Noun: breach a contract / adjourn a trial / levy a tax
Phrasal Verb: carry out an obligation / run up a debt / bring up a subject
Adjective + Noun: a wide range / fierce competition / a final offer
Verb + Adverb: to fall sharply / to closely resemble / to fail miserably

SNAPCHAT DAVASI KOLLOKASİYALARI (Frank Brown v Thomas Spiegel, 2011-2014):
1. to launch a new business
2. to assert your legal right
3. to instruct a law firm
4. to incorporate a company
5. to bring a claim against someone
6. to deny an allegation
7. to settle a claim out of court
8. to resolve a dispute
9. to disclose information
10. to reach a settlement

COUNTY COURT KOLLOKASİYALARI (Jo Rider v Harry Spencer):
• outstanding sum — hələ ödənilməmiş məbləğ
• due date — ödəniş son tarixi
• fill out a claim form / submit to the court / issue the claim
• served on the defendant — sənədlər rəsmi çatdırılır
• incur legal fees — hüquqi xərclər yaranır`,
    terms: [4, 6, 8, 35, 37, 89, 90, 381, 406, 432],
    duration: 40,
    level: "A",
    objectives: [
      "Güclü və zəif kollokasiya arasındakı fərqi izah et",
      "10 Snapchat davası kollokasiyasını cümlələrdə düzgün işlət",
      "County Court prosesini ifadə edən kollokasiyaları (issue a claim, serve on the defendant, incur costs) mənimsə"
    ],
    immersionLinks: [
      {
        type: "article",
        title: "Legal English Collocations — LawTeacher",
        url: "https://www.lawteacher.net/"
      },
      {
        type: "youtube",
        title: "Legal English Collocations — Advanced",
        url: "https://www.youtube.com/results?search_query=legal+english+collocations+advanced"
      },
      {
        type: "podcast",
        title: "Legal English Boost — Collocation Practice",
        url: "https://legalenglishboost.com/"
      }
    ]
  },

  {
    id: 26,
    title: "Dərs 26: Hüquqi Preposisiyalar — Düzgün İstifadə",
    description: "Kommersiya müqavilələrindəki 10 əsas prepozisiya ifadəsi; ümumi xətalar və düzgün formları; məşq cümlələr.",
    content: `Bu dərsdə qeyri-ana dilli hüquqşünasların ən çox səhv etdiyi prepozisiya ifadələri öyrənilir.

10 ƏSAS HÜQUQİ PREPOZİSİYA İFADƏSİ:

1. in accordance with — qaydalarına uyğun olaraq; tərəfindən tələb olunduğu kimi
   "This Agreement shall be interpreted IN ACCORDANCE WITH English law."

2. in respect of — haqqında; ilə bağlı; istinadən
   "The Company accepts liability IN RESPECT OF any damage during delivery."

3. in the event of / that — əgər baş verərsə
   "Either party may terminate IN THE EVENT OF a material breach."

4. subject to — şərtinə bağlı olaraq; tabe olaraq
   "The payment shall be made SUBJECT TO board approval."

5. pursuant to — uyğun olaraq; nəticəsindəki
   "The payment shall be made PURSUANT TO the provisions of clause 5."

6. on behalf of — adından; təmsil edərək
   "The solicitor signed the document ON BEHALF OF his client."

7. by virtue of — səbəbindən; nəticəsindəki
   "She is entitled to compensation BY VIRTUE OF her long service."

8. in lieu of — əvəzinə
   "The employee received payment IN LIEU OF notice."

9. without prejudice — məsuliyyəti qəbul etmədən (sülh danışıqlarında işlədilir)
   "This offer is made WITHOUT PREJUDICE to our legal position."

10. notwithstanding — baxmayaraq; baxmayaraq ki
    "The Seller retains title NOTWITHSTANDING delivery to the Buyer."

ÜMUMI XƏTALAR — DÜZGÜN FORMLAR:
❌ in accordance OF  →  ✓ in accordance WITH
❌ in respect TO     →  ✓ in respect OF
❌ pursuant OF       →  ✓ pursuant TO
❌ on behalf FOR     →  ✓ on behalf OF
❌ by virtue TO      →  ✓ by virtue OF

MƏŞQ — boşluğu doldurun:
1. "This Agreement shall be interpreted _______ English law." (in accordance with)
2. "The Company accepts liability _______ any damage during delivery." (in respect of)
3. "Either party may terminate this Agreement _______ a material breach." (in the event of)
4. "The payment shall be made _______ the provisions of clause 5." (pursuant to)
5. "The solicitor signed the document _______ his client." (on behalf of)`,
    terms: [17, 19, 20, 363, 364, 391, 392, 396, 397, 425],
    duration: 40,
    level: "A",
    objectives: [
      "10 əsas hüquqi prepozisiya ifadəsini (in accordance with, pursuant to, without prejudice...) düzgün işlət",
      "Qeyri-ana dilli hüquqşünasların etdiyi 5 tipik prepozisiya səhvini müəyyən et və düzəlt",
      "Prepozisiya ifadələrini real müqavilə cümlələri kontekstindəki tətbiq et"
    ],
    immersionLinks: [
      {
        type: "article",
        title: "Legal Prepositional Phrases — LawTeacher",
        url: "https://www.lawteacher.net/"
      },
      {
        type: "youtube",
        title: "Prepositions in Legal English — Common Mistakes",
        url: "https://www.youtube.com/results?search_query=prepositions+legal+english"
      },
      {
        type: "podcast",
        title: "TOLES Advanced — Legal Language",
        url: "https://www.toleslegal.com/"
      }
    ]
  },

  {
    id: 27,
    title: "Dərs 27: Real Müqavilələrin Strukturu və Şərhi",
    description: "Kommersiya müqaviləsinin standart quruluşu (Tərəflər → Recitals → Öhdəliklər → Boilerplate); əsas boilerplate bəndlərinin funksiyası; şərh prinsipləri.",
    content: `Bu dərsdə kommersiya müqaviləsinin standart strukturu və əsas bəndlərinin hüquqi funksiyası öyrənilir.

STANDART MÜQAVİLƏ STRUKTURU:

1. Parties (Tərəflər) — müqaviləyə daxil olanları müəyyən edir
2. Recitals / WHEREAS clauses — müqavilənin bağlanma kontekstini izah edən giriş paraqraflar
3. Definitions (Tərifi Anlayışlar) — böyük hərflə yazılan terminlərın mənasını müəyyən edir
4. Operative Clauses (Əsas Öhdəliklər) — hər tərəfin real öhdəliklərini sadalayır
5. Conditions Precedent (İlkin Şərtlər) — öhdəliklərin yaranmasından əvvəl yerinə yetirilməli şərtlər
6. Representations & Warranties — mövcud faktlar haqqında vədlər
7. Indemnities (Zərərsizləşdirmə) — bir şey yanlış gedərsə kimin ödəyəcəyini müəyyən edir
8. Limitation of Liability — zərər kompensasiyasının üst həddini müəyyən edir
9. Termination (Fəsih) — müqavilənin nə zaman və necə sona çatdırıla biləcəyi
10. Boilerplate / General — force majeure, tətbiq edilən hüquq, bildirişlər, bölünmüşlük, tam saziş

ƏSAS BOILERPLATE BƏNDLƏRİ:

Entire Agreement Clause — yazılı müqavilənin tam saziş olduğunu bildirir; əvvəlki şifahi razılaşmalar daxil deyil.

Force Majeure Clause — fövqəladə və öncədən görülə bilməyən hadisə (zəlzələ, müharibə, pandemiya) performansın qarşısını alırsa tərəfi bağışlayır. Qeyd: bənd hadisələri spesifik şəkildə sadalamalıdır.

Governing Law Clause — müqaviləni hansı ölkənin hüququnun tənzimləyəcəyini müəyyən edir.
"This Agreement shall be governed by and construed in accordance with the laws of England and Wales."

Jurisdiction Clause — mübahisəni hansı məhkəmənin baxacağını müəyyən edir; exclusive (yalnız bir məhkəmə) və ya non-exclusive ola bilər.

Notice Clause — rəsmi bildirişlərin necə (qeydiyyatlı poçt, e-poçt) və nə zaman çatdırılmış sayılacağını müəyyən edir.

Severability Clause — bir bənd etibarsız hesab olunarsa, müqavilənin qalan hissəsi qüvvədə qalır.

ƏSAS LÜĞƏT:
• recitals — WHEREAS bəndləri; giriş kontekst paraqrafları
• operative clause — faktiki müqavilə öhdəliklərini təyin edən bənd
• representation — müqaviləyə girişi stimullaşdırmaq üçün edilən mövcud fakt bəyanatı
• warranty — müəyyən faktların doğru olduğuna dair müqavilə vədi
• severability — bir bəndin etibarsız sayılmasına baxmayaraq müqavilənin qüvvədə qalması bacarığı`,
    terms: [17, 18, 19, 32, 107, 379, 390, 392, 396, 398],
    duration: 45,
    level: "A",
    objectives: [
      "Kommersiya müqaviləsinin 10 əsas bölməsini ardıcıllıqla sadalaya və hər birinin funksiyasını izah et",
      "6 əsas boilerplate bəndi (entire agreement, force majeure, governing law, jurisdiction, notice, severability) arasındakı fərqi izah et",
      "Recitals, operative clause, representation, warranty və severability terminlərini real müqavilə kontekstindəki işlət"
    ],
    immersionLinks: [
      {
        type: "article",
        title: "Commercial Contract Structure — LawTeacher",
        url: "https://www.lawteacher.net/free-law-essays/contract-law/"
      },
      {
        type: "youtube",
        title: "How to Read a Commercial Contract",
        url: "https://www.youtube.com/results?search_query=how+to+read+commercial+contract+structure"
      },
      {
        type: "podcast",
        title: "TOLES Advanced — Contract Interpretation",
        url: "https://www.toleslegal.com/"
      }
    ]
  }
];

const existingIds = new Set(lessons.map(l => l.id));
const conflicts = newLessons.filter(l => existingIds.has(l.id));
if (conflicts.length > 0) {
  console.log('ID conflicts:', conflicts.map(l => l.id));
  process.exit(1);
}

const updated = [...lessons, ...newLessons];
fs.writeFileSync('./src/data/lessons.json', JSON.stringify(updated, null, 2));
console.log('Done. Added:', newLessons.length, '| New total:', updated.length);
