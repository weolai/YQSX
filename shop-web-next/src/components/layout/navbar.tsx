"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Camera, ShoppingBag, ClipboardList, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/stores/auth";
import { LimelightNav, type NavItem } from "@/components/ui/limelight-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsClient } from "@/hooks/use-is-client";

const navItems: NavItem[] = [
  { id: "home", icon: <Home />, label: "首页", href: "/" },
  { id: "recognize", icon: <Camera />, label: "拍照识别", href: "/recognize" },
  { id: "recommend", icon: <Sparkles />, label: "智能推荐", href: "/recommend" },
  { id: "products", icon: <ShoppingBag />, label: "商品列表", href: "/products" },
  { id: "orders", icon: <ClipboardList />, label: "我的订单", href: "/orders" },
];

export function Navbar() {
  const router = useRouter();
  const { userInfo, isLoggedIn, logout } = useAuthStore();
  const isClient = useIsClient();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/70 backdrop-blur-xl"
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <span className="text-2xl font-serif font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
              YQSX
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              智能零食
            </span>
          </Link>

          <div className="hidden md:block flex-1 px-6">
            <LimelightNav items={navItems} className="mx-auto" />
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {!isClient ? (
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            ) : isLoggedIn && userInfo ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                        {userInfo.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{userInfo.username}</p>
                      <p className="text-xs text-muted-foreground">ID: {userInfo.userId}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/orders")}>我的订单</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-foreground border border-foreground/20 transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-lg hover:shadow-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                登录
              </button>
            )}
          </div>
        </div>

        {/* 移动端导航 */}
        <div className="md:hidden pb-3 -mt-1">
          <LimelightNav items={navItems} className="w-full" />
        </div>
      </div>
    </motion.nav>
  );
}
