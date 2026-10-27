import { Component } from 'react';

export default class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('Application render failed', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="portal-error-page" role="alert">
          <h1>Something went wrong</h1>
          <p>The page hit an unexpected error.</p>
          <button type="button" onClick={() => window.location.reload()}>Reload page</button>
        </main>
      );
    }
    return this.props.children;
  }
}
