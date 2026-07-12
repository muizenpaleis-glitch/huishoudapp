type IconProps = { className?: string; size?: number; style?: React.CSSProperties };

function Base({
  size = 20,
  className,
  style,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {children}
    </svg>
  );
}

function P(d: string) {
  return function Icon(props: IconProps) {
    return (
      <Base {...props}>
        <path d={d} />
      </Base>
    );
  };
}

export const ContractenIcon = P("M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01");
export const OnderhoudIcon = P(
  "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
);
export const FinancienIcon = P("M18 20V10M12 20V4M6 20v-6");
export const ChevronLeftIcon = P("M15 18l-6-6 6-6");
export const ChevronRightIcon = P("M9 6l6 6-6 6");
export const PlusIcon = P("M12 5v14M5 12h14");
export const BellIcon = P("M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0");
export const DocIcon = P("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6");
export const SendIcon = P("m22 2-7 20-4-9-9-4Z M22 2 11 13");
export const HuisIcon = P("M3 10.5 12 3l9 7.5V21h-6v-7h-6v7H3Z");
export const AgendaIcon = P("M8 2v4M16 2v4M3.5 9.5h17M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z");
export const LampIcon = P("M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.05V17h6v-2.25c0-.85.4-1.55 1-2.05A7 7 0 0 0 12 2Z");
export const BoltIcon = P("M13 2 3 14h7l-1 8 11-14h-7l1-8Z");
export const PinIcon = P("M12 2a6 6 0 0 0-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 0 0-6-6Z");
export const VideoIcon = P("M23 7l-7 5 7 5V7Z M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z");
export const WarningIcon = P("M12 8v5M12 16.5v.01M12 3 2 20h20L12 3Z");
export const CheckIcon = P("M20 6 9 17l-5-5");
export const ChecklistIcon = P("M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11");
export const InfoIcon = P("M12 8v.01M11 12h1v4h1M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z");
export const TrashIcon = P("M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3");
export function CameraIcon({ size = 20, className }: IconProps) {
  return (
    <Base size={size} className={className}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3.2" />
    </Base>
  );
}

export function SettingsIcon({ size = 20, className }: IconProps) {
  return (
    <Base size={size} className={className}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Base>
  );
}

// Contract category icons
export const CategorieIcons = {
  Energie: P("M13 2 4.5 13.5H11L10 22l9.5-12.5H13L13 2Z"),
  Verzekering: P("M12 3l7 3v5c0 4.8-3 8.6-7 10-4-1.4-7-5.2-7-10V6l7-3Z"),
  Abonnement: P("M17 2l4 4-4 4M21 6H8a5 5 0 0 0-5 5M7 22l-4-4 4-4M3 18h13a5 5 0 0 0 5-5"),
  Overig: P("M21 8l-9-5-9 5v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v9"),
};

// Onderhoud category icons
export const OnderhoudCategorieIcons = {
  Huis: P("M3 10.5 12 3l9 7.5V21h-6v-7h-6v7H3Z"),
  Apparaten: P("M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-5 5.9V22h-2v-5.1A6 6 0 0 1 6 11V7Z"),
  Auto: P("M4 16v-3.5L6 7h12l2 5.5V16M4 16h16M4 16v2.5h3V16M20 16v2.5h-3V16M8 12.5h.01M16 12.5h.01"),
  Tuin: P("M5 21c0-9 5-16 14-17-1 9-6 15-14 17ZM5 21c4-6 8-9 12-11"),
  Overig: P("M21 8l-9-5-9 5v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v9"),
};
