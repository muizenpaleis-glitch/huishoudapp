import Link from "next/link";
import { getMembers } from "@/lib/members";
import { ModuleHeader } from "@/components/ModuleHeader";
import { Card } from "@/components/ui";
import { ChevronRightIcon, ContractenIcon, BellIcon, SettingsIcon, InfoIcon } from "@/components/icons";

export default async function InstellingenPage() {
  const members = await getMembers();

  const items = [
    {
      key: "huishouden",
      label: "Huishouden",
      sub: members.map((m) => m.naam).join(", "),
      iconBg: "#F6E3D7",
      iconC: "#C4633B",
      Icon: ContractenIcon,
      href: "/instellingen/huishouden",
    },
    {
      key: "notificaties",
      label: "Notificaties",
      sub: "In-app, e-mail, push",
      iconBg: "#F5E8CB",
      iconC: "#A9761C",
      Icon: BellIcon,
      href: null,
    },
    {
      key: "account",
      label: "Gedeeld account",
      sub: "Eén login voor het hele huis",
      iconBg: "#E4ECDD",
      iconC: "#5C7F55",
      Icon: SettingsIcon,
      href: null,
    },
    {
      key: "over",
      label: "Over de app",
      sub: "Ons huis · versie 0.1",
      iconBg: "#EFE7DA",
      iconC: "#7C6B5B",
      Icon: InfoIcon,
      href: null,
    },
  ] as const;

  return (
    <div className="flex flex-col min-h-full pb-8">
      <ModuleHeader title="Instellingen" subtitle="Ons huis · gedeeld account" />

      <div className="px-5 mt-5 flex flex-col gap-2.5 max-w-[640px] w-full mx-auto">
        <div className="text-[12.5px] font-bold tracking-wider uppercase text-label pl-1">
          Algemeen
        </div>
        <Card className="px-4.5 py-1">
          {items.map((item, i) => {
            const row = (
              <div
                className={`flex items-center gap-3 py-4 ${i < items.length - 1 ? "border-b border-divider" : ""}`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: item.iconBg, color: item.iconC }}
                >
                  <item.Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-semibold">{item.label}</div>
                  <div className="text-[12.5px] text-muted mt-0.5 truncate">{item.sub}</div>
                </div>
                {item.href && <ChevronRightIcon size={16} className="text-chevron shrink-0" />}
              </div>
            );
            return item.href ? (
              <Link key={item.key} href={item.href}>
                {row}
              </Link>
            ) : (
              <div key={item.key}>{row}</div>
            );
          })}
        </Card>
      </div>

      <div className="mt-auto pt-8 text-center text-[11.5px] font-semibold tracking-widest uppercase text-hint">
        Mus potens est
      </div>
    </div>
  );
}
