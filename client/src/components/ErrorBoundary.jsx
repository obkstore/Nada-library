import React from 'react';

// Last-resort crash guard: if any page throws during render, show a friendly
// message instead of a blank white screen. Static strings (both languages) on
// purpose — this must render even when i18n itself is what broke.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(err) {
    // Visible in the browser console for diagnosis; never leaks to the UI.
    // eslint-disable-next-line no-console
    console.error('Page crashed:', err);
  }

  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 40 }} aria-hidden="true">🧸</div>
          <p style={{ fontWeight: 800, fontSize: 18, margin: '8px 0 4px' }}>حدث خطأ غير متوقع. يرجى تحديث الصفحة.</p>
          <p style={{ color: '#78716c', fontSize: 14, margin: '0 0 16px' }}>Something went wrong. Please reload the page.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ minHeight: 44, padding: '8px 28px', borderRadius: 999, border: 'none', background: '#f39c0c', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            تحديث / Reload
          </button>
        </div>
      </div>
    );
  }
}
