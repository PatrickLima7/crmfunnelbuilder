import { crmDay, crmTime, crmDateTimeToIso } from "@/lib/lead-categories";
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
  const parseInitialValue = (val?: string | null) => {
    if (!val || !crmDay(val)) return { date: "", time: "10:00" };
    return { date: crmDay(val)!, time: crmTime(val) };
  };

  const initial = parseInitialValue(value);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  useEffect(() => {
    const parsed = parseInitialValue(value);
    setDate(parsed.date);
    setTime(parsed.time);
  }, [value]);

  const updateDateTime = (newDate: string, newTime: string) => {
    setDate(newDate);
    setTime(newTime);
    if (newDate && newTime) {
      try {
        onChange(crmDateTimeToIso(newDate, newTime));
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

      <p className="text-[10px] text-muted-foreground">Horário de Brasília</p>
      {error && <p className="text-xs font-bold text-destructive mt-1">{error}</p>}
    </div>
  );
}
