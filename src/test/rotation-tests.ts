import { test, expect } from '@playwright/test';
import { formatDate } from '../utils/date-helpers';

interface ShiftPattern {
  mo: string;
  di: string;
  mi: string;
  do: string;
  fr: string;
  sa: string;
  so: string;
}

const testPatterns: ShiftPattern[] = [
  {
    mo: '1',  // Frühdienst
    di: '2',  // Spätdienst
    mi: '3',  // Nachtdienst
    do: '1',  // Frühdienst
    fr: '2',  // Spätdienst
    sa: 'fr', // Frei
    so: 'fr'  // Frei
  },
  {
    mo: '2',  // Spätdienst
    di: '3',  // Nachtdienst
    mi: '1',  // Frühdienst
    do: '2',  // Spätdienst
    fr: '3',  // Nachtdienst
    sa: 'fr', // Frei
    so: 'fr'  // Frei
  }
];

test.describe('Schichtrotation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as manager
    await page.goto('/login');
    await page.fill('[name="username"]', 'manager_test');
    await page.fill('[name="password"]', 'manager_password');
    await page.click('button[type="submit"]');
    await page.goto('/schichtrotation');
  });

  test('Erstellen eines Grundmusters für Schichtrotation', async ({ page }) => {
    // Select group and timeframe
    await page.selectOption('select[name="gruppe"]', 'Test Group 1');
    const startDate = formatDate(new Date());
    const endDate = formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
    
    await page.fill('input[name="datumbereich"][type="start"]', startDate);
    await page.fill('input[name="datumbereich"][type="end"]', endDate);

    // Fill in the first week's pattern
    const pattern = testPatterns[0];
    await page.selectOption('select[name="wochenplan.0.mo"]', pattern.mo);
    await page.selectOption('select[name="wochenplan.0.di"]', pattern.di);
    await page.selectOption('select[name="wochenplan.0.mi"]', pattern.mi);
    await page.selectOption('select[name="wochenplan.0.do"]', pattern.do);
    await page.selectOption('select[name="wochenplan.0.fr"]', pattern.fr);
    await page.selectOption('select[name="wochenplan.0.sa"]', pattern.sa);
    await page.selectOption('select[name="wochenplan.0.so"]', pattern.so);

    // Submit rotation pattern
    await page.click('button:text("Zuweisung")');

    // Verify success
    await expect(page.locator('.ant-message-success')).toBeVisible();
    await expect(page.locator('.ant-message-success')).toContainText('Schichtrotation erfolgreich erstellt');
  });

  test('Prüfung der Arbeitszeit- und Ruhezeitregelungen', async ({ page }) => {
    // Create rotation that violates rest period rules
    await page.selectOption('select[name="gruppe"]', 'Test Group 1');
    
    // Set up a pattern that breaks rest period rules (e.g., Night -> Early shift)
    const invalidPattern = {
      mo: '3', // Nachtdienst
      di: '1', // Frühdienst (violation: not enough rest time)
      mi: '2',
      do: '3',
      fr: '1', // Another violation
      sa: 'fr',
      so: 'fr'
    };

    // Fill in the pattern
    await page.selectOption('select[name="wochenplan.0.mo"]', invalidPattern.mo);
    await page.selectOption('select[name="wochenplan.0.di"]', invalidPattern.di);
    await page.selectOption('select[name="wochenplan.0.mi"]', invalidPattern.mi);
    await page.selectOption('select[name="wochenplan.0.do"]', invalidPattern.do);
    await page.selectOption('select[name="wochenplan.0.fr"]', invalidPattern.fr);
    await page.selectOption('select[name="wochenplan.0.sa"]', invalidPattern.sa);
    await page.selectOption('select[name="wochenplan.0.so"]', invalidPattern.so);

    // Try to submit
    await page.click('button:text("Zuweisung")');

    // Expect error message about rest period violation
    await expect(page.locator('.ant-message-error')).toBeVisible();
    await expect(page.locator('.ant-message-error')).toContainText('Mindestens 11 Stunden Ruhezeit');
  });

  test('Prüfung der Wochenendverteilung', async ({ page }) => {
    // Create a 4-week rotation
    await page.selectOption('select[name="zeitraum"]', '28'); // 28 days
    
    // Fill patterns ensuring fair weekend distribution
    for (let week = 0; week < 4; week++) {
      const pattern = testPatterns[week % testPatterns.length];
      
      // Fill week pattern
      await page.selectOption(`select[name="wochenplan.${week}.mo"]`, pattern.mo);
      await page.selectOption(`select[name="wochenplan.${week}.di"]`, pattern.di);
      await page.selectOption(`select[name="wochenplan.${week}.mi"]`, pattern.mi);
      await page.selectOption(`select[name="wochenplan.${week}.do"]`, pattern.do);
      await page.selectOption(`select[name="wochenplan.${week}.fr"]`, pattern.fr);
      await page.selectOption(`select[name="wochenplan.${week}.sa"]`, pattern.sa);
      await page.selectOption(`select[name="wochenplan.${week}.so"]`, pattern.so);
    }

    // Submit rotation
    await page.click('button:text("Zuweisung")');

    // Verify weekend distribution
    await expect(page.locator('.weekend-stats')).toContainText('2 freie Wochenenden');
  });

  test('Überprüfung der Schichtfolgen', async ({ page }) => {
    // Test various shift sequences
    const testSequences = [
      { sequence: ['1', '1', '1'], expectError: true, message: 'Zu viele aufeinanderfolgende Frühdienste' },
      { sequence: ['2', '2', '2'], expectError: true, message: 'Zu viele aufeinanderfolgende Spätdienste' },
      { sequence: ['3', '3', '3'], expectError: true, message: 'Zu viele aufeinanderfolgende Nachtdienste' },
      { sequence: ['1', '2', '3'], expectError: false, message: 'Gültige Schichtfolge' },
    ];

    for (const { sequence, expectError, message } of testSequences) {
      // Fill first three days with sequence
      await page.selectOption('select[name="wochenplan.0.mo"]', sequence[0]);
      await page.selectOption('select[name="wochenplan.0.di"]', sequence[1]);
      await page.selectOption('select[name="wochenplan.0.mi"]', sequence[2]);

      // Try to save
      await page.click('button:text("Zuweisung")');

      if (expectError) {
        await expect(page.locator('.ant-message-error')).toBeVisible();
        await expect(page.locator('.ant-message-error')).toContainText(message);
      } else {
        await expect(page.locator('.ant-message-success')).toBeVisible();
      }

      // Reset form for next sequence
      await page.reload();
    }
  });

  test('Berücksichtigung von Feiertagen', async ({ page }) => {
    // Set date range including a holiday
    await page.fill('input[name="datumbereich"][type="start"]', '2024-12-24'); // Christmas Eve
    await page.fill('input[name="datumbereich"][type="end"]', '2024-12-31');

    // Create rotation pattern
    const pattern = testPatterns[0];
    await page.selectOption('select[name="wochenplan.0.mo"]', pattern.mo);
    await page.selectOption('select[name="wochenplan.0.di"]', pattern.di); // Christmas Day
    await page.selectOption('select[name="wochenplan.0.mi"]', pattern.mi);
    await page.selectOption('select[name="wochenplan.0.do"]', pattern.do);
    await page.selectOption('select[name="wochenplan.0.fr"]', pattern.fr);

    // Submit and verify holiday handling
    await page.click('button:text("Zuweisung")');

    // Check if holiday shifts are marked
    await expect(page.locator('.holiday-shift')).toHaveCount(2); // Christmas Eve and Day
    await expect(page.locator('.holiday-compensation')).toBeVisible();
  });

  test('Überprüfung der Urlaubsberücksichtigung', async ({ page }) => {
    // First, set known vacation periods
    await page.click('button:text("Urlaub verwalten")');
    await page.fill('input[name="vacation-start"]', '2024-01-15');
    await page.fill('input[name="vacation-end"]', '2024-01-21');
    await page.click('button:text("Urlaub speichern")');

    // Create rotation that overlaps with vacation
    await page.fill('input[name="datumbereich"][type="start"]', '2024-01-01');
    await page.fill('input[name="datumbereich"][type="end"]', '2024-01-31');

    // Fill pattern
    const pattern = testPatterns[0];
    await page.selectOption('select[name="wochenplan.0.mo"]', pattern.mo);
    await page.selectOption('select[name="wochenplan.0.di"]', pattern.di);
    await page.selectOption('select[name="wochenplan.0.mi"]', pattern.mi);
    await page.selectOption('select[name="wochenplan.0.do"]', pattern.do);
    await page.selectOption('select[name="wochenplan.0.fr"]', pattern.fr);

    // Submit rotation
    await page.click('button:text("Zuweisung")');

    // Verify vacation periods are properly marked and handled
    await expect(page.locator('.vacation-period')).toBeVisible();
    await expect(page.locator('.vacation-conflict-warning')).not.toBeVisible();
  });
});
