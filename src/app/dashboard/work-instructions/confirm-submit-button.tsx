"use client";

import type { CSSProperties } from "react";

export function ConfirmSubmitButton({
  confirmText,
  className,
  style,
  children,
  ariaLabel,
  formAction,
}: {
  confirmText: string;
  className?: string;
  style?: CSSProperties;
  children: React.ReactNode;
  ariaLabel?: string;
  // Optional — lets this button submit to a DIFFERENT server action than
  // the enclosing <form>'s own `action` (the standard HTML formaction
  // attribute), so one form can have e.g. a "Save" button using the
  // form's default action and a "Remove" button next to it that submits
  // somewhere else entirely, both still going through the same confirm
  // step below.
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <button
      type="submit"
      className={className}
      style={style}
      aria-label={ariaLabel}
      formAction={formAction}
      onClick={(e) => {
        if (!window.confirm(confirmText)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
