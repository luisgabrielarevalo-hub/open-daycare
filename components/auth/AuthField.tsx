import type { ComponentProps } from "react";

type AuthFieldProps = Omit<ComponentProps<"input">, "className"> & {
  label: string;
  id: string;
  inputClassName?: string;
};

export function AuthField({
  label,
  id,
  inputClassName,
  ...props
}: AuthFieldProps) {
  return (
    <div className="flex flex-col">
      <label
        htmlFor={id}
        className="mb-2 text-[12px] font-bold tracking-[0.7px] text-muted"
      >
        {label}
      </label>
      <input
        id={id}
        className={`w-full rounded-[14px] border-[1.5px] border-auth-border bg-white px-4 py-3.5 text-[15px] text-ink placeholder:text-auth-placeholder focus:border-auth-focus focus:outline-none ${inputClassName ?? ""}`}
        {...props}
      />
    </div>
  );
}
