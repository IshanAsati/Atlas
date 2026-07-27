import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Martian_Mono } from "next/font/google";
import "./globals.css";

/* Display: Bricolage Grotesque. Slightly irregular grotesque with real
   optical character — carries headings without a serif's formality. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

/* Body: Instrument Sans. Quiet, tall x-height, reads well at 14–16px. */
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

/* Data: Martian Mono. Wide and mechanical — every number and every
   instrument label on the panel is set in it. */
const martian = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atlas — Study Operating System",
  description:
    "Atlas plans your studying so you don't have to. Open it and the next task is already decided.",
};

/* Runs before first paint so the panel never flashes the wrong face. */
const themeScript = `(function(){try{var t=localStorage.getItem("atlas-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${instrument.variable} ${martian.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
