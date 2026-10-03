import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useActiveStaff } from '@/lib/active-staff';
import type { StaffMember } from '@/lib/api';

const copy = {
  ar: {
    title: 'من يستخدم البرنامج؟',
    empty: 'لا يوجد موظفون — أضفهم من الإعدادات',
    active: 'نشط',
  },
  fr: {
    title: 'Qui utilise l’application ?',
    empty: 'Aucun membre — ajoutez-les dans Paramètres',
    active: 'Actif',
  },
};

function initial(name: string) {
  return name.trim().charAt(0) || '?';
}

function StaffRow({
  member,
  selected,
  onSelect,
}: {
  member: StaffMember;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={`button-select-staff-${member.id}`}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-xs transition hover:bg-[#F1EEE8] ${selected ? 'bg-[#F1EEE8]' : ''}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3A3D3F] text-[11px] font-bold text-[#CFC3AE]">
        {initial(member.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-[#17212B]">{member.name}</span>
        <span className="block truncate text-[10px] text-[#8B949A]">{member.role}</span>
      </span>
      {selected && <Check size={16} className="shrink-0 text-[#2E9B68]" />}
    </button>
  );
}

export function StaffAccountMenu({ lang }: { lang: 'ar' | 'fr' }) {
  const t = copy[lang];
  const { staff, staffList, setActiveStaffId, isLoading } = useActiveStaff();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const selectable = staffList.filter(
    (m) => m.status === 'نشط' || m.status === 'Actif' || m.status === 'active',
  );
  const list = selectable.length > 0 ? selectable : staffList;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid="button-staff-account"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-[#E7E5E0]/80"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="hidden text-end md:block">
          <p className="max-w-[120px] truncate text-xs font-semibold text-[#17212B]">
            {staff?.name ?? (isLoading ? '…' : '—')}
          </p>
          <p className="text-[10px] text-[#5F6B76]">{staff?.role ?? t.title}</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3A3D3F] text-xs font-bold text-[#CFC3AE]">
          {staff ? initial(staff.name) : '?'}
        </div>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute end-0 top-[calc(100%+6px)] z-50 w-[min(100vw-2rem,280px)] rounded-[11px] border border-[#E7E5E0] bg-white p-2 shadow-xl"
        >
          <p className="px-2 py-1.5 text-[10px] font-bold tracking-wide text-[#9B8C77]">
            {t.title}
          </p>
          {list.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-[#8B949A]">{t.empty}</p>
          ) : (
            <div className="max-h-[280px] space-y-0.5 overflow-y-auto">
              {list.map((member) => (
                <StaffRow
                  key={member.id}
                  member={member}
                  selected={staff?.id === member.id}
                  onSelect={() => {
                    setActiveStaffId(member.id);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
