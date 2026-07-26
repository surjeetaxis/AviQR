/**
 * roleRouting.test.js — every role must land on its correct home screen.
 * Reads ROLE_HOME straight from the AuthContext source (no RN import) so it
 * runs in both the lightweight logic config and the full jest-expo config.
 * Guards against the "admin sees owner dashboard" bug.
 */
const fs = require('fs');
const path = require('path');

function loadRoleHome() {
  const src = fs.readFileSync(
    path.join(__dirname, '../../src/context/AuthContext.js'), 'utf8'
  );
  const block = src.match(/export const ROLE_HOME\s*=\s*\{([\s\S]*?)\};/);
  if (!block) throw new Error('ROLE_HOME not found in AuthContext.js');
  const map = {};
  for (const m of block[1].matchAll(/(\w+)\s*:\s*'([^']+)'/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

const ROLE_HOME = loadRoleHome();

describe('ROLE_HOME routing map', () => {
  const cases = [
    ['OWNER',    '/(owner)/dashboard'],
    ['MANAGER',  '/(owner)/dashboard'],
    ['CASHIER',  '/(owner)/dashboard'],
    ['KITCHEN',  '/(owner)/dashboard'],
    ['ADMIN',    '/(admin)/admin-home'],
    ['SUPPORT',  '/(support)/support-home'],
    ['HOTEL',    '/(hotel)/hotel-home'],
    ['MALL',     '/(mall)/mall-home'],
    ['SUPPLIER', '/(supplier)/supplier-home'],
    ['CUSTOMER', '/(customer)/portal-home'],
  ];

  it.each(cases)('%s lands on %s', (role, expected) => {
    expect(ROLE_HOME[role]).toBe(expected);
  });

  it('ADMIN never lands on the owner dashboard', () => {
    expect(ROLE_HOME['ADMIN']).not.toContain('(owner)');
  });

  it('all 10 roles are mapped', () => {
    expect(Object.keys(ROLE_HOME).length).toBeGreaterThanOrEqual(10);
  });

  it('every role route is well-formed', () => {
    Object.values(ROLE_HOME).forEach((route) => {
      expect(route).toMatch(/^\/\(\w+\)\//);
    });
  });
});
