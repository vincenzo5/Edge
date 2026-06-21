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
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var raw=localStorage.getItem('tv-ai:layout:v1');" +
              "var t='light';" +
              "if(raw){var p=JSON.parse(raw);if(p&&p.theme){t=p.theme;}}" +
              "document.documentElement.className=t;}catch(e){document.documentElement.className='light';}",
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
