# Playwright End-to-End Testing

## Overview

End-to-end tests cover the core user flows of the SaaS Starter Kit: landing page, authentication, dashboard navigation, project creation, profile management, billing, and logout.

**Test file:** `tests/all_core_flows.spec.ts`

## Prerequisites

- Node.js >= 20
- Frontend running on `http://localhost:3000`
- Backend (NestJS) running on `http://localhost:3001` (frontend proxies `/api` to it)
- Playwright browsers installed

## Installation

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

**Note:** If the Playwright download hangs, you can use a system Chrome instead:

```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/google-chrome
```

## Running Tests

```bash
# Run all E2E tests
export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/google-chrome
npx playwright test tests/all_core_flows.spec.ts --workers=1

# Run a specific test
npx playwright test tests/all_core_flows.spec.ts --grep "Projects Flow" --workers=1

# Run with UI mode for debugging
npx playwright test --ui
```

## Test Structure

Each test is independent and self-contained:

| Test | Flow |
|------|------|
| `Landing Page` | Verifies heading, Sign in link, Start free link |
| `Auth Flow — register/login` | Full registration → login → dashboard redirect |
| `Auth Flow — invalid credentials` | Submits empty/invalid login, expects error |
| `Projects Flow` | Creates org via API, navigates to projects, creates a project |
| `Profile Flow` | Loads profile page, verifies form fields |
| `Billing Flow` | Displays plan cards (FREE, MONTHLY, ANNUAL) |
| `Logout Flow` | Verifies auth store clears on logout |

## Key Patterns

### Unique Test Data
Each test generates a unique email using `Date.now()` to avoid registration conflicts:

```ts
const email = `test_${Date.now()}@example.com`;
```

### Organization Setup
New users don't have an organization by default. Tests create one via API:

```ts
const tokens = await page.evaluate(() => localStorage.getItem('saas_tokens'));
const accessToken = JSON.parse(tokens).accessToken;

const res = await page.request.post(`${BASE}/api/organizations`, {
  headers: { Authorization: `Bearer ${accessToken}` },
  data: { name: `Test Org ${Date.now()}` },
});
```

### Resilient Selectors
Tests use text-based selectors instead of CSS classes:

```ts
await page.getByRole('link', { name: 'Projects' }).click();
await page.click('button:has-text("Add")');
await expect(page.getByRole('heading', { name: /billing/i })).toBeVisible();
```

## Configuration

Playwright config: `playwright.config.ts`

- Base URL: `http://localhost:3000`
- Headless: `true`
- Timeout: `60s` per test
- Expect timeout: `10s`
- Trace/screenshot/video retained on failure

## Known Issues

1. **Permission-gated sidebar links**: The `<Can>` component hides sidebar links (Projects, Tasks, Billing, etc.) for users without the corresponding permission. New test users need an organization created before these links appear.

2. **Logout doesn't clear localStorage**: The `logout()` function in `useAuthStore` clears the Zustand store but leaves `saas_tokens` in `localStorage`. Cookies are cleared. This is a potential security issue.

3. **Backend dependency**: Tests require the NestJS backend on `:3001`. If it's down, tests may hang or fail.

4. **Browser installation**: Playwright's default browser download may be slow or incomplete. Using a system Chrome via `PLAYWRIGHT_CHROMIUM_EXECUTABLE` is more reliable in some environments.

## CI Integration

For GitHub Actions or similar:

```yaml
- name: Run E2E tests
  env:
    PLAYWRIGHT_CHROMIUM_EXECUTABLE: /usr/bin/google-chrome
  run: npx playwright test tests/all_core_flows.spec.ts --workers=1
```

## Debugging

- Screenshots and traces are saved on failure in `test-results/`
- Run with `--debug` for Playwright Inspector
- Use `page.pause()` in tests to pause execution and inspect
