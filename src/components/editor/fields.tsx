"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import s from "./Editor.module.css";
import { processImage, type ProcessedImage } from "@/lib/editor/images";

export function Field({ label, hint, children, id }: { label: string; hint?: ReactNode; children: ReactNode; id: string }) {
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <span className={s.hint}>{hint}</span>}
    </div>
  );
}

export function TextInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  placeholder?: string;
  type?: "text" | "url" | "email" | "date";
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Field label={props.label} hint={props.hint} id={id}>
      <input
        id={id}
        className={s.input}
        type={props.type || "text"}
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        spellCheck={props.type ? false : undefined}
      />
    </Field>
  );
}

export function TextArea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  large?: boolean;
  rows?: number;
}) {
  const id = useId();
  return (
    <Field label={props.label} hint={props.hint} id={id}>
      <textarea
        id={id}
        className={`${s.textarea} ${props.large ? s.textareaLarge : ""}`}
        value={props.value}
        rows={props.rows}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Field>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={s.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Select(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <Field label={props.label} hint={props.hint} id={id}>
      <select id={id} className={s.select} value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Comma-separated list input (e.g. interest tags). */
export function ListInput(props: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: ReactNode }) {
  const [text, setText] = useState(props.value.join(", "));
  const id = useId();
  return (
    <Field label={props.label} hint={props.hint} id={id}>
      <input
        id={id}
        className={s.input}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          props.onChange(
            e.target.value
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          );
        }}
      />
    </Field>
  );
}

export function ImagePicker(props: {
  label: string;
  src: string;
  kind: "cover" | "avatar";
  onPick: (img: ProcessedImage, fileName: string) => void;
  onRemove?: () => void;
  /** Text of the remove button (default "Remove"). */
  removeLabel?: string;
  hint?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  return (
    <div className={s.field}>
      <span className={s.label} id={id}>
        {props.label}
      </span>
      <div className={s.imageField}>
        {props.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.src} alt="" className={`${s.imagePreview} ${props.kind === "avatar" ? s.avatarPreview : ""}`} />
        ) : (
          <div className={`${s.imagePreview} ${props.kind === "avatar" ? s.avatarPreview : ""}`} />
        )}
        <div>
          <div className={s.row} style={{ flexWrap: "wrap" }}>
            <button
              type="button"
              className={s.btn}
              style={{ flex: "none" }}
              disabled={busy}
              aria-describedby={id}
              onClick={() => input.current?.click()}
            >
              {busy ? "Processing…" : props.src ? "Replace image" : "Upload image"}
            </button>
            {props.src && props.onRemove && (
              <button type="button" className={`${s.btn} ${s.btnGhost}`} style={{ flex: "none" }} onClick={props.onRemove}>
                {props.removeLabel ?? "Remove"}
              </button>
            )}
          </div>
          <p className={s.hint} style={{ margin: "8px 0 0" }}>
            {props.hint}
          </p>
          {error && (
            <p className={s.hint} role="alert" style={{ color: "var(--ed-danger)", margin: "6px 0 0" }}>
              {error}
            </p>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setError("");
          try {
            props.onPick(await processImage(file, props.kind), file.name);
          } catch (err) {
            setError(err instanceof Error ? err.message : "That image couldn't be used.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
