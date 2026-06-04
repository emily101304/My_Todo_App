import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Todo",
  description: "나만의 투두 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "'Pretendard', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
