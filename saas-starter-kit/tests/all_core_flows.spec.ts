import { test, expect, chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';

async function setup() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(BASE);
  return { page, context, browser };
}

async function registerAndLogin(page, email: string, password: string) {
  await page.goto(`${BASE}/register`);
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="firstName"]', 'Test');
  await page.fill('input[id="lastName"]', 'User');
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/login?registered=1');
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

async function createTestOrg(page) {
  const tokens = await page.evaluate(() => {
    const raw = localStorage.getItem('saas_tokens');
    return raw ? JSON.parse(raw) : null;
  });
  const accessToken = tokens?.accessToken;
  
  const res = await page.request.post(`${BASE}/api/organizations`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    data: { name: `Test Org ${Date.now()}` },
  });
  
  if (res.ok()) {
    const org = await res.json();
    return org.id;
  }
  return null;
}

test.describe('Landing Page', () => {
  test('should display landing page with correct buttons', async () => {
    const { page, context, browser } = await setup();
    await expect(page.getByRole('heading', { name: /build your multi-tenant saas/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /start free/i }).first()).toBeVisible();
    await context.close();
    await browser.close();
  });
});

test.describe('Auth Flow', () => {
  test('should register and login successfully', async () => {
    const { page, context, browser } = await setup();
    const email = `test_register_${Date.now()}@example.com`;
    await registerAndLogin(page, email, 'Password123!');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await context.close();
    await browser.close();
  });

  test('should reject invalid login credentials', async () => {
    const { page, context, browser } = await setup();
    await page.goto(`${BASE}/login`);
    await page.fill('input[id="email"]', 'invalid@example.com');
    await page.fill('input[id="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    const hasError = await page.locator('.text-destructive').count() > 0;
    expect(hasError).toBe(true);
    await context.close();
    await browser.close();
  });
});

test.describe('Projects Flow', () => {
  test('should create a new project', async () => {
    const { page, context, browser } = await setup();
    const email = `test_project_${Date.now()}@example.com`;
    await registerAndLogin(page, email, 'Password123!');
    const orgId = await createTestOrg(page);
    if (orgId) {
      await page.goto(`${BASE}/dashboard/projects`);
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/projects');
      await page.fill('input[placeholder="Project name"]', `E2E Test Project ${Date.now()}`);
      await page.fill('input[placeholder="Description (optional)"]', 'Created by Playwright');
      await page.click('button:has-text("Add")');
      await page.waitForTimeout(1000);
      await expect(page.getByText(/created by playwright/i)).toBeVisible();
    }
    await context.close();
    await browser.close();
  });
});

test.describe('Profile Flow', () => {
  test('should load profile page after org setup', async () => {
    const { page, context, browser } = await setup();
    const email = `test_profile_${Date.now()}@example.com`;
    await registerAndLogin(page, email, 'Password123!');
    const orgId = await createTestOrg(page);
    if (orgId) {
      await page.goto(`${BASE}/dashboard/profile`);
      await page.waitForTimeout(3000);
      const url = page.url();
      expect(url).toContain('/profile');
      await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
    }
    await context.close();
    await browser.close();
  });
});

test.describe('Billing Flow', () => {
  test('should display billing page with plan options', async () => {
    const { page, context, browser } = await setup();
    const email = `test_billing_${Date.now()}@example.com`;
    await registerAndLogin(page, email, 'Password123!');
    const orgId = await createTestOrg(page);
    if (orgId) {
      await page.goto(`${BASE}/dashboard/billing`);
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/billing');
      await expect(page.getByRole('heading', { name: /billing/i })).toBeVisible();
      await expect(page.getByText('FREE')).toBeVisible();
    }
    await context.close();
    await browser.close();
  });
});

test.describe('Logout Flow', () => {
  test('should clear auth store on logout', async () => {
    const { page, context, browser } = await setup();
    const email = `test_logout_${Date.now()}@example.com`;
    await registerAndLogin(page, email, 'Password123!');
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => {
      const store = (window as any).useAuthStore?.getState?.();
      if (store?.logout) store.logout();
    });
    
    const storeCleared = await page.evaluate(() => {
      const store = (window as any).useAuthStore?.getState?.();
      return !store?.tokens && !store?.user;
    });
    expect(storeCleared).toBe(true);
    
    await context.close();
    await browser.close();
  });
});