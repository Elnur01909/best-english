// FSI (ABŞ Xarici İşlər Bakanlığı) + CEFR — Saatlar Cədvəli

export const PROFICIENCY_HOURS = [
  {
    from: 'Sıfır',
    to: 'A2 (Elementar)',
    hours: '150–250',
    months_1h: '5–8',
    months_2h: '3–4',
    immersion_4h: '5–8 həftə',
  },
  {
    from: 'A2',
    to: 'B1 (Orta)',
    hours: '200–350',
    months_1h: '7–12',
    months_2h: '4–6',
    immersion_4h: '7–12 həftə',
  },
  {
    from: 'B1',
    to: 'B2 (Yüksək Orta)',
    hours: '300–500',
    months_1h: '10–17',
    months_2h: '5–8',
    immersion_4h: '3–4 ay',
  },
  {
    from: 'B2',
    to: 'C1 (Qabaqcıl)',
    hours: '400–600',
    months_1h: '13–20',
    months_2h: '7–10',
    immersion_4h: '4–5 ay',
  },
  {
    from: 'C1',
    to: 'C2 (Native-yaxın)',
    hours: '500–700+',
    months_1h: '17–24',
    months_2h: '8–12',
    immersion_4h: '5–6 ay',
  },
];

export const TOTAL_PATHWAY = {
  sifir_to_c2: {
    hours: '1500–2400',
    months_1h: '4–7 il',
    months_2h: '2–3.5 il',
    immersion_4h: '12–18 ay',
  },
  sifir_to_c1: {
    hours: '1000–1500',
    months_1h: '2.5–4 il',
    months_2h: '1.5–2.5 il',
    immersion_4h: '8–12 ay',
  },
};

export function getTimeToNextLevel(currentLevel: string, dailyMinutes: number): string {
  const hoursPerDay = dailyMinutes / 60;
  const hourRanges: Record<string, { min: number; max: number }> = {
    'Sıfır': { min: 150, max: 250 },
    'A2': { min: 200, max: 350 },
    'B1': { min: 300, max: 500 },
    'B2': { min: 400, max: 600 },
    'C1': { min: 500, max: 700 },
  };

  const range = hourRanges[currentLevel];
  if (!range) return 'Bilinmir';

  const minDays = range.min / hoursPerDay;
  const maxDays = range.max / hoursPerDay;
  const minMonths = Math.round(minDays / 30);
  const maxMonths = Math.round(maxDays / 30);

  return `${minMonths}–${maxMonths} ay`;
}
