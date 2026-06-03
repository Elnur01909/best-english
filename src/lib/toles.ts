// TOLES Hüquqi İngilis Sertifikat Sistemi

export const TOLES_LEVELS = {
  Foundation: {
    level: 'Foundation',
    cefr: 'A2–B1',
    description: 'Əsas hüquqi terminlər, sadə müqavilə dilində',
    hours: '150–250',
    focus: ['Əsas söz dəsti', 'Rəsmi yazı', 'Sadə işlər oxuma'],
    color: 'bg-emerald-100 text-emerald-700',
    badgeColor: 'bg-emerald-600',
  },
  Higher: {
    level: 'Higher',
    cefr: 'B2',
    description: 'Orta hüquqi sənədlər, mürəkkəb müqavilələr',
    hours: '250–450',
    focus: ['Müqavilə terminlərə yiyələnmə', 'Məhkəmə yazışmaları', 'Nüanslar'],
    color: 'bg-blue-100 text-blue-700',
    badgeColor: 'bg-blue-600',
  },
  Advanced: {
    level: 'Advanced',
    cefr: 'C1',
    description: 'Mürəkkəb hüquqi sənədlər, ixtisaslaşmış dilsel',
    hours: '450–700',
    focus: ['Hüquqi doktrinalar', 'M&A sənədləri', 'Native səviyyəsi profisyonallıq'],
    color: 'bg-red-100 text-red-700',
    badgeColor: 'bg-red-600',
  },
} as const;

// TOLES Kollokasiyaları — Hüquqi çoxlu-sözlü ifadələr
export const TOLES_COLLOCATIONS = [
  // Contract Law
  { term: 'enter into', meaning: 'müqavilə bağlamaq', example: 'enter into a contract' },
  { term: 'in breach of', meaning: 'pozulması', example: 'in breach of contract' },
  { term: 'liable for', meaning: 'məsul olmaq', example: 'liable for damages' },
  { term: 'in force', meaning: 'qüvvədə olmaq', example: 'the agreement is in force' },

  // Litigation
  { term: 'file a claim', meaning: 'iddia qaldırmaq', example: 'file a claim in court' },
  { term: 'pass judgment', meaning: 'hüküm çıxarmaq', example: 'the court passed judgment' },
  { term: 'burden of proof', meaning: 'sübut yükü', example: 'the burden of proof rests with' },

  // Company Law
  { term: 'on behalf of', meaning: 'adından', example: 'sign on behalf of the company' },
  { term: 'subject to', meaning: 'tabe olmaq', example: 'subject to approval' },

  // Employment
  { term: 'unlawfully dismissed', meaning: 'qanunsuz şəkildə işdən çıxarılmak', example: 'was unlawfully dismissed' },
];

export function getTOLESLevel(level: string) {
  return TOLES_LEVELS[level as keyof typeof TOLES_LEVELS] || TOLES_LEVELS.Foundation;
}

export function getTOLESProgress(currentLevel: string): {
  current: number;
  total: number;
  nextLevel: string | null;
  hoursRemaining: string;
} {
  const levels = Object.keys(TOLES_LEVELS);
  const currentIdx = levels.indexOf(currentLevel);

  return {
    current: currentIdx + 1,
    total: levels.length,
    nextLevel: currentIdx < levels.length - 1 ? levels[currentIdx + 1] : null,
    hoursRemaining: TOLES_LEVELS[levels[currentIdx + 1] as keyof typeof TOLES_LEVELS]?.hours || '',
  };
}
