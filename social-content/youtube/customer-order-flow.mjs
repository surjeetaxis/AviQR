// REAL production order against Spice Route (owner: sujeet@spiceroute.in), Table 1.
// Places one real "Cash at Counter" order — no payment is charged. Pauses mid-run for a
// real email OTP: writes a screenshot + waits on OTP_FILE, the caller (Claude) fills it
// in once the user relays the code from their inbox.
import { record, finish } from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const SCRATCH = process.env.AQ_SCRATCH || '/tmp';
const OTP_FILE = path.join(SCRATCH, 'otp-code.txt');
const STATUS_FILE = path.join(SCRATCH, 'customer-flow-status.json');
const LOGIN_EMAIL = process.env.AQ_LOGIN_EMAIL;
if (!LOGIN_EMAIL) { console.error('Set AQ_LOGIN_EMAIL'); process.exit(1); }

const MENU_URL = 'https://aviqr.com/menu/ecdbc557-91fa-44ee-992f-03683ad8bbde?table=1';
fs.rmSync(OTP_FILE, { force: true });
fs.writeFileSync(STATUS_FILE, JSON.stringify({ stage: 'starting' }));
const setStatus = s => fs.writeFileSync(STATUS_FILE, JSON.stringify(s, null, 2));

const meta = {
  title: 'Ordering from a QR menu — real customer flow on AviQR (Spice Route)',
  subtitle: 'Scan → browse → cart → checkout → pay-at-counter order, start to finish',
  description:
    'A real end-to-end customer order on a live AviQR shop (Spice Route, table 1): scanning the table QR, browsing the multilingual menu, adding an item, logging in, and placing a "Cash at Counter" order — no payment is taken. Names/numbers shown belong to the account used to record this video.',
  tags: ['AviQR', 'QR ordering', 'restaurant QR code', 'digital menu', 'online food order', 'India'],
};

const rec = await record('06-customer-order-flow', async (page, h) => {
  await h.goto(MENU_URL);
  h.begin();
  h.chapter('Scan the table QR');
  await h.say('Scanning the QR code on the table opens the menu — no app needed', 4500);

  h.chapter('Browse the menu');
  await h.say('Browsing Spice Route’s live menu, in English or 9 Indian languages', 4000);
  await h.sleep(1200);

  h.chapter('Add to cart');
  const addBtn = page.locator('button:has-text("Add")').first();
  await h.click(addBtn);
  await h.say('Adding a dish to the cart', 3000);
  await h.sleep(1000);

  h.chapter('Checkout');
  const cartBtn = page.getByRole('button', { name: 'Cart' });
  await h.click(cartBtn);
  await h.sleep(800);
  await h.say('Opening the cart', 2500);
  const proceed = page.getByRole('button', { name: 'Proceed to Order' });
  await h.click(proceed);
  await h.sleep(1000);

  // ── Login (email OTP) ──────────────────────────────────────────────────
  const emailInput = page.getByPlaceholder('you@example.com');
  if (await emailInput.isVisible({ timeout: 4000 }).catch(() => false)) {
    h.chapter('Log in');
    await h.say('A one-time code confirms who the order is for', 3500);
    await h.type(emailInput, LOGIN_EMAIL, 40);
    const sendOtp = page.getByRole('button', { name: 'Send OTP' });
    await h.click(sendOtp);
    await h.say('Code sent — checking email for the 6-digit code', 3000);
    await page.screenshot({ path: path.join(SCRATCH, 'otp-wait.png') });
    setStatus({ stage: 'waiting_for_otp', shot: 'otp-wait.png' });

    let otp = null;
    for (let i = 0; i < 240; i++) {
      if (fs.existsSync(OTP_FILE)) {
        const v = fs.readFileSync(OTP_FILE, 'utf8').trim();
        if (v) { otp = v; break; }
      }
      await h.sleep(1500);
    }
    if (!otp) throw new Error('Timed out waiting for OTP in ' + OTP_FILE);
    setStatus({ stage: 'otp_received' });

    // Find the OTP field generically — it appears after Send OTP succeeds.
    const otpInput = page.locator(
      'input[type="text"]:visible, input[type="tel"]:visible, input[type="number"]:visible, input[inputmode="numeric"]:visible'
    ).first();
    await otpInput.waitFor({ state: 'visible', timeout: 15000 });
    await h.type(otpInput, otp, 90);
    // The dialog auto-verifies once all 6 digits are entered — no submit click needed.
    // Just wait for the "Let's verify your email" dialog to go away.
    await page.getByText("Let's verify your email").waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    await h.say('Logged in', 2000);
    await h.sleep(1500);
  }

  // ── Place order (Cash at Counter — no real payment) ────────────────────
  h.chapter('Place the order');
  const cashOpt = page.getByText('Cash at Counter', { exact: false });
  if (await cashOpt.isVisible({ timeout: 8000 }).catch(() => false)) {
    await h.click(cashOpt);
    await h.say('Choosing "Cash at Counter" — pay when the order is served', 4000);
    await h.sleep(800);
  }
  const placeBtn = page.getByRole('button', { name: /place order/i });
  await h.click(placeBtn);
  await h.say('Placing the order', 2500);
  await page.waitForSelector('text=/Order Confirmed/i', { timeout: 20000 }).catch(() => {});
  await h.sleep(1000);

  h.chapter('Order confirmed');
  const bodyText = await page.locator('body').innerText();
  const orderMatch = bodyText.match(/#ORD-[\w-]+/);
  const codeMatch = bodyText.match(/\b(\d{6})\b/);
  const orderId = orderMatch ? orderMatch[0] : null;
  const code = codeMatch ? codeMatch[1] : null;
  setStatus({ stage: 'done', orderId, code });
  await h.say('Order confirmed — a 6-digit code to show at the counter', 4500);
  await h.sleep(2500);
});

const mp4 = await finish(rec, meta);
console.log('DONE', mp4);
console.log('STATUS', fs.readFileSync(STATUS_FILE, 'utf8'));
