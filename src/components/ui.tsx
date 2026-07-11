import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";

export function Card({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-card border border-card-border rounded-[22px] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function RoundIconButton({
  onClick,
  href,
  children,
  className = "",
}: {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const cls = `w-10 h-10 rounded-full bg-card border border-avatar-border flex items-center justify-center shrink-0 cursor-pointer hover:brightness-95 transition ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function BackButton({ href }: { href: string }) {
  return (
    <RoundIconButton href={href}>
      <ChevronLeftIcon size={18} />
    </RoundIconButton>
  );
}

export function Pill({
  active,
  children,
  onClick,
  type = "button",
  className = "",
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={
        "px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap cursor-pointer border transition " +
        (active
          ? "bg-ink text-accent-ink border-ink"
          : "bg-card text-ink-soft border-input-border") +
        " " +
        className
      }
    >
      {children}
    </button>
  );
}

export function Toggle({
  on,
  onClick,
  activeColor = "var(--color-accent)",
}: {
  on: boolean;
  onClick?: () => void;
  activeColor?: string;
}) {
  return (
    <span
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="w-[46px] h-7 rounded-full p-[3px] shrink-0 transition-colors inline-block"
      style={{ background: on ? activeColor : "var(--color-toggle-off)" }}
    >
      <div
        className="w-[22px] h-[22px] rounded-full bg-card shadow transition-transform"
        style={{ transform: on ? "translateX(18px)" : "translateX(0)" }}
      />
    </span>
  );
}

export function Avatar({
  naam,
  kleur,
  size = 30,
}: {
  naam: string;
  kleur: string;
  size?: number;
}) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0 text-accent-ink"
      style={{
        width: size,
        height: size,
        background: kleur,
        fontSize: size * 0.42,
      }}
    >
      {naam ? naam[0].toUpperCase() : "?"}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={
        "px-6 py-[15px] rounded-full bg-accent text-accent-ink text-[15px] font-bold text-center cursor-pointer shadow-[0_5px_14px_rgba(196,99,59,0.32)] disabled:opacity-50 " +
        className
      }
    >
      {children}
    </button>
  );
}

export function FieldRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[13px] border-b border-divider last:border-b-0">
      <div className="text-[13.5px] text-muted shrink-0">{label}</div>
      <div
        className="text-[14.5px] font-semibold text-right"
        style={{ color: valueColor }}
      >
        {value}
      </div>
    </div>
  );
}
