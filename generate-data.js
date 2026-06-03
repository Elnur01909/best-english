const fs = require('fs');
const path = require('path');

// vocab.json oxu
const vocab = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/vocab.json'), 'utf-8'));

// Quiz generate et
function generateQuizzes() {
  const quizzes = [];

  vocab.forEach((term, idx) => {
    const otherTerms = vocab.filter((_, i) => i !== idx).sort(() => Math.random() - 0.5).slice(0, 3);
    const wrongAnswers = otherTerms.map(t => t.term);
    const allAnswers = [term.term, ...wrongAnswers].sort(() => Math.random() - 0.5);

    quizzes.push({
      id: idx + 1,
      question: term.en_def,
      options: allAnswers,
      correct: term.term,
      explanation: `${term.term}: ${term.en_def}`,
      level: term.level,
      topic: term.topic
    });
  });

  fs.writeFileSync(
    path.join(__dirname, 'src/data/quizzes.json'),
    JSON.stringify(quizzes, null, 2)
  );
  console.log('✅ quizzes.json yaradıldı (150 sual)');
}

// Lessons generate et
function generateLessons() {
  const lessons = [];
  const termsPerLesson = 15;
  const totalLessons = 10;

  for (let i = 0; i < totalLessons; i++) {
    const startIdx = i * termsPerLesson;
    const endIdx = Math.min(startIdx + termsPerLesson, vocab.length);
    const lessonTerms = vocab.slice(startIdx, endIdx);

    const topics = [...new Set(lessonTerms.map(t => t.topic))].join(', ');

    // Immersion Links — Real dünya kontenti
    const immersionLinks = [
      { type: 'youtube', title: 'Hüquqi İngilis Sözləri', url: 'https://www.youtube.com/results?search_query=legal+english+vocabulary' },
      { type: 'podcast', title: 'Legal English Podcast', url: 'https://www.englishteacher.net/legal-english/' },
      { type: 'article', title: 'TOLES Hazırlığı', url: 'https://www.bbc.com/learning/english/' }
    ];

    lessons.push({
      id: i + 1,
      title: `Dərs ${i + 1}: ${topics}`,
      description: `${lessonTerms.length} hüquqi terminə dair dərs`,
      content: `Bu dərsdə aşağıdakı hüquqi terminlər öyrənilən: ${lessonTerms.map(t => t.term).join(', ')}`,
      terms: lessonTerms.map(t => t.id),
      duration: 30,
      level: lessonTerms[0].level,
      objectives: [
        `${lessonTerms.length} hüquqi termininin mənasını öyrən`,
        'Terminlərin praktik istifadə nümunələrini anla',
        'Terminlərin kollokasiyalarını yadda saxla'
      ],
      immersionLinks: immersionLinks
    });
  }

  fs.writeFileSync(
    path.join(__dirname, 'src/data/lessons.json'),
    JSON.stringify(lessons, null, 2)
  );
  console.log('✅ lessons.json yaradıldı (10 dərs)');
}

// Cases generate et
function generateCases() {
  const cases = [];
  const caseCount = 5;

  const caseScenarios = [
    {
      title: 'Müqavilə pozulması iddiası',
      description: 'Bir şirkət məhsul çatdırmadığı üçün digərinə qarşı müqavilə pozulması iddiası açmışdır.',
      scenario: 'Tədarükçü vaxtında malları çatdırmadığı üçün alıcı 50,000 funt sterlinq kompensasiya tələb edir.',
      terms: [1, 4, 6, 8, 36], // OFFER, BREACH, CLAIMANT, DAMAGES, JUDGMENT
      questions: [
        'Tədarükçü nə üçün məsuliyyətli?',
        'Alıcı hansı təminat əldə edə bilər?',
        'Məhkəmə nə həm verərdi?'
      ]
    },
    {
      title: 'Səhlənkarlıq iddiası',
      description: 'Bir doktor xəstəyi xəbərdar etmədi və xəstə zərərçəkmişdir.',
      scenario: 'Cerrah operasiyadan əvvəl riskləri xəstəyə izah etmədi, xəstə fəlacətə uğradı.',
      terms: [5, 7, 8, 29], // NEGLIGENCE, DEFENDANT, DAMAGES, VICARIOUS LIABILITY
      questions: [
        'Cərrah nə səbəbdən səhlənkarlıqda məsuldür?',
        'Xəstəxana vəkil məsuliyyətə tabe tutula bilərmi?',
        'Kompensasiya hansı əsasda hesablanır?'
      ]
    },
    {
      title: 'İş hüququ mövzusu: qeyri-ədil çıxarılma',
      description: 'Bir işçi xəbərdarlıq olmadan işdən çıxarılmışdır.',
      scenario: 'İş verən işçini prosedur olmadan və səbəb göstərmədən işdən çıxardı.',
      terms: [67, 68, 70], // WRONGFUL DISMISSAL, DISCRIMINATION, WHISTLEBLOWER
      questions: [
        'İşçi nə iddia qaldıra bilər?',
        'İş verən nə cəzaya tabe tutula bilər?',
        'Qanun işçini qoruyur?'
      ]
    },
    {
      title: 'Mülkiyyət sərəncamı: kirayə sazişi',
      description: 'Ev sahibi və kirayə tutanın arasında mənazəə.',
      scenario: 'Kirayə tutan mətən zamanında ödəmir, ev sahibi cıxarma prosesi başlatır.',
      terms: [76, 77, 78, 79], // LEASE, TENANT, LANDLORD, EVICTION
      questions: [
        'Ev sahibi kimə qanuni icazə?',
        'Kirayə tutanın hüquqları nələrdir?',
        'Cıxarma prosesi necə işləyir?'
      ]
    },
    {
      title: 'Intellektual mülkiyyət: marka pozulması',
      description: 'Bir şirkət başqa şirkətin marka işarəsini qeyri-icazə istifadə edir.',
      scenario: 'Başqa məhsul istehsalçısı meşhur markanın oxşar işarəsini istifadə edərək bazarı aldatır.',
      terms: [61, 62, 64, 65], // TRADEMARK, COPYRIGHT, INTELLECTUAL PROPERTY, INFRINGEMENT
      questions: [
        'Marka sahibi nə edə bilər?',
        'Pozulma iddiasında nə sübut etmə lazımdır?',
        'Kompensasiya nə ola bilər?'
      ]
    }
  ];

  for (let i = 0; i < caseCount; i++) {
    const scenario = caseScenarios[i];
    cases.push({
      id: i + 1,
      title: scenario.title,
      description: scenario.description,
      scenario: scenario.scenario,
      relatedTerms: scenario.terms,
      questions: scenario.questions,
      difficulty: i < 2 ? 'Foundation' : 'Higher'
    });
  }

  fs.writeFileSync(
    path.join(__dirname, 'src/data/cases.json'),
    JSON.stringify(cases, null, 2)
  );
  console.log('✅ cases.json yaradıldı (5 case study)');
}

// Hamısını çalıştır
console.log('📊 Data generasiyası başladı...\n');
generateQuizzes();
generateLessons();
generateCases();
console.log('\n✅ Bütün fayllar tamamlandı!');
