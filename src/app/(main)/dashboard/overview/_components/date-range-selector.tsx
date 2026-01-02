"use client";

import * as React from "react";

import { format, startOfMonth, startOfYear, subDays, subMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { type TimePeriodValue, timePeriodPresets } from "./overview.config";

import { Loader2 } from "lucide-react";

interface DateRangeSelectorProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  isLoading?: boolean;
}

export function DateRangeSelector({ dateRange, onDateRangeChange, className, isLoading }: DateRangeSelectorProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<TimePeriodValue>("30d");
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [tempDateRange, setTempDateRange] = React.useState<DateRange | undefined>(dateRange);

  const handlePresetChange = (value: TimePeriodValue) => {
    setSelectedPreset(value);
    const now = new Date();

    let fromDate: Date;
    let toDate: Date = now;

    const preset = timePeriodPresets.find((p) => p.value === value);
    if (!preset) return;

    if (preset.days > 0) {
      fromDate = subDays(now, preset.days);
    } else if (value === "this-month") {
      fromDate = startOfMonth(now);
    } else if (value === "this-year") {
      fromDate = startOfYear(now);
    } else {
      // All time - default to 2 years back
      fromDate = subMonths(now, 24);
    }

    onDateRangeChange({ from: fromDate, to: toDate });
  };

  const handleCalendarSelect = (range: DateRange | undefined, selectedDay: Date) => {
    // If we already have a complete range selected, and the user clicks a new date,
    // we want to start a NEW selection instead of letting react-day-picker try to modify the existing one.
    // This solves the issue where clicking inside a range modifies the end date instead of starting a new start date.
    if (tempDateRange?.from && tempDateRange?.to) {
      setTempDateRange({ from: selectedDay, to: undefined });
    } else {
      setTempDateRange(range);
    }
    setSelectedPreset("custom" as TimePeriodValue);
  };

  const handleOpenChange = (open: boolean) => {
    setIsCalendarOpen(open);
    if (open) {
      setTempDateRange(dateRange);
    } else {
      onDateRangeChange(tempDateRange);
    }
  };

  // Initialize with default 30 days on mount
  React.useEffect(() => {
    if (!dateRange) {
      handlePresetChange("30d");
    }
  }, []);

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange} disabled={isLoading}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {timePeriodPresets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={isCalendarOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            disabled={isLoading && !isCalendarOpen}
            className={cn(
              "w-full justify-start text-left font-normal sm:w-[280px]",
              !dateRange && "text-muted-foreground"
            )}
          >
            {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CalendarIcon className="mr-2 size-4" />}
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            key={isCalendarOpen ? "open" : "closed"}
            initialFocus
            mode="range"
            defaultMonth={tempDateRange?.from}
            selected={tempDateRange}
            onSelect={handleCalendarSelect as any}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
