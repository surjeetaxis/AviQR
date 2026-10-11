const value = process.env.EXPO_PUBLIC_STAGING_API_URL;
if (!value) {
  console.error('Set EXPO_PUBLIC_STAGING_API_URL to the staging HTTPS API origin.');
  process.exit(1);
}
try {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.host || url.username || url.password) throw new Error();
} catch {
  console.error('EXPO_PUBLIC_STAGING_API_URL must be a valid HTTPS URL.');
  process.exit(1);
}
