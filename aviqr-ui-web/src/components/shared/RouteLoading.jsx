export default function RouteLoading({ message = 'Restoring your workspace…' }) {
  return (
    <main className="route-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="route-loading-mark" aria-hidden="true" />
      <strong>{message}</strong>
      <span className="route-loading-hint">This usually takes a moment.</span>
    </main>
  );
}
