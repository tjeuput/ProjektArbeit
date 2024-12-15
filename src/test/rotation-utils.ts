export interface RotationPattern {
  startDate: string;
  endDate: string;
  group: string;
  weeklyShifts: ShiftPattern[];
}

export interface ShiftPattern {
  mo: string;
  di: string;
  mi: string;
  do: string;
  fr: string;
  sa: string;
  so: string;
}

export const validateRotationPattern = async (page: any, pattern: RotationPattern) => {
  // Fill basic information
  await page.selectOption('select[name="gruppe"]', pattern.group);
  await page.fill('input[name="datumbereich"][type="start"]', pattern.startDate);
  await page.fill('input[name="datumbereich"][type="end"]', pattern.endDate);

  // Fill weekly patterns
  for (let week = 0; week < pattern.weeklyShifts.length; week++) {
    const shifts = pattern.weeklyShifts[week];
    await page.selectOption(`select[name="wochenplan.${week}.mo"]`, shifts.mo);
    await page.selectOption(`select[name="wochenplan.${week}.di"]`, shifts.di);
    await page.selectOption(`select[name="wochenplan.${week}.mi"]`, shifts.mi);
    await page.selectOption(`select[name="wochenplan.${week}.do"]`, shifts.do);
    await page.selectOption(`select[name="wochenplan.${week}.fr"]`, shifts.fr);
    await page.selectOption(`select[name="wochenplan.${week}.sa"]`, shifts.sa);
    await page.selectOption(`select[name="wochenplan.${week}.so"]`, shifts.so);
  }
};

export const checkShiftConstraints = (pattern: ShiftPattern): string[] => {
  const violations: string[] = [];
  
  // Check consecutive shifts
  const shifts = Object.values(pattern);
  let consecutiveCount = 1;
  let previousShift = shifts[0];
  
  for (let i = 1; i < shifts.length; i++) {
    if (shifts[i] === previousShift && shifts[i] !== 'fr') {
      consecutiveCount++;
      if (consecutiveCount > 3) {
        violations.push(`Zu viele aufeinanderfolgende ${shifts[i]}-Schichten`);
      }
    } else {
      consecutiveCount = 1;
    }
    previousShift = shifts[i];
  }
  
  // Check rest periods
  for (let i = 0; i < shifts.length - 1; i++) {
    if (shifts[i] === '3' && shifts[i + 1] === '1') {
      violations.push('Unzureichende Ruhezeit zwischen Nacht- und Frühdienst');
    }
  }
  
  return violations;
};

export const checkWeekendDistribution = (patterns: ShiftPattern[]): boolean => {
  let freeWeekends = 0;
  
  patterns.forEach(pattern => {
    if (pattern.sa === 'fr' && pattern.so === 'fr') {
      freeWeekends++;
    }
  });
  
  // Should have at least 2 free weekends in a 4-week cycle
  return freeWeekends >= 2;
};
