"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] route error:", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-foreground">This admin page failed to load</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {isDev
          ? error.message
          : "Something went wrong while loading this page. Try again or contact support."}
      </p>
      {error.digest ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
          digest: {error.digest}
        </p>
      ) : null}
      <Button type="button" variant="outline" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
