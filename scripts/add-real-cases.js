const fs = require('fs');
const cases = require('../src/data/cases.json');

const newCases = [
  {
    id: 11,
    title: "Salmon Ferması — Dəniz Çirklənməsi İddiası",
    description: "İskoçiya sahillərindəki neft tökülməsi local salmon fermasına zərər vurur; çirkləndirici məhkəmədə məsuliyyətli tanınır.",
    scenario: "2005-ci ildə Klyne Marine Services şirkətinə məxsus 'The Anglian Sovereign' gəmisi İskoçiyanın Shetland adaları yaxınlığındaki Oxna adası sahilindəki qayalara çırpıldı. Bu qəza zamanı gəminin yanacaq çənəsi deşilərək 84 ton dizel yanacağı dənizə axdı. Soruşturma nəticəsindəki gəmi kapitanı Peter Leask-ın qanuni həddən üç dəfə artıq alkoqol içdiyi sübut edildi; kapitan 2006-cı ilin martında 8 ay həbs cəzasına məhkum edildi. Yerli salmon istehsalı şirkəti Hjaltland Sea Farms, Klyne Marine Services-ə qarşı üç hissəli mülki iddia qaldırdı: üç fermasında üç günlük iş dayanmasına görə itirilən mənfəət; böhranı idarə etmək üçün sərf edilmiş əlavə idarəetmə vaxtı; və təmizlik avadanlığı alınması xərci. Lerwick Şerif Məhkəməsi 2010-cu ilin iyulunda müddəiyə £24,020.71 itirilən mənfəət daxil olmaqla cəmi £25,120.71, üstəgəl beş il üzrə 8% faiz hökmünü çıxardı. Klyne Marine Services apellyasiya verdi, lakin daha sonra vazkeçdi. Bu iş mühüm presedent yaratdı: dənizi çirkləndirən hər kəs balıqçılıq sənayesinin zərər görəcəyini tamamilə qabaqcadan görmüş hesab edilməlidir; belə öncədən görülə bilən (foreseeable) zərər olduqda isə zərərçəkmiş tərəf kompensasiya almağa haqlıdır.",
    relatedTerms: [5, 6, 7, 8, 37, 38, 83],
    questions: [
      "Kapitanın davranışı Klyne Marine Services-in hüquqi məsuliyyətinə necə təsir etdi?",
      "Müddəinin üç hissəli zərər tələbini izah edin — hər bir hissənin hüquqi əsası nə idi?",
      "Bu işin yaratdığı presedent gələcək dəniz çirklənməsi davalarına necə tətbiq oluna bilər?"
    ],
    difficulty: "Foundation",
    source: "Hjaltland Sea Farms v Klyne Marine Services, Lerwick Sheriff Court (2010)",
    area: "Tort Law / Environmental"
  },
  {
    id: 12,
    title: "'Hari Puttar' — Əqli Mülkiyyət Hüququ Mübahisəsi",
    description: "Warner Brothers Hindistan film şirkətini Harry Potter marka pozuntusu iddiasıyla məhkəməyə verir, lakin Delhi məhkəməsi cavabdeh xeyrinə qərar çıxarır.",
    scenario: "2008-ci ilin sentyabrında ABŞ-ın nəhəng film studiyası Warner Brothers, Hindistanın Mirchi Movies şirkətini Delhi məhkəməsindəki əqli mülkiyyət hüquqlarının pozulmasına görə məhkəməyə verdi. Mirchi Movies 'Hari Puttar' adlı bir film hazırlamışdı — İngiltərəyə gələrək dünyanı xilas edən on yaşlı Hindistan uşağı haqqında hekayə. Warner Brothers iddia edirdi ki, 'Hari Puttar' adı 'Harry Potter' adına çox bənzəyir və tamaşaçılar arasında qarışıqlıq yarada bilər. Hakim cavabdeh xeyrinə qərar verdi və üç əsas əsas göstərdi: birincisi, J.K. Rowling-in kitablarının oxucuları savadlı insanlardır və 'Potter' ilə 'Puttar' arasındakı fərqi ayırd edə bilərlər; ikincisi, 'Hari' Hindistanda çox yayılmış bir addır, 'Puttar' isə hindi dilindəki 'oğul' demək olub 'Potter' ilə heç bir bağlantısı yoxdur; üçüncüsü, iki filmin hekayəsi tamamilə fərqlidir. Bundan başqa, hakim qeyd etdi ki, Warner Brothers filmin adından 2005-ci ildə xəbərdar olmasına baxmayaraq, film tam hazır olana qədər məhkəməyə müraciəti gecikdirdi — bu isə Mirchi Movies-in filmin çıxışından əvvəlki reklam kampaniyasına ciddi zərər vurdu.",
    relatedTerms: [6, 7, 61, 62, 64, 65],
    questions: [
      "Hakimin 'Hari Puttar' işindəki markanın qarışıqlığa yol aça biləcəyi iddiasını rədd etmək üçün gətirdiyi üç əsası izah edin.",
      "Warner Brothers-ın iddianı gec qaldırmasının Mirchi Movies-ə vurduğu zərər hüquqi baxımdan nə üçün əhəmiyyətlidir?",
      "Bir əqli mülkiyyət iddiasında məhkəmənin 'ictimai qarışıqlıq' ehtimalını qiymətləndirərkən hansı amilləri nəzərə alması lazımdır?"
    ],
    difficulty: "Higher",
    source: "Warner Brothers Entertainment Inc. v Mirchi Movies, Delhi High Court (2008)",
    area: "Intellectual Property"
  },
  {
    id: 13,
    title: "'Cəhənnəmdən Qonşular' — Əmlak Açıqlama İddiası",
    description: "Ev satıcıları 12 illik qonşuluq mübahisəsini gizlətdiklərinə görə alıcılara £70,000 kompensasiya ödəmək məcburiyyətinə qaldılar.",
    scenario: "2009-cu ilin noyabrında Londonlu jurnalistlər Robert və Anne Young, Bournemouth yaxınlığındakı Burbridge-dəki 1 Oaklands ünvanındaki evi Philip və Francesca Longbottomdan £200,000-a aldılar. İngiltərə torpaq hüququ satıcılara 'Satıcının Əmlak Məlumat Forması' (SPIF) doldurarkən qonşularla mübahisələr də daxil olmaqla mühüm məlumatları açıqlamağı məcbur edir. Longbottomlar formada heç bir qonşuluq problemi olmadığını yazdılar. Lakin məlum oldu ki, onların qonşu Avilez ailəsi ilə 12 illik sənədli mübahisə tarixi var idi — hakim bu ailəni 'cəhənnəmdən qonşular' adlandırdı (gecə boyu gurultu, narkotik satışı, 12 pişik, 5 it). Young cütlüyü mülkiyyəti aldıqdan sonra bu həqiqətlə üzləşdi. Ali Məhkəmə müddəilər xeyrinə qərar çıxarıb Longbottomları mühüm məlumatın açıqlanmamasına görə £70,000 üstəgəl hüquqi xərclər ödəməyə məhkum etdi. Hüquqşünaslar bu işdən sonra oxşar iddia dalğasının gözlənildiyini bildirdilər.",
    relatedTerms: [8, 11, 36, 74, 80],
    questions: [
      "SPIF-in doldurulan tərki nə üçün satıcılar tərəfindən yanıltma kimi qiymətləndirildi?",
      "Bu işdəki iddiasının hüquqi əsaslarını izah edin — hansı hüquq sahəsi tətbiq edildi?",
      "Bu iş əmlak satışında açıqlama öhdəlikləri baxımından satıcılara hansı praktik dərsi verir?"
    ],
    difficulty: "Foundation",
    source: "Young v Longbottom, High Court (2010)",
    area: "Property Law / Contract Law"
  },
  {
    id: 14,
    title: "Peakman v Linbrooke — £265 Fərqi Üçün £100,000 Xərc",
    description: "Bir telekommunikasiya işçisinin kiçik iddiası proporsiyasız xərclərə çevrilir; Apellyasiya Məhkəməsi əks-iddiasının əsassız olduğunu elan edir.",
    scenario: "2008-ci ildə London Apellyasiya Məhkəməsi 'Peakman v Linbrooke Services' işinə yenidən baxdı; ilk iş Sheffield Şəhər Məhkəməsindəki baxılmışdı. Apellyasiya hakimi Lord Justice Goldring işi 'dərindən narahatlandırıcı' adlandırdı — bir neçə min funt sterlinq mübahisəsi üçün ümumi hüquqi xərclər £100,000-ı aşmışdı. Faktlara görə, telekommunikasiya şirkəti Linbrooke Services, müştərisi Thales Group üçün dəmir yolu xətti yanındaki kabel işləri üçün Bay Peakmanı müqaviləli işçi kimi işə götürdü. Linbrooke işi 'qüsurlu' adlandıraraq müqaviləyə xitam verdi. Bay Peakman £2,232 iddia qaldırdı (müqavilə pozulması, benzin xərcləri, itirilmiş alətlər). Linbrooke isə £3,019 (düzəliş xərcləri) üstəgəl təxminən £40,000 (Thales müqaviləsinin itirilməsi) olmaqla əks-iddia qaldırdı. Hakim Robinson Bay Peakman üçün £1,145, Linbrooke üçün £1,410 hökm etdi — xalis fərq cəmi £265 idi. Lord Justice Goldring isə əks-iddiasının 'heç bir əsası olmadığını' və birinci hakimin onu qəbul etməkdə yanıldığını bildirdi. İş apellyasiya daxil olmaqla doqquz gün davam etdi.",
    relatedTerms: [4, 7, 8, 36, 37],
    questions: [
      "Bay Peakmanın iddiasının hüquqi əsaslarını izah edin — hansı növ kompensasiya tələb edildi?",
      "Apellyasiya məhkəməsi Linbrookeun £40,000-lıq əks-iddiasını nə üçün 'əsassız' hesab etdi?",
      "Bu iş hüquqi xərclərin mübahisənin dəyərini aşması problemi baxımından hansı siyasi məsələni gündəmə gətirir?"
    ],
    difficulty: "Higher",
    source: "Peakman v Linbrooke Services, Court of Appeal (2008)",
    area: "Contract Law / Civil Procedure"
  }
];

const maxId = Math.max(...cases.map(c => c.id));
const conflicts = newCases.filter(c => cases.some(e => e.id === c.id));

if (conflicts.length > 0) {
  console.log('ID conflicts:', conflicts.map(c => c.id));
  process.exit(1);
}

const updated = [...cases, ...newCases];
fs.writeFileSync('./src/data/cases.json', JSON.stringify(updated, null, 2));
console.log('Done. Added:', newCases.length, '| New total:', updated.length, '| Max existing ID was:', maxId);
