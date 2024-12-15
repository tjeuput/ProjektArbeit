import { test, expect } from '@playwright/test';
import { testScheduleData } from './test-data';

test.describe('Schichtrotation Functionality', () => {
  test('manager can create new rotation plan', async ({ page }) => {
    await page.goto('/schichtrotation');
    
    // Fill in rotation plan form
    await page.selectOption('select[name="gruppe"]', testScheduleData.group);
    await page.fill('input[name="dateRange"]', [
      testScheduleData.dateRange.start,
      testScheduleData.dateRange.end
    ]);
    
    // Fill in weekly schedule
    const weeklySchedule = testScheduleData.weeklySchedule[0];
    await page.selectOption('select[name="mo"]', weeklySchedule.shifts.mo);
    await page.selectOption('select[name="di"]', weeklySchedule.shifts.di);
    await page.selectOption('select[name="mi"]', weeklySchedule.shifts.mi);
    await page.selectOption('select[name="do"]', weeklySchedule.shifts.do);
    await page.selectOption('select[name="fr"]', weeklySchedule.shifts.fr);
    await page.selectOption('select[name="sa"]', weeklySchedule.shifts.sa);
    await page.selectOption('select[name="so"]', weeklySchedule.shifts.so);
    
    // Submit form
    await page.click('button:text("Zuweisung")');
    
    // Verify success
    await expect(page.locator('.ant-message-success')).toBeVisible();
    await expect(page.locator('.ant-message-success')).toContainText('erfolgreich erstellt');
  });

  test('user can view rotation plan', async ({ page }) => {
    await page.goto('/schichtrotation');
    
    // Verify read-only access
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('select[name="gruppe"]')).toBeVisible();
    await expect(page.locator('button:text("Zuweisung")')).toBeDisabled();
  });

  test('manager can modify existing plan', async ({ page }) => {
    await page.goto('/schichtrotation');
    
    // Select existing plan
    await page.click('table >> text="Test Group 1"');
    
    // Modify schedule
    await page.selectOption('select[name="mo"]', '2');
    
    // Save changes
    await page.click('button:text("Speichern")');
    
    // Verify success
    await expect(page.locator('.ant-message-success')).toBeVisible();
    await expect(page.locator('.ant-message-success')).toContainText('erfolgreich aktualisiert');
  });

  test('conflict detection works', async ({ page }) => {
    await page.goto('/schichtrotation');
    
    // Create overlapping schedule
    await page.selectOption('select[name="gruppe"]', testScheduleData.group);
    await page.fill('input[name="dateRange"]', [
      testScheduleData.dateRange.start,
      testScheduleData.dateRange.end
    ]);
    
    // Submit form
    await page.click('button:text("Zuweisung")');
    
    // Verify conflict warning
    await expect(page.locator('.ant-modal-content')).toBeVisible();
    await expect(page.locator('.ant-modal-content')).toContainText('bereits Dienstpläne');
  });
});