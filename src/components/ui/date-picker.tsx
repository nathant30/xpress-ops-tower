"use client"

import * as React from "react"
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DateRange } from "react-day-picker"
import { logger } from '@/lib/security/productionLogger';

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0", className)}
      classNames={{
        months: "flex space-x-8",
        month: "space-y-4",
        caption: "flex justify-center pb-2 relative items-center",
        caption_label: "text-base font-medium text-gray-900",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "inline-flex items-center justify-center rounded text-sm font-medium transition-colors hover:bg-gray-100 h-6 w-6 text-gray-500 hover:text-gray-900"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex mb-1",
        head_cell: "text-gray-500 text-center w-10 font-medium text-sm py-1",
        row: "flex w-full",
        cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1",
        day: cn(
          "inline-flex items-center justify-center text-sm font-normal transition-colors hover:bg-gray-100 h-10 w-10 p-0 mx-auto"
        ),
        day_range_start: "bg-blue-600 text-white hover:bg-blue-700 rounded-l",
        day_range_end: "bg-blue-600 text-white hover:bg-blue-700 rounded-r", 
        day_selected: "bg-blue-600 text-white hover:bg-blue-700 rounded",
        day_today: "bg-gray-100 text-gray-900 font-semibold",
        day_outside: "text-gray-300 opacity-60",
        day_disabled: "text-gray-300 opacity-40 cursor-not-allowed",
        day_range_middle: "bg-blue-100 text-blue-900 hover:bg-blue-200",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

interface DatePickerProps {
  date?: Date | DateRange
  onDateChange?: (date: Date | DateRange | undefined) => void
  className?: string
  placeholder?: string
  mode?: "single" | "range"
}

export function DatePicker({ 
  date, 
  onDateChange, 
  className,
  placeholder = "Select date range",
  mode = "range"
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null)

  const presets = [
    { 
      label: "Today", 
      getValue: () => mode === "single" ? new Date() : { from: new Date(), to: new Date() }
    },
    { 
      label: "Yesterday", 
      getValue: () => {
        const yesterday = addDays(new Date(), -1)
        return mode === "single" ? yesterday : { from: yesterday, to: yesterday }
      }
    },
    { 
      label: "This week", 
      getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) 
    },
    { 
      label: "Last week", 
      getValue: () => ({ from: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), to: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }) }) 
    },
    { 
      label: "This month", 
      getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) 
    },
    { 
      label: "Last month", 
      getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) 
    },
    { 
      label: "This year", 
      getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) 
    },
    { 
      label: "Last year", 
      getValue: () => ({ from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) }) 
    },
    { 
      label: "All time", 
      getValue: () => ({ from: new Date(2020, 0, 1), to: new Date() }) 
    }
  ]

  const handlePresetClick = (preset: typeof presets[0]) => {
    try {
      const value = preset.getValue()
      onDateChange?.(value)
      setSelectedPreset(preset.label)
      // Close immediately for single dates or for preset selections
      if (mode === "single" || (value instanceof Date) || preset.label === "Today" || preset.label === "Yesterday") {
        setIsOpen(false)
      }
    } catch (error) {
      logger.error('Error applying date preset', { component: 'DatePicker' });
    }
  }

  const formatDateRange = (dateRange: Date | DateRange) => {
    if (!dateRange) return placeholder
    
    if (dateRange instanceof Date) {
      return format(dateRange, "MMM dd, yyyy")
    }
    
    if (dateRange && typeof dateRange === 'object' && 'from' in dateRange) {
      const { from, to } = dateRange
      if (from && to) {
        return `${format(from, "MMM dd, yyyy")} - ${format(to, "MMM dd, yyyy")}`
      } else if (from) {
        return `${format(from, "MMM dd, yyyy")} - Select end date`
      }
    }
    
    return placeholder
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
          !date && "text-gray-500"
        )}
      >
        <span className="flex items-center space-x-2">
          <CalendarIcon className="w-4 h-4" />
          <span>
            {date ? formatDateRange(date) : placeholder}
          </span>
        </span>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute top-full mt-1 z-50 shadow-xl border border-gray-200 w-[760px] right-0">
            <CardContent className="p-0">
              <div className="flex">
                {/* Preset Options */}
                <div className="w-44 border-r border-gray-200 p-3">
                  <div className="space-y-0.5">
                    {presets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => handlePresetClick(preset)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-sm rounded-md transition-colors hover:bg-gray-100",
                          selectedPreset === preset.label ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Calendar */}
                <div className="flex-1 p-6">
                  <Calendar
                    mode={mode}
                    selected={date}
                    onSelect={(selectedDate) => {
                      onDateChange?.(selectedDate)
                      setSelectedPreset(null)
                    }}
                    numberOfMonths={2}
                    initialFocus
                    showOutsideDays={true}
                    defaultMonth={new Date()}
                  />
                  
                  {/* Date Range Input Fields */}
                  {mode === "range" && (
                    <div className="flex items-center justify-center space-x-4 mt-6 pt-4 border-t border-gray-200">
                      <input
                        type="text"
                        value={date && typeof date === 'object' && 'from' in date && date.from ? format(date.from, "MMM dd, yyyy") : ""}
                        placeholder="Start date"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-center w-32 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        readOnly
                      />
                      <span className="text-gray-400 text-sm">–</span>
                      <input
                        type="text"
                        value={date && typeof date === 'object' && 'to' in date && date.to ? format(date.to, "MMM dd, yyyy") : ""}
                        placeholder="End date"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-center w-32 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        readOnly
                      />
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export { Calendar }