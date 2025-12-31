"use client";

import * as React from "react";

import { Globe, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getUserSettings, updateUserSettings, type UserSettings } from "@/server/user-settings-actions";

const currencies = [
    { value: "USD", label: "USD - US Dollar", symbol: "$" },
    { value: "EUR", label: "EUR - Euro", symbol: "€" },
    { value: "GBP", label: "GBP - British Pound", symbol: "£" },
    { value: "INR", label: "INR - Indian Rupee", symbol: "₹" },
    { value: "JPY", label: "JPY - Japanese Yen", symbol: "¥" },
    { value: "CAD", label: "CAD - Canadian Dollar", symbol: "C$" },
    { value: "AUD", label: "AUD - Australian Dollar", symbol: "A$" },
    { value: "CHF", label: "CHF - Swiss Franc", symbol: "Fr" },
    { value: "CNY", label: "CNY - Chinese Yuan", symbol: "¥" },
    { value: "BRL", label: "BRL - Brazilian Real", symbol: "R$" },
] as const;

const timezones = [
    { value: "UTC", label: "UTC - Coordinated Universal Time" },
    { value: "America/New_York", label: "EST - Eastern Time (US)" },
    { value: "America/Chicago", label: "CST - Central Time (US)" },
    { value: "America/Denver", label: "MST - Mountain Time (US)" },
    { value: "America/Los_Angeles", label: "PST - Pacific Time (US)" },
    { value: "Europe/London", label: "GMT - London" },
    { value: "Europe/Paris", label: "CET - Paris" },
    { value: "Europe/Berlin", label: "CET - Berlin" },
    { value: "Asia/Tokyo", label: "JST - Tokyo" },
    { value: "Asia/Shanghai", label: "CST - Shanghai" },
    { value: "Asia/Kolkata", label: "IST - Kolkata" },
    { value: "Asia/Dubai", label: "GST - Dubai" },
    { value: "Australia/Sydney", label: "AEDT - Sydney" },
] as const;

const locales = [
    { value: "en-US", label: "English (US)" },
    { value: "en-GB", label: "English (UK)" },
    { value: "en-IN", label: "English (India)" },
    { value: "es-ES", label: "Spanish (Spain)" },
    { value: "es-MX", label: "Spanish (Mexico)" },
    { value: "fr-FR", label: "French (France)" },
    { value: "de-DE", label: "German (Germany)" },
    { value: "it-IT", label: "Italian (Italy)" },
    { value: "pt-BR", label: "Portuguese (Brazil)" },
    { value: "ja-JP", label: "Japanese (Japan)" },
    { value: "zh-CN", label: "Chinese (Simplified)" },
    { value: "hi-IN", label: "Hindi (India)" },
] as const;

const dateFormats = [
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2024)" },
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2024)" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-12-31)" },
    { value: "DD-MM-YYYY", label: "DD-MM-YYYY (31-12-2024)" },
    { value: "MMM DD, YYYY", label: "MMM DD, YYYY (Dec 31, 2024)" },
    { value: "DD MMM YYYY", label: "DD MMM YYYY (31 Dec 2024)" },
] as const;

export function SettingsDialog() {
    const [open, setOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [form, setForm] = React.useState<UserSettings>({
        defaultCurrency: "USD",
        timezone: "UTC",
        locale: "en-US",
        dateFormat: "MM/DD/YYYY",
    });

    // Load settings when dialog opens
    React.useEffect(() => {
        if (open) {
            setIsLoading(true);
            getUserSettings()
                .then((result) => {
                    if (result.success) {
                        setForm(result.data);
                    } else {
                        toast.error(result.error);
                    }
                })
                .finally(() => setIsLoading(false));
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const result = await updateUserSettings(form);

        if (result.success) {
            toast.success("Settings updated successfully");
            setOpen(false);
        } else {
            toast.error(result.error);
        }

        setIsSubmitting(false);
    };

    const { state, isMobile } = useSidebar();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <SidebarMenuButton
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Settings className="size-4" />
                            <span>Settings</span>
                        </SidebarMenuButton>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    align="center"
                    hidden={state !== "collapsed" || isMobile}
                >
                    Settings
                </TooltipContent>
            </Tooltip>
            {/* DialogContent ... */}
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="size-5" />
                            Settings
                        </DialogTitle>
                        <DialogDescription>
                            Customize your preferences for currency, timezone, and display formats.
                        </DialogDescription>
                    </DialogHeader>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="text-muted-foreground size-8 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid gap-6 py-6">
                            {/* Currency Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Globe className="text-muted-foreground size-4" />
                                    <h4 className="text-sm font-medium">Regional Settings</h4>
                                </div>
                                <Separator />

                                <div className="grid gap-4 pl-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="currency">Default Currency</Label>
                                        <Select
                                            value={form.defaultCurrency}
                                            onValueChange={(value) => setForm((prev) => ({ ...prev, defaultCurrency: value }))}
                                        >
                                            <SelectTrigger id="currency" className="w-full">
                                                <SelectValue placeholder="Select currency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {currencies.map((currency) => (
                                                    <SelectItem key={currency.value} value={currency.value}>
                                                        <span className="flex items-center gap-2">
                                                            <span className="font-mono text-muted-foreground">{currency.symbol}</span>
                                                            {currency.label}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-muted-foreground text-xs">
                                            This will be used as the default currency for new transactions.
                                        </p>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="timezone">Timezone</Label>
                                        <Select
                                            value={form.timezone}
                                            onValueChange={(value) => setForm((prev) => ({ ...prev, timezone: value }))}
                                        >
                                            <SelectTrigger id="timezone" className="w-full">
                                                <SelectValue placeholder="Select timezone" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {timezones.map((tz) => (
                                                    <SelectItem key={tz.value} value={tz.value}>
                                                        {tz.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="locale">Language / Locale</Label>
                                        <Select
                                            value={form.locale}
                                            onValueChange={(value) => setForm((prev) => ({ ...prev, locale: value }))}
                                        >
                                            <SelectTrigger id="locale" className="w-full">
                                                <SelectValue placeholder="Select locale" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {locales.map((locale) => (
                                                    <SelectItem key={locale.value} value={locale.value}>
                                                        {locale.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="dateFormat">Date Format</Label>
                                        <Select
                                            value={form.dateFormat}
                                            onValueChange={(value) => setForm((prev) => ({ ...prev, dateFormat: value }))}
                                        >
                                            <SelectTrigger id="dateFormat" className="w-full">
                                                <SelectValue placeholder="Select date format" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {dateFormats.map((format) => (
                                                    <SelectItem key={format.value} value={format.value}>
                                                        {format.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting || isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || isLoading}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
