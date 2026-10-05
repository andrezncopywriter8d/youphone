import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { PageTransition } from "@/components/page-transition";
import { requireUser } from "@/lib/auth";
export default async function AppLayout({children}:{children:React.ReactNode}){const user=await requireUser();return <div className="min-h-screen"><Sidebar user={user}/><div className="lg:pl-[258px]"><Header/><main className="mx-auto max-w-[1560px] p-5 lg:p-8"><PageTransition>{children}</PageTransition></main></div><MobileNav/></div>}
