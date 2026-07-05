import type { Metadata } from "next";
import "./globals.css";
import { DevPersistenceLoginBanner } from "@/app/components/DevPersistenceLoginBanner";

export const metadata: Metadata = {
  title: "Stock Charts",
  description: "Stock charting prototype with KLineChart and Yahoo Finance data",
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
