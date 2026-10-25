"use client";

import { useState, type FormEvent } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

const ROOMS = ["Soles", "Lunas", "Estrellas"] as const;

type AddChildFormProps = {
  onCancel: () => void;
  onSaved: () => void;
};

type FieldErrors = {
  fullName?: string;
  birthDate?: string;
  room?: string;
};

const fieldClass =
  "w-full rounded-[14px] border-[1.5px] border-field-border bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-field-placeholder focus:border-field-focus focus:outline-none";
const labelClass =
  "mb-2 text-[12px] font-extrabold tracking-[0.7px] text-muted";
const errorClass = "mt-1.5 text-[12.5px] font-semibold text-danger";

function getTodayValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function AddChildForm({ onCancel, onSaved }: AddChildFormProps) {
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [room, setRoom] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

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
      nextErrors.fullName = "Ingresá el nombre completo";
    }

    if (!birthDate) {
      nextErrors.birthDate = "Ingresá la fecha de nacimiento";
    } else if (birthDate > getTodayValue()) {
      nextErrors.birthDate = "La fecha no puede ser futura";
    }

    if (!room) {
      nextErrors.room = "Seleccioná una sala";
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
    setBirthDate("");
    setRoom("");
    setAllergies("");
    setMedicalNotes("");
    onSaved();
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="flex items-center justify-between border-b border-border px-[26px] py-5">
        <button
          type="button"
          onClick={onCancel}
          className="text-[15px] font-bold text-muted"
        >
          Cancelar
        </button>
        <span
          id="add-child-title"
          className="font-display text-[18px] font-semibold text-ink"
        >
          Agregar niño
        </span>
        <button
          type="submit"
          className="text-[15px] font-extrabold text-coral-deep-light"
        >
          Guardar
        </button>
      </div>

      <div className="px-[26px] py-6">
        <div className="mb-[18px]">
          <label htmlFor="child-full-name" className={labelClass}>
            NOMBRE COMPLETO
          </label>
          <input
            id="child-full-name"
            type="text"
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              clearError("fullName");
            }}
            placeholder="Ej. Martina López"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={
              errors.fullName ? "child-full-name-error" : undefined
            }
            className={fieldClass}
          />
          {errors.fullName && (
            <p id="child-full-name-error" className={errorClass}>
              {errors.fullName}
            </p>
          )}
        </div>

        <div className="mb-[18px] flex items-start gap-3.5">
          <div className="flex-1">
            <label htmlFor="child-birth-date" className={labelClass}>
              FECHA DE NACIMIENTO
            </label>
            <input
              id="child-birth-date"
              type="date"
              value={birthDate}
              onChange={(event) => {
                setBirthDate(event.target.value);
                clearError("birthDate");
              }}
              aria-invalid={Boolean(errors.birthDate)}
              aria-describedby={
                errors.birthDate ? "child-birth-date-error" : undefined
              }
              className={fieldClass}
            />
            {errors.birthDate && (
              <p id="child-birth-date-error" className={errorClass}>
                {errors.birthDate}
              </p>
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="child-room" className={labelClass}>
              SALA
            </label>
            <div className="relative">
              <select
                id="child-room"
                value={room}
                onChange={(event) => {
                  setRoom(event.target.value);
                  clearError("room");
                }}
                aria-invalid={Boolean(errors.room)}
                aria-describedby={errors.room ? "child-room-error" : undefined}
                className={`${fieldClass} appearance-none pr-10 font-bold ${room ? "" : "text-field-placeholder"}`}
              >
                <option value="" disabled>
                  Seleccioná una sala
                </option>
                {ROOMS.map((roomOption) => (
                  <option key={roomOption} value={roomOption}>
                    {roomOption}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[#B0A290]" />
            </div>
            {errors.room && (
              <p id="child-room-error" className={errorClass}>
                {errors.room}
              </p>
            )}
          </div>
        </div>

        <div className="mb-[18px]">
          <label htmlFor="child-allergies" className={labelClass}>
            ALERGIAS (ETIQUETAS)
          </label>
          <input
            id="child-allergies"
            type="text"
            value={allergies}
            onChange={(event) => setAllergies(event.target.value)}
            placeholder="Ej. Maní, Lactosa"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="child-medical-notes" className={labelClass}>
            NOTAS MÉDICAS
          </label>
          <textarea
            id="child-medical-notes"
            value={medicalNotes}
            onChange={(event) => setMedicalNotes(event.target.value)}
            placeholder="Indicaciones, medicación, contactos…"
            className={`${fieldClass} min-h-[90px] resize-y leading-[1.5]`}
          />
        </div>
      </div>
    </form>
  );
}
