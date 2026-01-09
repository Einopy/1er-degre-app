import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <div className="bg-destructive/10 rounded-full p-4 mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          
          <h2 className="text-xl font-semibold mb-2">
            Une erreur est survenue
          </h2>
          
          <p className="text-muted-foreground mb-6 max-w-md">
            Impossible de charger cette page. Veuillez réessayer ou contacter le support si le problème persiste.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="text-xs text-left bg-muted p-4 rounded-lg mb-6 max-w-full overflow-auto">
              {this.state.error.message}
            </pre>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={this.handleReset}>
              Réessayer
            </Button>
            <Button onClick={this.handleReload}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rafraîchir la page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
