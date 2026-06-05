import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { DEFAULT_PANEL_TITLE, getPanelTitle } from "@/lib/panel-title";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("billing-theme");if(t==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");}catch(e){}})();`;

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-ui-sans",
  display: "swap",
});

/** Enables `env(safe-area-inset-*)` for fixed mobile bottom nav (notched / gesture devices). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  let panelTitle = DEFAULT_PANEL_TITLE;
  try {
    panelTitle = await getPanelTitle();
  } catch {
    /* DB may be unavailable during build or misconfigured env */
  }
  return {
    title: {
      default: panelTitle,
      template: `%s | ${panelTitle}`,
    },
    description: "Admin billing panel",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${fontSans.variable} h-dvh max-h-dvh min-h-0 overflow-hidden antialiased`}
    >
      <body className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden font-sans">
        <Script id="billing-theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
