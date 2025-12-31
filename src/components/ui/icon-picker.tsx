"use client";

import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
    Activity,
    Baby,
    Banknote,
    Beer,
    Book,
    Briefcase,
    Building,
    Bus,
    BusFront,
    Car,
    CarTaxiFront,
    Cat,
    Coffee,
    CreditCard,
    Dog,
    DollarSign,
    Droplet,
    Euro,
    FileSignature,
    Film,
    Flame,
    Fuel,
    Gamepad2,
    Gift,
    GraduationCap,
    Hammer,
    Heart,
    HeartPulse,
    Home,
    Image,
    Key,
    Landmark,
    Laptop,
    Moon,
    Music,
    ParkingCircle,
    PawPrint,
    Percent,
    Pill,
    Plane,
    Plug,
    Plus,
    PoundSterling,
    Scissors,
    ShieldCheck,
    Shirt,
    ShoppingBag,
    ShoppingCart,
    Smartphone,
    Smile,
    Stethoscope,
    Sun,
    Ticket,
    Train,
    Tv,
    Umbrella,
    Utensils,
    Wallet,
    Wifi,
    Wrench,
    Zap,
} from "lucide-react";
import * as React from "react";

export const icons = {
    activity: Activity,
    baby: Baby,
    banknote: Banknote,
    beer: Beer,
    book: Book,
    briefcase: Briefcase,
    building: Building,
    bus: Bus,
    "bus-front": BusFront,
    car: Car,
    "car-taxi-front": CarTaxiFront,
    cat: Cat,
    coffee: Coffee,
    "credit-card": CreditCard,
    dog: Dog,
    "dollar-sign": DollarSign,
    droplet: Droplet,
    euro: Euro,
    "file-signature": FileSignature,
    film: Film,
    flame: Flame,
    fuel: Fuel,
    "gamepad-2": Gamepad2,
    gift: Gift,
    "graduation-cap": GraduationCap,
    hammer: Hammer,
    heart: Heart,
    "heart-pulse": HeartPulse,
    home: Home,
    image: Image,
    key: Key,
    landmark: Landmark,
    laptop: Laptop,
    moon: Moon,
    music: Music,
    "parking-circle": ParkingCircle,
    "paw-print": PawPrint,
    percent: Percent,
    pill: Pill,
    plane: Plane,
    plug: Plug,
    plus: Plus,
    "pound-sterling": PoundSterling,
    scissors: Scissors,
    "shield-check": ShieldCheck,
    shirt: Shirt,
    "shopping-bag": ShoppingBag,
    "shopping-cart": ShoppingCart,
    smartphone: Smartphone,
    smile: Smile,
    stethoscope: Stethoscope,
    sun: Sun,
    ticket: Ticket,
    train: Train,
    tv: Tv,
    umbrella: Umbrella,
    utensils: Utensils,
    wallet: Wallet,
    wifi: Wifi,
    wrench: Wrench,
    zap: Zap,
};

type IconName = keyof typeof icons;

interface IconPickerProps {
    value?: string;
    onChange: (value: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
    const [open, setOpen] = React.useState(false);

    const SelectedIcon = value && icons[value as IconName] ? icons[value as IconName] : null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {SelectedIcon ? (
                        <div className="flex items-center gap-2">
                            <SelectedIcon className="size-4" />
                            <span className="capitalize">{value?.replace(/-/g, " ")}</span>
                        </div>
                    ) : (
                        "Select icon..."
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="Search icon..." />
                    <CommandList>
                        <CommandEmpty>No icon found.</CommandEmpty>
                        <CommandGroup>
                            <div className="grid grid-cols-5 gap-2 p-2">
                                {Object.entries(icons).map(([name, Icon]) => (
                                    <CommandItem
                                        key={name}
                                        value={name}
                                        onSelect={(currentValue) => {
                                            onChange(currentValue);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md p-2 hover:bg-accent",
                                            value === name && "bg-accent"
                                        )}
                                    >
                                        <Icon className="size-5" />
                                    </CommandItem>
                                ))}
                            </div>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
