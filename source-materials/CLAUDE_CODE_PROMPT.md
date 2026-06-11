# Claude Code Prompt: Source Materials → JSON Database

## Tapşırıq
`source-materials/` qovluğundakı MD fayllardan məzmun çıxarıb mövcud JSON fayllarına əlavə et. Hər faylın mənbəsini, hədəf JSON-unu və strukturunu aşağıda göstərdim.

---

## Fayl 1: `source-materials/vocab-commercial-contracts.md`
**Hədəf:** `src/data/vocab.json`

Bu fayldan **A, B, C bölmələrindəki bütün terminləri** çıxar və `vocab.json`-a əlavə et. Hər termin üçün aşağıdakı strukturu istifadə et (mövcud `VocabItem` tipinə uy):

```json
{
  "id": "cc_001",
  "word": "ABOVEMENTIONED",
  "definition": "Already mentioned in this document. Modern drafting advice is to avoid this word as it is archaic (old-fashioned).",
  "example": "Unless the abovementioned conditions are met, the contract shall not be binding.",
  "category": "commercial_contracts",
  "toles_level": "higher",
  "difficulty": 3
}
```

**Qaydalar:**
- ID formatı: `cc_001`, `cc_002`, ... (cc = commercial contracts)
- `toles_level`: "foundation" | "higher" | "advanced"
- `difficulty`: 1–5 (terminə görə qiymətləndir)
- `category`: "commercial_contracts"
- `example`: Faylda practice sentences varsa onları istifadə et, yoxdursa özün düz, qısa bir cümlə yaz
- Mövcud vocab.json-dakı son `id` nömrəsindən davam et (duplicate olmasın)
- Bütün terminlər üçün: Section A (14 term), Section B (14 term), Section C (14 term) = **42 termin**

---

## Fayl 2: `source-materials/vocab-employment-law.md`
**Hədəf:** `src/data/vocab.json`

Eyni struktur, amma:
- ID formatı: `emp_001`, `emp_002`, ...
- `category`: "employment_law"
- Section A (14 term), Section B (14 term), Section C (10 term) = **38 termin**

---

## Fayl 3: `source-materials/real-cases.md`
**Hədəf:** `src/data/cases.json`

Bu fayldan **4 real case** çıxar. Mövcud `cases.json` strukturuna uy:

```json
{
  "id": "case_005",
  "title": "The Salmon Farm",
  "subtitle": "Hjaltland Sea Farms v Klyne Marine Services (2010)",
  "jurisdiction": "Scotland (Sheriff Court)",
  "year": 2010,
  "area_of_law": "tort/negligence",
  "toles_level": "foundation",
  "difficulty": 2,
  "summary": "A ship owned by Klyne Marine Services ran aground near the Shetland Islands in 2005, spilling 84 tonnes of diesel fuel. The captain was three times over the legal alcohol limit. Local salmon farm Hjaltland Sea Farms sued for loss of profit, management time and cleaning costs. The court awarded £25,120.71 plus 8% interest.",
  "key_terms": ["claimant", "defendant", "damages", "foreseeable loss", "precedent", "civil action", "loss of profit", "appeal"],
  "legal_principle": "Where loss is foreseeable as a result of a wrongful act, the injured party is entitled to damages.",
  "questions": [
    {
      "id": "q1",
      "question": "What was the name of the ship involved in the accident?",
      "answer": "The Anglian Sovereign",
      "type": "comprehension"
    }
  ],
  "reading_text": "In 2005, a small ship called The Anglian Sovereign..."
}
```

**Qaydalar:**
- `id`: mövcud cases.json-dakı son id-dən davam et
- `reading_text`: MD fayldakı tam mətn bloğunu olduğu kimi əlavə et
- `questions`: MD fayldakı bütün 10 sualı daxil et, `answer` sahəsinə answer key-dən cavabları yaz
- `area_of_law`: case-ə görə qiymətləndir (tort, contract, IP, property law, etc.)
- 4 case üçün: The Salmon Farm, The Movie Studio, The Neighbours, The Telecommunications Engineer

---

## Fayl 4: `source-materials/quiz-book-real-contracts.md`
**Hədəf:** `src/data/quizzes.json`

Bu fayldan **4 quiz** çıxar. Mövcud `QuizQuestion` tipinə uy:

```json
{
  "id": "quiz_151",
  "question": "The Company may terminate the Agreement '_______ by written notice.' What does the missing word mean?",
  "options": [
    "eventually",
    "immediately",
    "conditionally",
    "partially"
  ],
  "correct": 1,
  "explanation": "'Forthwith' is a formal legal word meaning 'immediately'. It is commonly found in termination clauses.",
  "category": "vocabulary",
  "toles_level": "foundation",
  "source_context": "Contract for Services — termination clause",
  "difficulty": 2
}
```

