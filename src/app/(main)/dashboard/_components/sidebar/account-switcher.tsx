"use client";

import { BadgeCheck, Bell, CreditCard, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserPayload } from "@/lib/auth";
import { getInitials } from "@/lib/utils";

type User =
  | UserPayload
  | {
      id: number;
      email: string;
      name?: string | null;
      image?: string;
    }
  | null;

export function AccountSwitcher({ user }: { readonly user: User }) {
  if (!user) {
    return null;
  }

  // Type guard to check if user has image property
  const hasImage = (u: any): u is { image?: string } => "image" in u;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-9 rounded-lg">
          <AvatarImage src={hasImage(user) ? user.image || undefined : undefined} alt={user.name || "User"} />
          <AvatarFallback className="rounded-lg">{getInitials(user.name || "Guest User")}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <div className="flex w-full items-center justify-between gap-2 px-2 py-2">
          <Avatar className="size-9 rounded-lg">
            <AvatarImage src={hasImage(user) ? user.image || undefined : undefined} alt={user.name || "User"} />
            <AvatarFallback className="rounded-lg">{getInitials(user.name || "Guest User")}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{user.name || "Guest User"}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <BadgeCheck />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Bell />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
