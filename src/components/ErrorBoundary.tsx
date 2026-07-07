import { Component, type ReactNode } from 'react';
import { isDemoMode, resetDemoData } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Unhandled application error', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f3] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-black/[0.05] bg-white p-8 text-center shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)]">
          <p className="text-4xl">😵</p>
          <h1 className="mt-4 text-xl font-bold text-[#17191c]">Something went wrong</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-[#777e87]">
            The app hit an unexpected error. Reloading usually fixes it
            {isDemoMode ? '; if it keeps happening, reset the demo data.' : '.'}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#17191c] px-5 text-sm font-bold text-white transition-colors hover:bg-[#2b2f35]"
            >
              Reload the app
            </button>
            {isDemoMode && (
              <button
                type="button"
                onClick={() => resetDemoData()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#f4f5f2] px-5 text-sm font-bold text-[#5e656f] transition-colors hover:text-[#17191c]"
              >
                Reset demo data and reload
              </button>
            )}
          </div>
          <p className="mt-5 break-words text-left font-mono text-[11px] leading-5 text-[#b3bac4]">
            {String(this.state.error.message || this.state.error)}
          </p>
        </div>
      </div>
    );
  }
}
