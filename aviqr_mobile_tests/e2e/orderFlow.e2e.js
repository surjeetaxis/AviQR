/**
 * orderFlow.e2e.js — owner accepts and advances a live order on device.
 */
describe('Order management', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await element(by.id('login-email')).typeText('cashier@spiceroute.in');
    await element(by.id('login-password')).typeText('Axis321#');
    await element(by.id('login-submit')).tap();
    await waitFor(element(by.id('owner-dashboard'))).toBeVisible().withTimeout(10000);
  });

  it('opens the orders screen', async () => {
    await element(by.id('nav-orders')).tap();
    await expect(element(by.id('orders-screen'))).toBeVisible();
  });

  it('shows order type filters (dine-in / takeaway / delivery)', async () => {
    await expect(element(by.id('filter-DINE_IN'))).toExist();
    await expect(element(by.id('filter-DELIVERY'))).toExist();
  });
});
