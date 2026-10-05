import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export const metadata: Metadata = { title: { default: "CELLSHOP", template: "%s | CELLSHOP" }, description: "Gestão inteligente para lojas de iPhones" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={poppins.variable}><body>{children}</body></html>;
}
