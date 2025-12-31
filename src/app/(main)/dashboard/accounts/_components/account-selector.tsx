"use client";

import * as React from "react";

import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Account = {
    id: number;
    name: string;
    type: string;
    color?: string | null;
    currentBalance?: string | null;
    currency: string;
    isDefault?: boolean | null;
};

type AccountSelectorProps = {
    accounts: Account[];
    value?: number | null;
    onValueChange: (value: number | null) => void;
    disabled?: boolean;
};

export function AccountSelector({ accounts, value, onValueChange, disabled }: AccountSelectorProps) {
    const [open, setOpen] = React.useState(false);

    const selectedAccount = accounts.find((account) => account.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    {selectedAccount ? (
                        <span className="flex items-center gap-2">
                            <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: selectedAccount.color || "#6366f1" }}
                            />
                            {selectedAccount.name}
                        </span>
                    ) : (
                        "Select account"
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput placeholder="Search accounts..." />
                    <CommandList>
                        <CommandEmpty>No accounts found.</CommandEmpty>
                        <CommandGroup>
                            {accounts.map((account) => (
                                <CommandItem
                                    key={account.id}
                                    value={account.name}
                                    onSelect={() => {
                                        onValueChange(account.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", value === account.id ? "opacity-100" : "opacity-0")} />
                                    <span
                                        className="mr-2 h-3 w-3 rounded-full"
                                        style={{ backgroundColor: account.color || "#6366f1" }}
                                    />
                                    <span className="flex-1">{account.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {account.currency} {Number.parseFloat(account.currentBalance || "0").toFixed(2)}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
