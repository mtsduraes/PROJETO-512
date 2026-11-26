import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "opsz"] });

export const metadata: Metadata = {
  title: "Caderno de Caixa",
  description: "Fluxo de caixa da 512 Gastronomia e Eventos",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Caixa", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#eef0ec",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Aplica o tema salvo antes de desenhar a tela, para não "piscar" claro ao abrir no escuro. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("tema")||(matchMedia("(prefers-color-scheme: dark)").matches?"escuro":"claro");document.documentElement.dataset.tema=t;}catch(e){}`,
          }}
        />
      </head>
      <body className={`${figtree.variable} ${fraunces.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
