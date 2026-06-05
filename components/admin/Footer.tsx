export function Footer() {
  const y = new Date().getFullYear();
  return (
    <footer className="border-t border-border/80 bg-background/60 px-4 py-4 text-xs text-muted-foreground backdrop-blur-sm supports-[backdrop-filter]:bg-background/40">
      &copy; {y}
    </footer>
  );
}
