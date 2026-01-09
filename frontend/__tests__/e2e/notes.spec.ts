import { test, expect } from '@playwright/test';

test('should display notes (mocked)', async ({ page }) => {
  // Mock login tokens
  await page.addInitScript(() => {
    window.localStorage.setItem('access_token', 'test');
    window.localStorage.setItem('refresh_token', 'test');
  });

  await page.route('**/api/v1/grades**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: '1', subject_name: 'Maths', evaluation_name: 'DS1', marks_obtained: 18, marks_total: 20, coefficient: 2, date: '2026-01-01' }
      ])
    });
  });

  await page.route('**/api/v1/grades/summary**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ average: 16.5, rank: 3, total: 12, progress: 4 }) });
  });

  await page.goto('/notes');
  await expect(page.locator('text=Notes')).toBeVisible();
  await expect(page.locator('text=Maths')).toBeVisible();
  await expect(page.locator('text=18/20')).toBeVisible();
});