**Qaydalar:**
- `id`: mövcud quizzes.json-dakı son id-dən davam et (151-dən)
- Hər quiz bölməsindəki match suallarından **5 multiple-choice sual** yarat
- `correct`: 0-indexed (doğru cavabın index-i)
- `explanation`: terminın niyə bu mənaya gəldiyini izah et (1-2 cümlə)
- `toles_level`: "foundation" (bu quizlər)
- Quiz 1 (5 sual) + Quiz 2 (5 sual) + Quiz 3 (5 sual) + Quiz 4 (5 sual) = **20 yeni sual**

---

## Fayl 5: `source-materials/advanced-legal-english-units.md`
**Hədəf:** `src/data/lessons.json`

Bu fayldan **5 dərs** yarat. Mövcud `lessons.json` strukturuna uy:

```json
{
  "id": "lesson_11",
  "title": "Terms of Art vs Legalese",
  "subtitle": "Understanding the Two Types of Legal Language",
  "level": "advanced",
  "toles_level": "advanced",
  "duration_minutes": 25,
  "order": 11,
  "topics": ["legal drafting", "plain English", "contract language"],
  "learning_objectives": [
    "Distinguish between terms of art and legalese",
    "Understand arguments for plain English drafting",
    "Identify unnecessarily complicated language in contracts"
  ],
  "content": {
    "introduction": "...",
    "sections": [
      {
        "title": "What is a Term of Art?",
        "text": "...",
        "key_terms": ["term of art", "legalese", "plain English"]
      }
    ]
  },
  "exercises": [
    {
      "type": "fill_blank",
      "instruction": "Complete each sentence with a word from the vocabulary box.",
      "items": [...]
    }
  ],
  "vocabulary": [
    { "word": "term of art", "definition": "a legal word with a judicially defined meaning" }
  ],
  "collocations": [],
  "immersion": {
    "youtube": "",
    "article": "https://www.americanbar.org/groups/litigation/publications/litigation_news/practice_areas/commercial/plain-english-in-contracts/",
    "podcast": ""
  }
}
```

**Qaydalar:**
- `id`: `lesson_11` - `lesson_15` (mövcud 10 dərsdən sonra)
- `order`: 11–15
- `level`: "advanced"
- Dərs mətnlərini (reading text, key concepts, vocabulary tables) MD fayldan tam köçür
- `exercises`: MD fayldakı egzersizləri strukturlaşdır
- `immersion.article`: hər dərsin mövzusu ilə əlaqəli real ingilis hüquq saytından link tap (ABA, Law Society, UK government)
- 5 Unit üçün: Terms of Art, AI and the Law, Collocation, Prepositions, Contract Structure = **5 yeni dərs**

---

## İcra Qaydaları

1. **Əvvəlcə oxu:** Hər hədəf JSON faylını (`vocab.json`, `quizzes.json`, `cases.json`, `lessons.json`) oxu ki, mövcud struktur və son id-ləri anlayasan.

2. **Duplicate yoxla:** Əlavə etməzdən əvvəl eyni `word` / `title` artıq varmı yoxla.

3. **Tip uyğunluğu:** `src/types/index.ts`-i oxu, TypeScript tiplərinə uy. Hər sahənin tipi düzgün olsun.

4. **Birbaşa merge et:** Yeni elementləri mövcud array-ə append et. Mövcud məzmunu silmə.

5. **Build yoxla:** `npm run build` çalıştır, TypeScript xəta vermirsə uğurludur.

6. **Commit:** Hər fayl üçün ayrı commit: `feat(data): add 42 commercial contract vocabulary terms from ABC-CC source`

---

## Prioritet Sırası

Əgər hamısını bir sessiyada bitirmək mümkün deyilsə, bu sıra ilə get:

1. ✅ `vocab-commercial-contracts.md` → `vocab.json` (42 termin — ən çox praktik dəyər)
2. ✅ `vocab-employment-law.md` → `vocab.json` (38 termin)
3. ✅ `real-cases.md` → `cases.json` (4 case)
4. ✅ `quiz-book-real-contracts.md` → `quizzes.json` (20 sual)
5. ✅ `advanced-legal-english-units.md` → `lessons.json` (5 dərs)

---

## Sessiyaya Başlamaq Üçün

```
CLAUDE.md-ə bax. Bu session: source-materials/ qovluğundakı MD fayllardan məzmun çıxarıb JSON bazasına əlavə etmək. Başla: src/data/vocab.json oxu → source-materials/vocab-commercial-contracts.md oxu → 42 termin əlavə et.
```
