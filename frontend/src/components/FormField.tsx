import { useId, type InputHTMLAttributes } from "react";

export function FormField({ name, label, hint, error, ...input }: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id">) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <input {...input} id={id} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy || undefined} />
    {hint && <span id={`${id}-hint`} className="field-hint">{hint}</span>}
    {error && <span id={`${id}-error`} className="field-error">{error}</span>}
  </div>;
}
