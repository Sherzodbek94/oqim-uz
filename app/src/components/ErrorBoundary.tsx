import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/** Global xatolarni ushlash uchun Error Boundary. */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Production'da bu yerda xatolikni monitoringga yuborish mumkin
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-hero px-6 text-center">
          <h1 className="text-display-xl font-bold text-clay-600">Xatolik yuz berdi</h1>
          <p className="mt-4 max-w-md text-body text-ink-600">
            Iltimos, sahifani yangilang yoki bosh sahifaga qayting.
          </p>
          {this.state.error && (
            <pre className="mt-4 max-w-md overflow-auto rounded-xl bg-sand-100 p-4 text-left text-caption text-ink-500">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Sahifani yangilash
            </button>
            <Link to="/" className="btn-secondary">
              Bosh sahifa
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
