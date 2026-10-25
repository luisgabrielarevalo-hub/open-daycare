"use client";

import { useState, type FormEvent } from "react";
import { CloseIcon, InfoIcon, SendIcon } from "@/components/ui/icons";

const RELATIONSHIPS = ["Mamá", "Papá", "Tutor/a"] as const;
type Relationship = (typeof RELATIONSHIPS)[number];

const INVITATION_CODE = "7K4P9";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LinkParentFormProps = {
  childFullName: string;
  onClose: () => void;
  onSent: () => void;
};

type FieldErrors = {
  fullName?: string;
  email?: string;
};

const labelClass =
  "mb-2 text-[12px] leading-[normal] font-extrabold tracking-[0.7px] text-muted short:mb-1.5";
const fieldClass =
  "w-full rounded-[14px] border-[1.5px] border-field-border bg-white px-4 py-[13px] text-[15px] leading-[normal] text-ink placeholder:text-field-placeholder focus:border-field-focus focus:outline-none short:py-2.5";
const errorClass = "mt-1.5 text-[12.5px] font-semibold text-danger";

export function LinkParentForm({
  childFullName,
  onClose,
  onSent,
}: LinkParentFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("Mamá");
  const [errors, setErrors] = useState<FieldErrors>({});

  const childFirstName = childFullName.split(" ")[0];

  function clearError(field: keyof FieldErrors) {
    setErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }
      return { ...previous, [field]: undefined };
    });
  }

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = "Ingresá el nombre del padre/madre";
    }

    if (!email.trim()) {
      nextErrors.email = "Ingresá el email";
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "Ingresá un email válido";
    }

    return nextErrors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    const isValid = Object.keys(nextErrors).length === 0;
    if (!isValid) {
      return;
    }

    setFullName("");
    setEmail("");
    setRelationship("Mamá");
    onSent();
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="flex items-center justify-between border-b border-border px-[26px] py-5 short:py-3">
        <div className="min-w-0">
          <div
            id="link-parent-title"
            className="font-display text-[18px] leading-[normal] font-semibold text-ink"
          >
            Vincular padre
          </div>
          <div className="text-[13px] leading-[normal] text-muted-soft">
            a {childFullName}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-divider-soft text-muted"
        >
          <CloseIcon width={18} height={18} strokeWidth={2.2} />
        </button>
      </div>

      <div className="px-[26px] py-[22px] short:py-4">
        <div className="mb-5 flex gap-[11px] rounded-[14px] bg-invite-info-bg px-4 py-[13px] short:mb-3.5 short:py-2.5">
          <InfoIcon className="mt-px flex-none text-invite-info-icon" />
          <span className="text-[13.5px] leading-[1.45] text-invite-info-fg">
            Le enviaremos un correo con un código para que active su cuenta.
            Solo verá el feed de {childFirstName}.
          </span>
        </div>

        <div className="mb-[18px] short:mb-3">
          <label htmlFor="parent-name" className={labelClass}>
            NOMBRE DEL PADRE/MADRE
          </label>
          <input
            id="parent-name"
            type="text"
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              clearError("fullName");
            }}
            placeholder="Ej. Diego Fernández"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={
              errors.fullName ? "parent-name-error" : undefined
            }
            className={fieldClass}
          />
          {errors.fullName && (
            <p id="parent-name-error" className={errorClass}>
              {errors.fullName}
            </p>
          )}
        </div>

        <div className="mb-[18px] short:mb-3">
          <label htmlFor="parent-email" className={labelClass}>
            EMAIL
          </label>
          <input
            id="parent-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError("email");
            }}
            placeholder="correo@ejemplo.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={
              errors.email ? "parent-email-error" : undefined
            }
            className={fieldClass}
          />
          {errors.email && (
            <p id="parent-email-error" className={errorClass}>
              {errors.email}
            </p>
          )}
        </div>

        <div
          role="group"
          aria-labelledby="parent-relationship-label"
          className="mb-5 short:mb-3.5"
        >
          <div
            id="parent-relationship-label"
            className="mb-2.5 text-[12px] leading-[normal] font-extrabold tracking-[0.7px] text-muted short:mb-1.5"
          >
            PARENTESCO
          </div>
          <div className="flex gap-[9px]">
            {RELATIONSHIPS.map((option) => {
              const isActive = relationship === option;

              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setRelationship(option)}
                  className={`flex-1 cursor-pointer rounded-full border-[1.5px] py-[11px] text-[14px] leading-[normal] font-extrabold short:py-2 ${
                    isActive
                      ? "border-invite-pill-border bg-invite-pill-bg text-invite-pill-fg"
                      : "border-border bg-paper text-nav-inactive"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-5 rounded-[16px] border-[1.5px] border-dashed border-invite-code-border bg-invite-code-bg p-[18px] text-center short:mb-3.5 short:p-3.5">
          <div className="mb-2 text-[12px] leading-[normal] font-extrabold tracking-[0.7px] text-invite-code-label short:mb-1.5">
            CÓDIGO DE INVITACIÓN
          </div>
          <div className="font-display text-[34px] leading-[normal] font-semibold tracking-[7px] text-invite-code-value short:text-[30px]">
            {INVITATION_CODE}
          </div>
          <div className="mt-1.5 text-[13px] leading-[normal] text-invite-code-label short:mt-1">
            Vence en 7 días
          </div>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-[9px] rounded-[14px] bg-linear-to-b from-coral-light to-coral py-[14px] text-[15.5px] leading-[normal] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,0.7)] short:py-3"
        >
          <SendIcon />
          Enviar invitación
        </button>
      </div>
    </form>
  );
}
