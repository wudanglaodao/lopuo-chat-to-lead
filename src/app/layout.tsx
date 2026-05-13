import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lopuo Signal",
  description: "面向营销型官网的知识库客服与 AI 留咨转化工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('lopuo-admin-theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
