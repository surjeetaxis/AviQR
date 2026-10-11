import { Component } from 'react';

export default class RouteErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('Page failed to load:', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="route-load-error" role="alert">
        <h1>This page could not load</h1>
        <p>Your session and page data are safe. Refresh to try again.</p>
        <button type="button" onClick={() => window.location.reload()}>Refresh page</button>
      </main>
    );
  }
}
