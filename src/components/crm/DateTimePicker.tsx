import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface DateTimePickerProps {
  value?: string | null | undefined;
  onChange: (isoString: string) => void;
  label?: string;
  required?: boolean;
  error?: string | null | undefined;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  label = "Data e horário de contato",
  required = false,
  error,
  className = "",
}: DateTimePickerProps) {
  // Helper to extract YYYY-MM-DD and HH:mm from ISO or date string
  const parseInitialValue = (val?: string | null) => {
    if (!val) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      return {
        date: tomorrow.toISOString().slice(0, 10),
        time: "10:00",
      };
    }
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) throw new Error("Invalid date");
      const date = d.toISOString().slice(0, 10);
      const time = d.toTimeString().slice(0, 5);
      return { date, time };
    } catch {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        date: tomorrow.toISOString().slice(0, 10),
        time: "10:00",
      };
    }
  };

  const initial = parseInitialValue(value);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  useEffect(() => {
    if (value) {
      const parsed = parseInitialValue(value);
      setDate(parsed.date);
      setTime(parsed.time);
    }
  }, [value]);

  const updateDateTime = (newDate: string, newTime: string) => {
    setDate(newDate);
    setTime(newTime);
    if (newDate && newTime) {
      try {
        const selected = new Date(`${newDate}T${newTime}`);
        onChange(selected.toISOString());
      } catch {
        /* invalid date format */
      }
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <CalendarIcon className="size-3.5 text-primary" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Input
            type="date"
            value={date}
            onChange={(e) => updateDateTime(e.target.value, time)}
            className="h-9 text-xs pl-8 font-mono"
            required={required}
          />
          <CalendarIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="relative">
          <Input
            type="time"
            value={time}
            onChange={(e) => updateDateTime(date, e.target.value)}
            className="h-9 text-xs pl-8 font-mono"
            required={required}
          />
          <Clock className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {error && <p className="text-xs font-bold text-destructive mt-1">{error}</p>}
    </div>
  );
}
