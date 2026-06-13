import { AlertTriangle } from "lucide-react";

export function ErrorFallback({ error, reset }: { error: unknown; reset?: () => void }) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  const stack = error instanceof Error ? error.stack : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-2xl w-full glass-card rounded-xl p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">The page failed to render.</p>
          </div>
        </div>
        <pre className="text-xs bg-muted/50 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words">
          {message}
          {stack ? `\n\n${stack}` : ""}
        </pre>
        <div className="flex gap-2">
          <button
            onClick={() => (reset ? reset() : location.reload())}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
