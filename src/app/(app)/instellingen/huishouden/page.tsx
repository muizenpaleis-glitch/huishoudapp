import Link from "next/link";
import { getMembers } from "@/lib/members";
import { BackButton, Card, Avatar } from "@/components/ui";
import { ChevronRightIcon, InfoIcon, PlusIcon } from "@/components/icons";
import { ActiveBadge } from "./ActiveBadge";

export default async function HuishoudenPage() {
  const members = await getMembers();

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <div className="max-w-[640px] mx-auto flex flex-col gap-4.5">
        <div className="flex items-center gap-3">
          <BackButton href="/instellingen" />
          <div>
            <div className="text-[21px] font-bold tracking-tight">Huishouden</div>
            <div className="text-[13px] text-muted">{members.length} leden · gedeeld</div>
          </div>
        </div>

        <div className="rounded-2xl p-3.5 flex gap-2.5 items-start bg-accent-tint">
          <InfoIcon size={18} className="text-accent shrink-0 mt-0.5" />
          <div className="text-[13.5px] font-semibold leading-snug" style={{ color: "#A24E28" }}>
            Leden gelden voor de hele app. Wie je hier toevoegt, kun je overal aan taken en contracten toewijzen.
          </div>
        </div>

        <Card className="px-4 py-1">
          {members.map((m, i) => (
            <Link
              key={m.id}
              href={`/instellingen/huishouden/${m.id}`}
              className={`flex items-center gap-3 py-3.5 ${i < members.length - 1 ? "border-b border-divider" : ""}`}
            >
              <Avatar naam={m.naam} kleur={m.kleur} size={38} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[15px] font-semibold">{m.naam}</div>
                  <ActiveBadge memberId={m.id} />
                </div>
                <div className="text-[12.5px] text-muted mt-0.5">{m.email || "Geen e-mail"}</div>
              </div>
              <ChevronRightIcon size={16} className="text-chevron shrink-0" />
            </Link>
          ))}
        </Card>

        <Link
          href="/instellingen/huishouden/nieuw"
          className="border-[1.5px] border-dashed border-input-border rounded-[20px] p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-track flex items-center justify-center shrink-0">
            <PlusIcon size={16} className="text-accent" />
          </div>
          <div className="text-[14px] font-semibold text-ink-soft">Lid toevoegen</div>
        </Link>

        <div className="text-[12.5px] text-muted leading-relaxed px-1">
          Eén gedeeld account, geen aparte logins. Het lid met &ldquo;Jij&rdquo; is wie deze telefoon gebruikt — dat
          stel je per toestel in via een lid te openen. Het geeft geen extra rechten, alleen een handige standaard
          voor &ldquo;mijn to-do&apos;s&rdquo;.
        </div>
      </div>
    </div>
  );
}
