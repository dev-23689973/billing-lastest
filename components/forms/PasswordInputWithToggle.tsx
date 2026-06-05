"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type PasswordInputWithToggleProps = {
  id: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

export function PasswordInputWithToggle({
  id,
  name,
  defaultValue,
  value,
  onChange,
  autoComplete = "new-password",
  required,
  disabled,
  className,
  placeholder,
}: PasswordInputWithToggleProps) {
  const [visible, setVisible] = useState(false);
  const controlled = value !== undefined;

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        {...(controlled ? { value, onChange } : { defaultValue })}
        className={cn("pr-10", className)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
