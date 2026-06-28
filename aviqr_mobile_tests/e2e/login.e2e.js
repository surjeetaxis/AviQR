/**
 * login.e2e.js — full device login flow.
 * Each role logs in and must land on its own home screen.
 * Add testID props to the login screen for these selectors to resolve.
 */
describe('Login flow', () => {
  beforeAll(async () => { await device.launchApp({ newInstance: true }); });
  beforeEach(async () => { await device.reloadReactNative(); });

  it('owner logs in and reaches the dashboard', async () => {
    await element(by.id('login-email')).typeText('sujeet@spiceroute.in');
    await element(by.id('login-password')).typeText('Axis321#');
    await element(by.id('login-submit')).tap();
    await waitFor(element(by.id('owner-dashboard'))).toBeVisible().withTimeout(10000);
  });

  it('admin logs in and reaches the admin home (NOT owner dashboard)', async () => {
    await element(by.id('login-email')).typeText('admin@aviqr.in');
    await element(by.id('login-password')).typeText('Axis321#');
    await element(by.id('login-submit')).tap();
    await waitFor(element(by.id('admin-home'))).toBeVisible().withTimeout(10000);
  });

  it('rejects wrong password with an error message', async () => {
    await element(by.id('login-email')).typeText('sujeet@spiceroute.in');
    await element(by.id('login-password')).typeText('wrongpass');
    await element(by.id('login-submit')).tap();
    await waitFor(element(by.text(/invalid/i))).toBeVisible().withTimeout(8000);
  });
});
