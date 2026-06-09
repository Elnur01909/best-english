const fs = require('fs');
const existing = JSON.parse(fs.readFileSync('./src/data/quizzes.json', 'utf8'));
let id = Math.max(...existing.map(q => q.id)) + 1;

const g = (topic, cefr, q, opts, ans, exp) => ({
  id: id++, type: 'grammar', question: q, options: opts, correct: ans, explanation: exp,
  level: cefr, cefr, track: 'general', topic
});
const tf = (topic, cefr, sent, isTrue, exp) => ({
  id: id++, type: 'true-false',
  question: `True or False?\n\n«${sent}»`,
  options: ['Doğru', 'Yanlış'], correct: isTrue ? 'Doğru' : 'Yanlış', explanation: exp,
  level: cefr, cefr, track: 'general', topic
});

const newQs = [
  // ── A1: To be ──────────────────────────────────────────────
  g('Qrammatika · To be','A1','The dog ___ in the garden.',['is','are','am','be'],'is','The dog (it) → is'),
  g('Qrammatika · To be','A1','My parents ___ at home.',['is','be','am','are'],'are','My parents (they) → are'),
  g('Qrammatika · To be','A1','This book ___ very good.',['are','am','is','be'],'is','This book (it) → is'),
  g('Qrammatika · To be','A1','___ you a student?',['Am','Is','Are','Be'],'Are','You → Are. "Are you a student?"'),
  tf('Qrammatika · To be','A1','He are a teacher.',false,'Yanlış. He → is. Düzgün: "He IS a teacher."'),
  tf('Qrammatika · To be','A1','They are my friends.',true,'Doğru. They → are. Düzgündür.'),
  tf('Qrammatika · To be','A1','I is tired.',false,'Yanlış. I → am. Düzgün: "I AM tired."'),
  tf('Qrammatika · To be','A1','She is a nurse.',true,'Doğru. She → is. Düzgündür.'),
  g('Qrammatika · To be','A1','My brother ___ tall and funny.',['are','am','is','be'],'is','My brother (he) → is'),
  g('Qrammatika · To be','A1','The children ___ happy.',['is','am','be','are'],'are','The children (they) → are'),
  g('Qrammatika · To be','A1','___ she your sister?',['Are','Am','Be','Is'],'Is','She → Is. "Is she your sister?"'),
  g('Qrammatika · To be','A1','We ___ not at school today.',['is','am','be','are'],'are','We → are. "We are not at school."'),

  // ── A1: Articles a/an ──────────────────────────────────────
  g('Qrammatika · Articles a/an','A1','She is ___ teacher.',['an','the','a','—'],'a','Samitlə başlayan söz → a: a teacher'),
  g('Qrammatika · Articles a/an','A1','He has ___ umbrella.',['a','the','—','an'],'an','Sait ilə başlayan söz → an: an umbrella'),
  g('Qrammatika · Articles a/an','A1','I want ___ orange.',['a','the','—','an'],'an','Orange "o" ilə başlayır → an orange'),
  g('Qrammatika · Articles a/an','A1','She is ___ engineer.',['a','the','—','an'],'an','Engineer "e" ilə başlayır → an engineer'),
  tf('Qrammatika · Articles a/an','A1','I have a apple.',false,'Yanlış. Apple (sait) → AN apple'),
  tf('Qrammatika · Articles a/an','A1','He is an actor.',true,'Doğru. Actor "a" (sait) → an actor. Düzgündür.'),
  tf('Qrammatika · Articles a/an','A1','She has an book.',false,'Yanlış. Book "b" (samit) → A book'),
  tf('Qrammatika · Articles a/an','A1','It is a big house.',true,'Doğru. House "h" (samit) → a house. Düzgündür.'),
  g('Qrammatika · Articles a/an','A1','I see ___ elephant.',['a','the','—','an'],'an','Elephant "e" (sait) → an'),
  g('Qrammatika · Articles a/an','A1','He drives ___ car.',['an','the','—','a'],'a','Car "c" (samit) → a'),
  g('Qrammatika · Articles a/an','A1','She is ___ honest person.',['a','the','—','an'],'an','Honest "h" səssiz tələffüz: sait səsi → an'),
  g('Qrammatika · Articles a/an','A1','I ate ___ banana.',['an','the','—','a'],'a','Banana "b" (samit) → a'),

  // ── A1: Plural nouns ───────────────────────────────────────
  g('Qrammatika · Plural nouns','A1','one child, two ___',['childs','childes','childrens','children'],'children','Child qeyri-nizami cəm: children'),
  g('Qrammatika · Plural nouns','A1','one tooth, two ___',['tooths','teeths','tooth','teeth'],'teeth','Tooth qeyri-nizami cəm: teeth'),
  g('Qrammatika · Plural nouns','A1','one city, two ___',['citys','cities','cityes','city'],'cities','Samit + y → ies: city → cities'),
  g('Qrammatika · Plural nouns','A1','one box, two ___',['boxs','box','boxes','boxies'],'boxes','-x ilə bitən sözlər -es alır: box → boxes'),
  tf('Qrammatika · Plural nouns','A1','Two womans sat here.',false,'Yanlış. Woman qeyri-nizami: WOMEN'),
  tf('Qrammatika · Plural nouns','A1','Three books are on the table.',true,'Doğru. Book nizami cəm: books. Düzgündür.'),
  tf('Qrammatika · Plural nouns','A1','The childs are playing.',false,'Yanlış. Child qeyri-nizami: CHILDREN'),
  tf('Qrammatika · Plural nouns','A1','I have two feet.',true,'Doğru. Foot qeyri-nizami: feet. Düzgündür.'),
  g('Qrammatika · Plural nouns','A1','one watch, two ___',['watchs','watch','watches','watchies'],'watches','-ch ilə bitən: watch → watches'),
  g('Qrammatika · Plural nouns','A1','one baby, two ___',['babys','babies','babyes','baby'],'babies','Samit + y → ies: baby → babies'),
  g('Qrammatika · Plural nouns','A1','one person, many ___',['persons','peoples','person','people'],'people','Person qeyri-nizami: people'),
  g('Qrammatika · Plural nouns','A1','one bus, two ___',['buss','buses','bus','busies'],'buses','-s ilə bitən: bus → buses'),

  // ── A1: Subject pronouns ───────────────────────────────────
  g('Qrammatika · Subject pronouns','A1','___ is my mother. (ana haqqında)',['He','It','She','They'],'She','Ana = qadın → She'),
  g('Qrammatika · Subject pronouns','A1','___ are my friends. (dostlar haqqında)',['He','She','It','They'],'They','Dostlar = çoxluq → They'),
  g('Qrammatika · Subject pronouns','A1','___ is a cat. (pişik haqqında)',['She','He','They','It'],'It','Heyvan (cinsiz) → It'),
  g('Qrammatika · Subject pronouns','A1','___ am a student. (özüm haqqında)',['He','You','She','I'],'I','Özüm → I'),
  tf('Qrammatika · Subject pronouns','A1','He are a doctor.',false,'Yanlış. He + are olmaz. Düzgün: He IS a doctor.'),
  tf('Qrammatika · Subject pronouns','A1','She is my sister.',true,'Doğru. She + is. Düzgündür.'),
  tf('Qrammatika · Subject pronouns','A1','They is happy.',false,'Yanlış. They + are. Düzgün: They ARE happy.'),
  tf('Qrammatika · Subject pronouns','A1','We are at home.',true,'Doğru. We + are. Düzgündür.'),
  g('Qrammatika · Subject pronouns','A1','___ is a book. (kitab haqqında)',['He','She','They','It'],'It','Cansız əşya → It'),
  g('Qrammatika · Subject pronouns','A1','___ is my father. (ata haqqında)',['She','It','They','He'],'He','Ata = kişi → He'),
  g('Qrammatika · Subject pronouns','A1','___ are students. (biz haqqında)',['I','He','She','We'],'We','Biz → We'),
  g('Qrammatika · Subject pronouns','A1','___ are from Baku. (sən haqqında)',['I','She','He','You'],'You','Sən → You'),

  // ── A1: Present Simple ─────────────────────────────────────
  g('Qrammatika · Present Simple','A1','She ___ to school every day.',['go','going','gone','goes'],'goes','She → goes (+s)'),
  g('Qrammatika · Present Simple','A1','They ___ football on Sundays.',['plays','playing','play','to play'],'play','They → play (s olmadan)'),
  g('Qrammatika · Present Simple','A1','He ___ not like coffee.',['do','is','does','did'],'does','He → does not'),
  g('Qrammatika · Present Simple','A1','___ you like pizza?',['Does','Is','Do','Did'],'Do','You → Do you like...?'),
  tf('Qrammatika · Present Simple','A1','She go to work every day.',false,'Yanlış. She → goes. "She GOES to work."'),
  tf('Qrammatika · Present Simple','A1','He drinks coffee every morning.',true,'Doğru. He → drinks (+s). Düzgündür.'),
  tf('Qrammatika · Present Simple','A1','They watches TV at night.',false,'Yanlış. They → watch. "They WATCH TV."'),
  tf('Qrammatika · Present Simple','A1','I walk to school.',true,'Doğru. I → walk (s olmadan). Düzgündür.'),
  g('Qrammatika · Present Simple','A1','My cat ___ fish.',['love','loving','loves','to love'],'loves','My cat (it) → loves'),
  g('Qrammatika · Present Simple','A1','We ___ in Baku.',['lives','living','lived','live'],'live','We → live (s olmadan)'),
  g('Qrammatika · Present Simple','A1','___ she speak English?',['Do','Is','Did','Does'],'Does','She → Does she speak...?'),
  g('Qrammatika · Present Simple','A1','He ___ to bed at 10 pm.',['go','going','goes','to go'],'goes','He → goes'),

  // ── A1: Can / can't ────────────────────────────────────────
  g("Qrammatika · Can / can't",'A1','She ___ swim very well.',['cans','could','can','is'],'can','Can + fel əsas forması'),
  g("Qrammatika · Can / can't",'A1','___ you ride a bike?',['Does','Is','Did','Can'],'Can','Sual: Can + subject + verb?'),
  g("Qrammatika · Can / can't",'A1','He ___ play the piano.',['cans','is','can','does'],'can','Can heç vaxt -s almır'),
  g("Qrammatika · Can / can't",'A1','I ___ not drive a car.',['am','do','cans','can'],'can',"İnkar: can not / can't"),
  tf("Qrammatika · Can / can't",'A1','She cans sing beautifully.',false,"Yanlış. Can -s almır: She CAN sing."),
  tf("Qrammatika · Can / can't",'A1','Can he play football?',true,'Doğru. Can ilə sual düzgündür.'),
  tf("Qrammatika · Can / can't",'A1','They can to swim.',false,"Yanlış. Can-dan sonra to işlənmir: They can SWIM."),
  tf("Qrammatika · Can / can't",'A1',"I can't speak French.",true,"Doğru. Can't = cannot. Düzgündür."),
  g("Qrammatika · Can / can't",'A1','Birds ___ fly.',['cans','is able','are','can'],'can','Birds (they) → can fly'),
  g("Qrammatika · Can / can't",'A1','___ I help you?',['Does','Am','Do','Can'],'Can','Kömək təklifi: Can I...?'),
  g("Qrammatika · Can / can't",'A1','My dog ___ do tricks.',['cans','is','does','can'],'can','My dog (it) → can'),
  g("Qrammatika · Can / can't",'A1','We ___ not hear you.',['do','are','cans','can'],'can',"İnkar: can not"),

  // ── A1: There is / There are ───────────────────────────────
  g('Qrammatika · There is / There are','A1','___ a cat on the roof.',['There are','Is there','Are there','There is'],'There is','Tək → There is'),
  g('Qrammatika · There is / There are','A1','___ three apples on the table.',['There is','Is there','There are','Are there'],'There are','Çox → There are'),
  g('Qrammatika · There is / There are','A1','___ any milk in the fridge?',['There are','There is','Are there','Is there'],'Is there','Sual + tək: Is there?'),
  g('Qrammatika · There is / There are','A1','___ two students in the room.',['Is there','There is','Are there','There are'],'There are','Çox → There are'),
  tf('Qrammatika · There is / There are','A1','There are a dog in the garden.',false,'Yanlış. Dog tək → There IS a dog.'),
  tf('Qrammatika · There is / There are','A1','There is a book on the desk.',true,'Doğru. Book tək → There is. Düzgündür.'),
  tf('Qrammatika · There is / There are','A1','There is five chairs here.',false,'Yanlış. Five chairs → çox → There ARE five chairs.'),
  tf('Qrammatika · There is / There are','A1','Are there any students?',true,'Doğru. Çoxluq sual: Are there? Düzgündür.'),
  g('Qrammatika · There is / There are','A1','___ not any bread.',['There are','Are there','Is there','There is'],'There is','Tək inkar → There is not'),
  g('Qrammatika · There is / There are','A1','___ many people in the street.',['There is','Is there','Are there','There are'],'There are','Many → çox → There are'),
  g('Qrammatika · There is / There are','A1','___ a problem here.',['Are there','There are','Is there','There is'],'There is','A problem = tək → There is'),
  g('Qrammatika · There is / There are','A1','___ any questions?',['There is','Is there','There are','Are there'],'Are there','Çoxluq sual → Are there?'),

  // ── A1: Possessives ────────────────────────────────────────
  g('Qrammatika · Possessives','A1','This is ___ book. (mənimki)',['your','her','his','my'],'my','I → my'),
  g('Qrammatika · Possessives','A1','___ name is Anna. (onun — qadın)',['His','My','Its','Her'],'Her','She → her'),
  g('Qrammatika · Possessives','A1','The cat licked ___ paw.',['her','my','his','its'],'its','It → its'),
  g('Qrammatika · Possessives','A1','We love ___ school.',['my','his','their','our'],'our','We → our'),
  tf('Qrammatika · Possessives','A1','This is her book.',true,'Doğru. She → her. Düzgündür.'),
  tf('Qrammatika · Possessives','A1',"That is my brothers car.",false,"Yanlış. Apostrof lazımdır: my brother's car"),
  tf('Qrammatika · Possessives','A1','His name is John.',true,'Doğru. He → his. Düzgündür.'),
  tf('Qrammatika · Possessives','A1','This is their home.',true,'Doğru. They → their. Düzgündür.'),
  g('Qrammatika · Possessives','A1','___ phone is new. (sənin)',['My','Her','His','Your'],'Your','You → your'),
  g('Qrammatika · Possessives','A1',"This is Sarah ___ cat.",["Sarah's","Sarahs","of Sarah","Sarah is"],"Sarah's","Apostrof + s → sahiblik"),
  g('Qrammatika · Possessives','A1','They love ___ country.',['his','our','my','their'],'their','They → their'),
  g('Qrammatika · Possessives','A1','___ car is that? (kimin?)',['Who','Which','What','Whose'],'Whose','Sahiblik sualı → Whose'),

  // ── A2: was / were ─────────────────────────────────────────
  g('Qrammatika · was / were','A2','She ___ at home yesterday.',['were','is','be','was'],'was','She → was'),
  g('Qrammatika · was / were','A2','We ___ very tired last night.',['was','be','is','were'],'were','We → were'),
  g('Qrammatika · was / were','A2','___ you at the party?',['Was','Is','Are','Were'],'Were','You → Were you...?'),
  g('Qrammatika · was / were','A2','The students ___ happy.',['was','is','are','were'],'were','Students (they) → were'),
  tf('Qrammatika · was / were','A2','He were sick last week.',false,'Yanlış. He → was. "He WAS sick."'),
  tf('Qrammatika · was / were','A2','They were at school yesterday.',true,'Doğru. They → were. Düzgündür.'),
  tf('Qrammatika · was / were','A2','I was happy at the party.',true,'Doğru. I → was. Düzgündür.'),
  tf('Qrammatika · was / were','A2','We was at home.',false,'Yanlış. We → were. "We WERE at home."'),
  g('Qrammatika · was / were','A2','The film ___ great!',['were','is','are','was'],'was','The film (it) → was'),
  g('Qrammatika · was / were','A2','___ they at the meeting?',['Was','Is','Are','Were'],'Were','They → Were they...?'),
  g('Qrammatika · was / were','A2','It ___ a cold day.',['were','is','are','was'],'was','It → was'),
  g('Qrammatika · was / were','A2','I ___ not ready for the test.',['were','am','are','was'],'was','I → was not'),

  // ── A2: Past Simple ────────────────────────────────────────
  g('Qrammatika · Past Simple','A2','She ___ to the market yesterday. (go)',['goed','goes','going','went'],'went','Go qeyri-nizami: go → went'),
  g('Qrammatika · Past Simple','A2','They ___ a movie last night. (watch)',['watched','watch','watchs','watcht'],'watched','Nizami: watch → watched'),
  g('Qrammatika · Past Simple','A2','He ___ breakfast this morning. (eat)',['eated','eats','eating','ate'],'ate','Eat qeyri-nizami: eat → ate'),
  g('Qrammatika · Past Simple','A2','___ you call her yesterday?',['Was','Did','Does','Were'],'Did','Past Simple sual: Did + subject + verb'),
  tf('Qrammatika · Past Simple','A2','She goed to school yesterday.',false,'Yanlış. Go qeyri-nizami: WENT.'),
  tf('Qrammatika · Past Simple','A2','He played tennis last Saturday.',true,'Doğru. Play nizami: played. Düzgündür.'),
  tf('Qrammatika · Past Simple','A2','Did she ate the cake?',false,'Yanlış. Did-dən sonra əsas forma: Did she EAT?'),
  tf('Qrammatika · Past Simple','A2','We saw a great film.',true,'Doğru. See → saw. Düzgündür.'),
  g('Qrammatika · Past Simple','A2','I ___ my keys. (lose)',['losed','losted','lose','lost'],'lost','Lose qeyri-nizami: lose → lost'),
  g('Qrammatika · Past Simple','A2',"They ___ not come to the party.",["didn't","doesn't","wasn't","aren't"],"didn't","İnkar: didn't + əsas forma"),
  g('Qrammatika · Past Simple','A2','We ___ a new car last year. (buy)',['buyed','buy','boughted','bought'],'bought','Buy qeyri-nizami: buy → bought'),
  g('Qrammatika · Past Simple','A2','She ___ a letter to her friend. (write)',['writed','writes','write','wrote'],'wrote','Write qeyri-nizami: write → wrote'),

  // ── A2: Present Continuous ─────────────────────────────────
  g('Qrammatika · Present Continuous','A2','She ___ a book right now.',['read','reads','is reading','are reading'],'is reading','She + is + verb-ing'),
  g('Qrammatika · Present Continuous','A2','They ___ football at the moment.',['play','plays','is playing','are playing'],'are playing','They + are + verb-ing'),
  g('Qrammatika · Present Continuous','A2','___ he working now?',['Do','Does','Is','Are'],'Is','He → Is he working?'),
  g('Qrammatika · Present Continuous','A2','I ___ a sandwich now.',['eat','eats','am eating','is eating'],'am eating','I + am + verb-ing'),
  tf('Qrammatika · Present Continuous','A2','She is reading a book now.',true,'Doğru. She + is + reading. Düzgündür.'),
  tf('Qrammatika · Present Continuous','A2','They is playing outside.',false,'Yanlış. They → are. "They ARE playing."'),
  tf('Qrammatika · Present Continuous','A2','He are working right now.',false,'Yanlış. He → is. "He IS working."'),
  tf('Qrammatika · Present Continuous','A2','I am listening to music.',true,'Doğru. I + am + listening. Düzgündür.'),
  g('Qrammatika · Present Continuous','A2','Look! The baby ___.',['sleep','sleeps','is sleeping','are sleeping'],'is sleeping','The baby (it) → is sleeping'),
  g('Qrammatika · Present Continuous','A2','We ___ dinner right now.',['cook','cooks','are cooking','is cooking'],'are cooking','We + are + cooking'),
  g('Qrammatika · Present Continuous','A2','___ they coming to the party?',['Do','Does','Is','Are'],'Are','They → Are they coming?'),
  g('Qrammatika · Present Continuous','A2','The cat ___ on my bed.',['sleep','sleeps','is sleeping','are sleeping'],'is sleeping','The cat (it) → is sleeping'),

  // ── A2: Comparatives & Superlatives ───────────────────────
  g('Qrammatika · Comparatives & Superlatives','A2','This car is ___ than that one. (fast)',['more fast','fastest','faster','the fastest'],'faster','Qısa sifət + er: fast → faster'),
  g('Qrammatika · Comparatives & Superlatives','A2','She is ___ student in class. (good)',['better','the best','gooder','more good'],'the best','Good → the best (qeyri-nizami)'),
  g('Qrammatika · Comparatives & Superlatives','A2','This is ___ film I have seen. (interesting)',['more interesting','interestinger','most interesting','the most interesting'],'the most interesting','Uzun sifət: the most interesting'),
  g('Qrammatika · Comparatives & Superlatives','A2','He is ___ than his brother. (tall)',['more tall','tallest','taller','the tallest'],'taller','Qısa sifət + er: tall → taller'),
  tf('Qrammatika · Comparatives & Superlatives','A2','She is more tall than me.',false,'Yanlış. Qısa sifət -er alır: She is TALLER than me.'),
  tf('Qrammatika · Comparatives & Superlatives','A2','This is the most expensive car.',true,'Doğru. Uzun sifət: the most expensive. Düzgündür.'),
  tf('Qrammatika · Comparatives & Superlatives','A2','He is the goodest player.',false,'Yanlış. Good qeyri-nizami: THE BEST player.'),
  tf('Qrammatika · Comparatives & Superlatives','A2','This test is harder than the last one.',true,'Doğru. Hard → harder. Düzgündür.'),
  g('Qrammatika · Comparatives & Superlatives','A2','Mount Everest is ___ mountain. (high)',['higher','more high','the most high','the highest'],'the highest','Qısa sifət superlative: the highest'),
  g('Qrammatika · Comparatives & Superlatives','A2','This bag is ___ than that one. (heavy)',['more heavy','the heaviest','heavyer','heavier'],'heavier','Heavy: y → ier: heavier'),
  g('Qrammatika · Comparatives & Superlatives','A2','She runs ___ than me. (fast)',['more fast','the fastest','fastest','faster'],'faster','Fast → faster'),
  g('Qrammatika · Comparatives & Superlatives','A2','This is ___ I can do. (bad)',['worse','badder','the worst','the baddest'],'the worst','Bad → the worst (qeyri-nizami)'),

  // ── A2: going to ───────────────────────────────────────────
  g('Qrammatika · going to (future)','A2','She ___ visit her grandmother tomorrow.',['is going to','are going to','go to','will going to'],'is going to','She → is going to + verb'),
  g('Qrammatika · going to (future)','A2','They ___ move to a new house.',['is going to','goes to','are going to','go to'],'are going to','They → are going to + verb'),
  g('Qrammatika · going to (future)','A2','___ you going to study tonight?',['Is','Am','Do','Are'],'Are','You → Are you going to...?'),
  g('Qrammatika · going to (future)','A2','I ___ buy a new phone.',['is going to','goes to','are going to','am going to'],'am going to','I → am going to + verb'),
  tf('Qrammatika · going to (future)','A2','He is going to travels next week.',false,"Yanlış. Going to-dan sonra əsas forma: He is going to TRAVEL."),
  tf('Qrammatika · going to (future)','A2','We are going to watch a film tonight.',true,'Doğru. We + are going to + verb. Düzgündür.'),
  tf('Qrammatika · going to (future)','A2','She are going to cook dinner.',false,'Yanlış. She → is. "She IS going to cook."'),
  tf('Qrammatika · going to (future)','A2','Are they going to come?',true,'Doğru. They → are going to. Düzgündür.'),
  g('Qrammatika · going to (future)','A2','Look at those clouds! It ___ rain.',['are going to','is going to','goes to','am going to'],'is going to','It → is going to rain (görünən əlamət)'),
  g('Qrammatika · going to (future)','A2',"We ___ not go to school tomorrow.",['is going to','are going to','am going to','goes to'],'are going to','We → are going to (inkar: are not going to)'),
  g('Qrammatika · going to (future)','A2','He ___ start a new job.',['are going to','is going to','am going to','go to'],'is going to','He → is going to'),
  g('Qrammatika · going to (future)','A2','___ she going to call you?',['Am','Do','Is','Are'],'Is','She → Is she going to...?'),

  // ── A2: some / any ─────────────────────────────────────────
  g('Qrammatika · some / any','A2','There is ___ milk in the fridge.',['any','no','a','some'],'some','Müsbət cümlə → some'),
  g('Qrammatika · some / any','A2','Is there ___ water?',['some','no','a','any'],'any','Sual cümləsi → any'),
  g('Qrammatika · some / any','A2',"I don't have ___ money.",['some','a','no','any'],'any','İnkar cümlə → any'),
  g('Qrammatika · some / any','A2','Can I have ___ coffee, please?',['any','no','a','some'],'some','Nəzakətli xahiş → some'),
  tf('Qrammatika · some / any','A2','I have some friends in London.',true,'Doğru. Müsbət cümlə → some. Düzgündür.'),
  tf('Qrammatika · some / any','A2','Do you have some money?',false,"Sual cümləsində adətən any: Do you have ANY money?"),
  tf('Qrammatika · some / any','A2',"There aren't any chairs.",true,"Doğru. İnkar → any. Düzgündür."),
  tf('Qrammatika · some / any','A2',"She doesn't have some friends.",false,"Yanlış. İnkar → any: She doesn't have ANY friends."),
  g('Qrammatika · some / any','A2','We need ___ eggs for the cake.',['any','a','no','some'],'some','Müsbət cümlə → some'),
  g('Qrammatika · some / any','A2',"There aren't ___ apples left.",['some','a','no','any'],'any','İnkar → any'),
  g('Qrammatika · some / any','A2','Would you like ___ tea?',['any','no','a','some'],'some','Təklif cümləsində → some'),
  g('Qrammatika · some / any','A2','Have you read ___ good books?',['some','a','no','any'],'any','Sual cümləsi → any'),

  // ── A2: much / many ────────────────────────────────────────
  g('Qrammatika · much / many','A2','How ___ students are in the class?',['much','a lot','more','many'],'many','Students sayıla bilən → many'),
  g('Qrammatika · much / many','A2',"I don't drink ___ coffee.",['many','lots','a lot','much'],'much','Coffee sayıla bilməyən → much'),
  g('Qrammatika · much / many','A2','How ___ water do you drink?',['many','lots','a','much'],'much','Water sayıla bilməyən → much'),
  g('Qrammatika · much / many','A2','There are ___ cars on the road.',['much','a little','a lot','many'],'many','Cars sayıla bilən → many'),
  tf('Qrammatika · much / many','A2','How many milk is there?',false,'Yanlış. Milk sayıla bilməyən → How MUCH milk?'),
  tf('Qrammatika · much / many','A2','There are many books on the shelf.',true,'Doğru. Books sayıla bilən → many. Düzgündür.'),
  tf('Qrammatika · much / many','A2',"She doesn't have much money.",true,'Doğru. Money sayıla bilməyən → much. Düzgündür.'),
  tf('Qrammatika · much / many','A2','How much apples do you need?',false,'Yanlış. Apples sayıla bilən → How MANY apples?'),
  g('Qrammatika · much / many','A2',"I don't have ___ time.",['many','lots','a','much'],'much','Time sayıla bilməyən → much'),
  g('Qrammatika · much / many','A2','How ___ languages do you speak?',['much','a lot','a','many'],'many','Languages sayıla bilən → many'),
  g('Qrammatika · much / many','A2',"There isn't ___ sugar left.",['many','lots','a few','much'],'much','Sugar sayıla bilməyən → much'),
  g('Qrammatika · much / many','A2','She has ___ friends.',['much','a lot of','more','many'],'many','Friends sayıla bilən → many'),

  // ── A2: Adverbs of frequency ───────────────────────────────
  g('Qrammatika · Adverbs of frequency','A2','She ___ eats breakfast.',['often never','is often','often is','often'],'often','often felindən əvvəl gəlir'),
  g('Qrammatika · Adverbs of frequency','A2','He is ___ late for work.',['sometimes','never ever','quite always','always'],'always','to be-dən sonra → always'),
  g('Qrammatika · Adverbs of frequency','A2','I ___ go to the cinema.',['am never','never','is never','never am'],'never','never felindən əvvəl gəlir'),
  g('Qrammatika · Adverbs of frequency','A2','They ___ have pizza on Fridays.',['usually','are usually','is usually','usually are'],'usually','usually felindən əvvəl gəlir'),
  tf('Qrammatika · Adverbs of frequency','A2','She always is late.',false,'Yanlış. Always to be-dən SONRA: She IS ALWAYS late.'),
  tf('Qrammatika · Adverbs of frequency','A2','I usually wake up at 7.',true,'Doğru. usually felindən əvvəl. Düzgündür.'),
  tf('Qrammatika · Adverbs of frequency','A2','He never eats meat.',true,'Doğru. never felindən əvvəl. Düzgündür.'),
  tf('Qrammatika · Adverbs of frequency','A2','They eat sometimes lunch outside.',false,'Yanlış. sometimes felindən əvvəl: They SOMETIMES eat lunch outside.'),
  g('Qrammatika · Adverbs of frequency','A2','I am ___ happy to see you.',['ever','always','sometimes ever','never always'],'always','to be-dən SONRA: am always'),
  g('Qrammatika · Adverbs of frequency','A2','She ___ reads before bed.',['rarely ever','is rarely','never always','rarely'],'rarely','rarely felindən əvvəl gəlir'),
  g('Qrammatika · Adverbs of frequency','A2','We ___ go to the gym.',['is sometimes','sometimes','are sometimes','sometimes are'],'sometimes','sometimes felindən əvvəl gəlir'),
  g('Qrammatika · Adverbs of frequency','A2','He is ___ at home on weekends.',['sometimes he','he sometimes','sometimes','is sometimes'],'sometimes','to be-dən SONRA: is sometimes'),

  // ── B1: Present Perfect ────────────────────────────────────
  g('Qrammatika · Present Perfect','B1','She ___ to Paris. (visit)',['visited','has visited','have visited','visits'],'has visited','She → has + V3: has visited'),
  g('Qrammatika · Present Perfect','B1',"They ___ the film yet.",["haven't seen","hasn't seen","didn't see","don't see"],"haven't seen","They → have not: haven't seen"),
  g('Qrammatika · Present Perfect','B1','___ you ever eaten sushi?',['Did','Do','Have','Has'],'Have','You → Have you ever...?'),
  g('Qrammatika · Present Perfect','B1','He ___ his homework.',['has finished','have finished','finished','is finishing'],'has finished','He → has + V3: has finished'),
  tf('Qrammatika · Present Perfect','B1','I have saw that film.',false,'Yanlış. See V3 = seen. "I have SEEN that film."'),
  tf('Qrammatika · Present Perfect','B1','She has never been to Japan.',true,'Doğru. She has + been (V3). Düzgündür.'),
  tf('Qrammatika · Present Perfect','B1','They have finished the project.',true,'Doğru. They have + V3. Düzgündür.'),
  tf('Qrammatika · Present Perfect','B1','He have worked here for 3 years.',false,'Yanlış. He → has. "He HAS worked here for 3 years."'),
  g('Qrammatika · Present Perfect','B1','I ___ my wallet. (lose)',['lost','have lost','has lost','did lose'],'have lost','I → have + V3: have lost'),
  g('Qrammatika · Present Perfect','B1','___ she ever won a prize?',['Did','Does','Have','Has'],'Has','She → Has she ever...?'),
  g('Qrammatika · Present Perfect','B1','We ___ in this city for 10 years.',['lived','have lived','has lived','are living'],'have lived','We → have + V3: have lived'),
  g('Qrammatika · Present Perfect','B1','He ___ three books this year. (write)',['wrote','have written','has written','writes'],'has written','He → has + V3: has written'),

  // ── B1: Present Perfect vs Past Simple ─────────────────────
  g('Qrammatika · Present Perfect vs Past Simple','B1','I ___ sushi before. (never/eat)',['never ate','have never eaten','never have eaten','eaten never'],'have never eaten','Təcrübə → Present Perfect: have never eaten'),
  g('Qrammatika · Present Perfect vs Past Simple','B1','She ___ to Paris last year. (go)',['has gone','have gone','went','goes'],'went','Keçmiş zaman (last year) → Past Simple: went'),
  g('Qrammatika · Present Perfect vs Past Simple','B1','___ you call him yet?',['Have','Did','Do','Has'],'Have','Yet → Present Perfect: Have you called him yet?'),
  g('Qrammatika · Present Perfect vs Past Simple','B1','We ___ that film in 2020. (see)',['have seen','has seen','are seeing','saw'],'saw','2020 = müəyyən keçmiş → Past Simple: saw'),
  tf('Qrammatika · Present Perfect vs Past Simple','B1','I have seen him yesterday.',false,"Yanlış. Yesterday = müəyyən zaman → Past Simple: I SAW him yesterday."),
  tf('Qrammatika · Present Perfect vs Past Simple','B1','She went to London last week.',true,'Doğru. Last week = müəyyən zaman → Past Simple. Düzgündür.'),
  tf('Qrammatika · Present Perfect vs Past Simple','B1','Have you ever been to Italy?',true,'Doğru. Ever = ümumi təcrübə → Present Perfect. Düzgündür.'),
  tf('Qrammatika · Present Perfect vs Past Simple','B1','I have finished my work an hour ago.',false,"Yanlış. An hour ago = müəyyən zaman → Past Simple: I FINISHED my work."),
  g('Qrammatika · Present Perfect vs Past Simple','B1','He ___ her in 2018. (meet)',['has met','meeting','have met','met'],'met','2018 = müəyyən keçmiş → Past Simple: met'),
  g('Qrammatika · Present Perfect vs Past Simple','B1','I ___ three cups of coffee today. (drink)',["'ve drunk","drank","drunk","drinked"],"'ve drunk","Today (hələ davam edir) → Present Perfect"),
  g('Qrammatika · Present Perfect vs Past Simple','B1','___ she call you this morning?',['Has','Have','Did','Does'],'Did','This morning (bitmiş) → Past Simple: Did she call?'),
  g('Qrammatika · Present Perfect vs Past Simple','B1',"They ___ just ___ the game.",['have / won','did / win','had / win','have / win'],'have / won','Just → Present Perfect: have just won'),

  // ── B1: Past Continuous ────────────────────────────────────
  g('Qrammatika · Past Continuous','B1','She ___ when I called her. (study)',['studied','is studying','was studying','were studying'],'was studying','She → was + verb-ing'),
  g('Qrammatika · Past Continuous','B1','They ___ football at 5 pm yesterday.',['played','are playing','was playing','were playing'],'were playing','They → were + verb-ing'),
  g('Qrammatika · Past Continuous','B1','___ he working when you arrived?',['Did','Is','Were','Was'],'Was','He → Was he working?'),
  g('Qrammatika · Past Continuous','B1','I ___ TV when the lights went out.',['watched','watching','was watching','were watching'],'was watching','I → was + verb-ing'),
  tf('Qrammatika · Past Continuous','B1','She were sleeping at midnight.',false,'Yanlış. She → was. "She WAS sleeping."'),
  tf('Qrammatika · Past Continuous','B1','They were playing music all night.',true,'Doğru. They + were + verb-ing. Düzgündür.'),
  tf('Qrammatika · Past Continuous','B1','He was reading when she called.',true,'Doğru. Keçmişdə davam edən + yarımlayan. Düzgündür.'),
  tf('Qrammatika · Past Continuous','B1','We was eating dinner at 8.',false,'Yanlış. We → were. "We WERE eating dinner."'),
  g('Qrammatika · Past Continuous','B1','While she ___ (read), he cooked.',['reads','read','is reading','was reading'],'was reading','While + Past Continuous: was reading'),
  g('Qrammatika · Past Continuous','B1','What ___ you doing at 9 last night?',['did','are','is','were'],'were','You → were. What were you doing?'),
  g('Qrammatika · Past Continuous','B1','The children ___ when we arrived. (sleep)',['slept','sleeps','were sleeping','was sleeping'],'were sleeping','The children (they) → were sleeping'),
  g('Qrammatika · Past Continuous','B1','It ___ heavily when we left. (rain)',['rained','rains','were raining','was raining'],'was raining','It → was raining'),

  // ── B1: will vs going to ───────────────────────────────────
  g("Qrammatika · will vs going to",'B1','A: "The phone is ringing!" B: "I ___ get it!"',["am going to","going to","'ll","will to"],"'ll",'Ani qərar → will'),
  g("Qrammatika · will vs going to",'B1','She has already bought tickets. She ___ fly to London.',["will","'ll","is going to","will to"],'is going to','Planlaşdırılmış → going to'),
  g("Qrammatika · will vs going to",'B1','I think it ___ rain tomorrow.',["going to","is going to","'ll","will to"],"'ll",'Proqnoz (think) → will'),
  g("Qrammatika · will vs going to",'B1','Look at those clouds! It ___ rain.',["will","'ll","will to","is going to"],'is going to','Görünən əlamət → going to'),
  tf("Qrammatika · will vs going to",'B1',"I think she'll pass the exam.",true,"Doğru. Fikir/proqnoz → will. Düzgündür."),
  tf("Qrammatika · will vs going to",'B1','He is going to to start a new job.',false,"Yanlış. Artıq to var: He is going to START a new job."),
  tf("Qrammatika · will vs going to",'B1',"We'll help you with your bags.",true,"Doğru. Ani kömək → will. Düzgündür."),
  tf("Qrammatika · will vs going to",'B1','She will to call you later.',false,"Yanlış. Will-dən sonra to işlənmir: She WILL call you."),
  g("Qrammatika · will vs going to",'B1',"A: 'I'm hungry.' B: 'I ___ make you a sandwich.'",["going to","am going to","is going to","'ll"],"'ll",'Ani qərar → will'),
  g("Qrammatika · will vs going to",'B1','They have planned a trip. They ___ visit Rome.',["will","'ll","going to","are going to"],'are going to','Planlaşdırılmış → going to'),
  g("Qrammatika · will vs going to",'B1','Scientists say temperatures ___ rise.',["going to","are going to","will to","'ll"],"'ll",'Proqnoz → will'),
  g("Qrammatika · will vs going to",'B1','She ___ start her diet on Monday. (decided)',["'ll","will","is going to","going to"],'is going to','Əvvəldən qərar → going to'),

  // ── B1: First Conditional ──────────────────────────────────
  g('Qrammatika · First Conditional','B1','If it rains, we ___ stay home.',["won't go",'will stayed','will stay',"didn't stay"],'will stay','If + Present Simple → will + verb'),
  g('Qrammatika · First Conditional','B1','She will call you if she ___ time.',['will have','had','has','having'],'has','If cümləsində Present Simple: if she has'),
  g('Qrammatika · First Conditional','B1','If you ___ hard, you will pass.',['will study','studied','studying','study'],'study','If + Present Simple: if you study'),
  g('Qrammatika · First Conditional','B1',"We ___ be late if we don't hurry.",['would','will','going to','are'],'will','will + verb: will be late'),
  tf('Qrammatika · First Conditional','B1','If it will rain, I will stay home.',false,"Yanlış. If cümləsində will olmur: If it RAINS, I will stay home."),
  tf('Qrammatika · First Conditional','B1','If she studies, she will pass.',true,'Doğru. If + Present Simple, will + verb. Düzgündür.'),
  tf('Qrammatika · First Conditional','B1','I will call you if I will arrive early.',false,"Yanlış. If + Present Simple: if I ARRIVE early."),
  tf('Qrammatika · First Conditional','B1','They will win if they train hard.',true,'Doğru. Düzgün First Conditional strukturu.'),
  g('Qrammatika · First Conditional','B1',"If I ___ (find) a job, I'll move out.",['will find','found','am finding','find'],'find','If + Present Simple: if I find'),
  g('Qrammatika · First Conditional','B1','You ___ feel better if you rest.',['would','going to','will','are'],'will','will + verb'),
  g('Qrammatika · First Conditional','B1',"If she ___ (not/study), she'll fail.",["doesn't study","won't study","didn't study","isn't studying"],"doesn't study","İnkar If: doesn't study"),
  g('Qrammatika · First Conditional','B1',"If they ___ the bus, they'll be late.",['miss','will miss','missed','are missing'],'miss','If + Present Simple: if they miss'),

  // ── B1: Modals ─────────────────────────────────────────────
  g('Qrammatika · Modals (should/must/might)','B1','You look tired. You ___ rest.',['must','might','can','should'],'should','Tövsiyə → should'),
  g('Qrammatika · Modals (should/must/might)','B1','This is a hospital. You ___ be quiet.',['should','might','can','must'],'must','Məcburilik → must'),
  g("Qrammatika · Modals (should/must/might)",'B1',"I'm not sure. She ___ come later.",['must','should',"can't",'might'],'might','Qeyri-müəyyənlik → might'),
  g('Qrammatika · Modals (should/must/might)','B1',"You ___ smoke in here. It's forbidden.",['should','might','must not','might not'],'must not','Qadağa → must not'),
  tf('Qrammatika · Modals (should/must/might)','B1','You should to see a doctor.',false,"Yanlış. Modaldan sonra to işlənmir: You should SEE a doctor."),
  tf('Qrammatika · Modals (should/must/might)','B1','She must finish the report today.',true,'Doğru. must + əsas forma. Düzgündür.'),
  tf('Qrammatika · Modals (should/must/might)','B1','He mights be at home.',false,"Yanlış. Might -s almır: He MIGHT be at home."),
  tf('Qrammatika · Modals (should/must/might)','B1','You should eat more vegetables.',true,'Doğru. should + əsas forma. Düzgündür.'),
  g('Qrammatika · Modals (should/must/might)','B1',"It ___ be true — I'm not certain.",['must','should','can','might'],'might','Qeyri-müəyyənlik → might'),
  g('Qrammatika · Modals (should/must/might)','B1','Students ___ wear uniform at school.',['might','should','can','must'],'must','Məcburilik (qayda) → must'),
  g('Qrammatika · Modals (should/must/might)','B1',"You ___ drink more water. It's good for you.",['must','might','can','should'],'should','Tövsiyə → should'),
  g('Qrammatika · Modals (should/must/might)','B1','She ___ be home — the lights are off.',['might','should','can','must'],'might','Ehtimal → might'),

  // ── B1: Relative clauses ───────────────────────────────────
  g('Qrammatika · Relative clauses','B1','The man ___ lives next door is a doctor.',['which','what','whose','who'],'who','İnsan → who'),
  g('Qrammatika · Relative clauses','B1','The book ___ I bought is great.',['who','what','whose','which'],'which','Əşya → which'),
  g('Qrammatika · Relative clauses','B1','This is the city ___ I was born.',['who','which','whose','where'],'where','Yer → where'),
  g('Qrammatika · Relative clauses','B1','The girl ___ bag was stolen called the police.',['who','which','that','whose'],'whose','Sahiblik → whose'),
  tf('Qrammatika · Relative clauses','B1','The film which I saw it was great.',false,'Yanlış. which artıq it-i əvəz edir: The film WHICH I saw was great.'),
  tf('Qrammatika · Relative clauses','B1','She is the teacher who helped me most.',true,'Doğru. İnsan → who. Düzgündür.'),
  tf('Qrammatika · Relative clauses','B1','This is the house where I grew up.',true,'Doğru. Yer → where. Düzgündür.'),
  tf('Qrammatika · Relative clauses','B1','He is the man which lives here.',false,'Yanlış. İnsan → who: He is the man WHO lives here.'),
  g('Qrammatika · Relative clauses','B1','2005 is the year ___ I was born.',['who','which','where','when'],'when','Zaman → when'),
  g('Qrammatika · Relative clauses','B1','The woman ___ I met was very kind.',['which','whose','where','who'],'who','İnsan → who'),
  g('Qrammatika · Relative clauses','B1','The car ___ he drives is expensive.',['who','where','whose','which'],'which','Əşya → which'),
  g('Qrammatika · Relative clauses','B1','I know a man ___ father is famous.',['who','which','that','whose'],'whose','Sahiblik → whose'),

  // ── B1: Passive voice ──────────────────────────────────────
  g('Qrammatika · Passive voice','B1','This book ___ by Tolstoy. (write)',['is written','was written','writes','wrote'],'was written','Keçmiş passiv: was + V3'),
  g('Qrammatika · Passive voice','B1','English ___ all over the world. (speak)',['spoke','is spoken','is speaking','speaks'],'is spoken','İndiki passiv: is + V3'),
  g('Qrammatika · Passive voice','B1','The cake ___ by the children. (eat)',['is eaten','were eating','was eaten','eat'],'was eaten','Keçmiş passiv: was + V3'),
  g('Qrammatika · Passive voice','B1','The report ___ tomorrow. (submit)',['submits','will submit','will be submitted','is submitted'],'will be submitted','Gələcək passiv: will be + V3'),
  tf('Qrammatika · Passive voice','B1','The car was stole last night.',false,'Yanlış. Passivdə V3 lazımdır: The car was STOLEN.'),
  tf('Qrammatika · Passive voice','B1','Mistakes were made.',true,'Doğru. Keçmiş passiv: were + V3. Düzgündür.'),
  tf('Qrammatika · Passive voice','B1','The letter is been written.',false,"Yanlış. İndiki passiv: The letter IS WRITTEN."),
  tf('Qrammatika · Passive voice','B1','The bridge was built in 1990.',true,'Doğru. Keçmiş passiv: was + V3 (built). Düzgündür.'),
  g('Qrammatika · Passive voice','B1','The window ___ by the ball. (break)',['broke','was broken','is breaking','breaks'],'was broken','Keçmiş passiv: was + V3'),
  g('Qrammatika · Passive voice','B1','Dinner ___ at 7 every night. (serve)',['serves','served','is served','was served'],'is served','İndiki passiv: is + V3'),
  g('Qrammatika · Passive voice','B1','New houses ___ in our area. (build)',['are building','were built','build','is built'],'were built','Keçmiş passiv çoxluq: were + V3'),
  g('Qrammatika · Passive voice','B1','The email ___ just now. (send)',['is sent','sent','was sent','will be sent'],'was sent','Keçmiş passiv: was + V3 sent'),
];

console.log('New questions count:', newQs.length);
const ids = newQs.map(q => q.id);
const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
console.log('Duplicate IDs:', dupIds.length > 0 ? dupIds : 'none');

// Count per topic
const byTopic = {};
newQs.forEach(q => { byTopic[q.topic] = (byTopic[q.topic] || 0) + 1; });
Object.entries(byTopic).forEach(([t, c]) => console.log(c, '|', t));

// Append and save
const combined = [...existing, ...newQs];
fs.writeFileSync('./src/data/quizzes.json', JSON.stringify(combined, null, 2), 'utf8');
console.log('\nTotal quizzes now:', combined.length);
