/**
 * layouts.test.js — every expo-router route group must have a non-empty _layout.js,
 * otherwise that role's screens silently fail to render.
 * Guards the "empty (customer)/(hotel)/(mall)/(supplier)/(support) layout" bug.
 */
const fs = require('fs');
const path = require('path');

const GROUPS = ['(admin)', '(owner)', '(customer)', '(hotel)', '(mall)', '(supplier)', '(support)'];

describe('route group layouts', () => {
  it.each(GROUPS)('%s has a non-empty _layout.js', (group) => {
    const p = path.join(__dirname, '../../app', group, '_layout.js');
    expect(fs.existsSync(p)).toBe(true);
    const content = fs.readFileSync(p, 'utf8').trim();
    expect(content.length).toBeGreaterThan(0);
    expect(content).toMatch(/export default function/);
  });

  it.each(GROUPS)('%s layout uses Stack or Tabs', (group) => {
    const p = path.join(__dirname, '../../app', group, '_layout.js');
    const content = fs.readFileSync(p, 'utf8');
    expect(content).toMatch(/Stack|Tabs/);
  });
});
