"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Member } from "@/lib/members";
import { ActiveMemberProvider } from "@/components/ActiveMemberContext";
import {
  ContractenIcon,
  OnderhoudIcon,
  AgendaIcon,
  FinancienIcon,
  HuisIcon,
  SettingsIcon,
} from "@/components/icons";

const TABS = [
  { key: "contracten", href: "/contracten", label: "Contracten", Icon: ContractenIcon },
  { key: "onderhoud", href: "/onderhoud", label: "Onderhoud", Icon: OnderhoudIcon },
  { key: "agenda", href: "/agenda", label: "Agenda", Icon: AgendaIcon },
  { key: "financien", href: "/financien", label: "Financiën", Icon: FinancienIcon },
  { key: "huis", href: "/huis", label: "Huis", Icon: HuisIcon },
  { key: "instellingen", href: "/instellingen", label: "Instellingen", Icon: SettingsIcon },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({
  members,
  children,
}: {
  members: Member[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <ActiveMemberProvider members={members}>
      <div className="flex w-full min-h-screen bg-cream text-ink">
        {/* Desktop sidebar */}
        <div className="hidden md:flex w-[228px] shrink-0 bg-sidebar p-7 px-4 flex-col gap-7 box-border">
          <div className="flex items-center gap-3 px-2.5">
            <div className="w-[42px] h-[42px] rounded-full bg-card border border-avatar-border flex items-center justify-center shrink-0">
              <Image src="/wapen-klein.png" alt="Familiewapen" width={32} height={35} className="object-contain" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">Ons huis</div>
              <div className="text-[11px] font-semibold tracking-wider uppercase text-hint">
                Mus potens est
              </div>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {TABS.map((t) => {
              const active = isActive(pathname, t.href);
              return (
                <Link
                  key={t.key}
                  href={t.href}
                  className="flex items-center gap-3 px-3 py-[11px] rounded-2xl text-[15px]"
                  style={{
                    background: active ? "var(--color-card)" : "transparent",
                    color: active ? "var(--color-accent)" : "var(--color-ink-soft)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <t.Icon size={19} />
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto px-2.5 text-[12.5px] text-muted">
            Gedeeld account · {members.map((m) => m.naam).join(" & ")}
          </div>
        </div>

        {/* Main column */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          <div className="flex-1 min-h-0 pb-[110px] md:pb-6">{children}</div>

          {/* Bottom tab bar (mobile) */}
          <div className="md:hidden fixed left-2.5 right-2.5 bottom-3.5 bg-card/92 backdrop-blur-md border border-avatar-border rounded-[24px] p-1.5 flex shadow-[0_6px_22px_rgba(94,72,50,0.12)] z-10">
            {TABS.map((t) => {
              const active = isActive(pathname, t.href);
              return (
                <Link
                  key={t.key}
                  href={t.href}
                  className="flex-1 min-w-0 flex flex-col items-center gap-[3px] py-2 pb-1.5 rounded-2xl"
                  style={{
                    background: active ? "var(--color-accent-tint)" : "transparent",
                    color: active ? "var(--color-accent)" : "var(--color-muted)",
                  }}
                >
                  <t.Icon size={20} />
                  <div className="text-[9.5px] font-semibold truncate max-w-full">{t.label}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </ActiveMemberProvider>
  );
}
