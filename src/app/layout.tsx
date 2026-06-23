import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Charts",
  description: "Stock charting prototype with KLineChart and Yahoo Finance data",
};

export default function RootLayout({
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
              "try{var raw=localStorage.getItem('tv-ai:layout:v1');" +
              "var t='dark';" +
              "if(raw){var p=JSON.parse(raw);if(p&&(p.theme==='light'||p.theme==='dark'))t=p.theme;}" +
              "var el=document.documentElement;el.classList.remove('light','dark');el.classList.add(t);}" +
              "catch(e){var el=document.documentElement;el.classList.remove('light','dark');el.classList.add('dark');}",
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
