import { useTranslation } from "react-i18next";
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode; // Xato yuz berganda ko'rsatiladigan komponent
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Keyingi renderda fallback UI ko'rsatish uchun state'ni yangilash
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Xatolarni loglash xizmatiga yuborish mumkin
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      // Agar fallback prop berilgan bo'lsa, uni ko'rsatish
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Aks holda, standart xato xabarini ko'rsatish
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'red', border: '1px solid red', margin: '20px' }}>
          <h2>{t("dynamic.errorboundary.something_went_wrong")}</h2>
          <p>{t("dynamic.errorboundary.we_re_sorry_for_the_inconvenience_please")}</p>
          {this.state.error && (
            <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', marginTop: '10px' }}>
              {this.state.error.toString()}
              <br />
              {this.state.errorInfo?.componentStack}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
