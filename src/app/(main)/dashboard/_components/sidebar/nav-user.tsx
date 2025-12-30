"use client";

import { CircleUser, CreditCard, EllipsisVertical, LogOut, MessageSquareDot } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import type { UserPayload } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { logoutUser } from "@/server/auth-actions";

type User =
  | UserPayload
  | {
      id: number;
      email: string;
      name?: string | null;
      image?: string;
    }
  | null;

export function NavUser({ user }: { readonly user: User }) {
  const { isMobile } = useSidebar();
  const { data: session } = useSession();

  // Use NextAuth session if available, otherwise use custom auth user
  const currentUser = session?.user || user;

  const handleLogout = async () => {
    if (session) {
      // NextAuth logout
      await signOut({ callbackUrl: "/auth" });
    } else {
      // Custom auth logout
      await logoutUser();
    }
  };

  if (!currentUser) {
    return null;
  }

  // Type guard to check if user has image property
  const hasImage = (u: User): u is { image?: string } => "image" in u;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              suppressHydrationWarning
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage
                  src={hasImage(currentUser) ? currentUser.image || undefined : undefined}
                  alt={currentUser.name || "User"}
                />
                <AvatarFallback className="rounded-lg">{getInitials(currentUser.name || "Guest User")}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{currentUser.name || "Guest User"}</span>
                <span className="truncate text-muted-foreground text-xs">{currentUser.email}</span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={hasImage(currentUser) ? currentUser.image || undefined : undefined}
                    alt={currentUser.name || "User"}
                  />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(currentUser.name || "Guest User")}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{currentUser.name || "Guest User"}</span>
                  <span className="truncate text-muted-foreground text-xs">{currentUser.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CircleUser />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquareDot />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
