import LandingScreen from '../src/components/landing/LandingScreen.js';

// Unconditional manual entry point to the marketing page — unlike `/`, this
// never redirects based on auth state, so tapping the logo on Login always
// reaches it even on a device that normally skips straight past `/`.
export default function Landing() {
  return <LandingScreen />;
}
