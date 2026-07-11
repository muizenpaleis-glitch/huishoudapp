import Image from "next/image";

export function ModuleHeader({
  title,
  subtitle,
  right,
  showCrest = true,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  showCrest?: boolean;
}) {
  return (
    <div className="pt-16 md:pt-6 px-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {showCrest && (
          <div className="md:hidden w-[46px] h-[46px] rounded-full bg-card border border-avatar-border flex items-center justify-center shrink-0">
            <Image src="/wapen-klein.png" alt="Familiewapen" width={34} height={37} className="object-contain" />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[26px] font-bold tracking-tight leading-tight">{title}</div>
          {subtitle && <div className="text-[13.5px] text-muted mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}
