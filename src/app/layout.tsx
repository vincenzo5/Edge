import type { Metadata } from "next";
import "./globals.css";
import { DevPersistenceLoginBanner } from "@/app/components/DevPersistenceLoginBanner";

export const metadata: Metadata = {
  title: {
    default: "Edge",
    template: "%s · Edge",
  },
  description: "AI-native charting workspace with a custom Edge canvas engine",
  applicationName: "Edge",
  icons: {
    // Tab favicons: transparent (no dark plate). Apple/PWA keep opaque brand icons.
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/brand/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Edge",
    description: "AI-native charting workspace",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t='dark';" +
              "var raw=localStorage.getItem('tv-ai:workspace-tabs:v1');" +
              "if(raw){var parsed=JSON.parse(raw);" +
              "var tab=(parsed.tabs||[]).find(function(x){return x.id===parsed.activeTabId;})||(parsed.tabs||[])[0];" +
              "var theme=tab&&tab.layout&&tab.layout.theme;" +
              "if(theme==='light'||theme==='dark')t=theme;}" +
              "if(t==='dark'){var legacy=localStorage.getItem('tv-ai:layout:v1');" +
              "if(legacy){var lp=JSON.parse(legacy);if(lp&&(lp.theme==='light'||lp.theme==='dark'))t=lp.theme;}}" +
              "var el=document.documentElement;el.classList.remove('light','dark');el.classList.add(t);}" +
              "catch(e){var el=document.documentElement;el.classList.remove('light','dark');el.classList.add('dark');}",
          }}
        />
      </head>
      <body className="antialiased">
        <DevPersistenceLoginBanner />
        {children}
      </body>
    </html>
  );
}
