I've set up Playwright with a test suite covering login, dashboard, project creation, billing, and profile flows. However, tests fail because Playwright cannot find the required browser executable (chrome-headless-shell). This is likely due to an incomplete browser installation. To resolve:

1. Delete the existing Playwright cache: `rm -rf ~/.cache/ms-playwright`
2. Reinstall Playwright dependencies: `npm install --save-dev @playwright/test`
3. Run `npx playwright install` and wait for browsers to download completely (may take several minutes)
4. Verify the browser binary exists at `~/.cache/ms-playwright/chromium-*/chrome-headless-shell-linux64/chrome-headless-shell`
5. Rerun tests with `npm test`

If issues persist, verify network connectivity to the Playwright CDN or consider using a different testing approach.