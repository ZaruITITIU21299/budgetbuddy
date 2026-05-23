import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[BudgetBuddy] Uncaught error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#060B1B]">
          <div className="max-w-md text-center space-y-4">
            <div className="size-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="size-6 text-rose-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
            <p className="text-sm text-slate-400 break-words">{this.state.error.message}</p>
            <Button leftIcon={<RefreshCcw className="size-4" />} onClick={() => location.reload()}>
              Reload App
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
