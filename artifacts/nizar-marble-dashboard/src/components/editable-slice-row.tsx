import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Scissors, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, type MarbleSlice, type Supplier } from '@/lib/api';
import { formatAreaSqm, formatCurrency, formatNumber } from '@/lib/format';

type Lang = 'ar' | 'fr';

type Labels = {
  supplier: string;
  dimensions: string;
  count: string;
  wasteArea: string;
  netArea: string;
  purchasePerSqm: string;
  purchaseTotal: string;
  sellingPerSqm: string;
  sellingTotal: string;
  waste: string;
  delete: string;
};

function formatDimM(n: number) {
  return formatNumber(n, 2);
}

export function EditableSliceRow({
  slice,
  kindId,
  lang,
  labels,
  suppliers,
  onEditWaste,
}: {
  slice: MarbleSlice;
  kindId: string;
  lang: Lang;
  labels: Labels;
  suppliers: Supplier[];
  onEditWaste: (slice: MarbleSlice) => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({
    lengthM: slice.lengthM,
    widthM: slice.widthM,
    thicknessM: slice.thicknessM,
    sliceCount: slice.sliceCount,
    purchasePerSqm: slice.purchasePerSqm,
    sellingPerSqm: slice.sellingPerSqm,
    supplierId: slice.supplier.id,
  });

  const save = useMutation({
    mutationFn: (payload: typeof draft) =>
      api.updateMarbleSlice(slice.id, {
        lengthM: payload.lengthM,
        widthM: payload.widthM,
        thicknessM: payload.thicknessM,
        sliceCount: payload.sliceCount,
        purchasePerSqm: payload.purchasePerSqm,
        sellingPerSqm: payload.sellingPerSqm,
        supplierId: payload.supplierId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marble-kind', kindId] });
      qc.invalidateQueries({ queryKey: ['marble-kinds'] });
    },
  });

  const persist = (patch: Partial<typeof draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    save.mutate(next);
  };

  const deleteSlice = useMutation({
    mutationFn: () => api.deleteMarbleSlice(slice.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marble-kind', kindId] });
      qc.invalidateQueries({ queryKey: ['marble-kinds'] });
    },
  });

  const numInput = (
    value: number,
    onChange: (n: number) => void,
    step = '0.01',
  ) => (
    <input
      type="number"
      step={step}
      value={value || ''}
      onChange={(e) => onChange(Number(e.target.value))}
      onBlur={() => save.mutate(draft)}
      className="digits-latin w-full min-w-[52px] rounded border border-[#E7E5E0] px-1.5 py-1 text-xs"
    />
  );

  return (
    <tr className="border-t border-[#F0EEE9]">
      <td className="px-4 py-2">
        <select
          value={draft.supplierId}
          onChange={(e) => persist({ supplierId: e.target.value })}
          className="w-full max-w-[140px] rounded border border-[#E7E5E0] px-1.5 py-1 text-xs"
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap items-center gap-1 digits-latin text-[#5F6B76]">
          {numInput(draft.lengthM, (n) => setDraft((d) => ({ ...d, lengthM: n })), '0.01')}
          <span>×</span>
          {numInput(draft.widthM, (n) => setDraft((d) => ({ ...d, widthM: n })))}
          <span>×</span>
          {numInput(
            draft.thicknessM,
            (n) => setDraft((d) => ({ ...d, thicknessM: n })),
            '0.001',
          )}
        </div>
      </td>
      <td className="px-4 py-2">
        {numInput(draft.sliceCount, (n) =>
          setDraft((d) => ({ ...d, sliceCount: Math.max(1, Math.round(n)) })),
        )}
      </td>
      <td className="digits-latin px-4 py-2">
        {slice.wasteAreaOneSqm > 0 ? formatAreaSqm(slice.wasteAreaOneSqm) : '—'}
      </td>
      <td className="digits-latin px-4 py-2">
        {formatAreaSqm(slice.totalAreaSqm)}
      </td>
      <td className="px-4 py-2 text-end">
        {numInput(draft.purchasePerSqm, (n) =>
          setDraft((d) => ({ ...d, purchasePerSqm: n })),
        )}
      </td>
      <td className="mono digits-latin px-4 py-2 text-end">
        {formatCurrency(slice.purchaseTotal, lang)}
      </td>
      <td className="px-4 py-2 text-end">
        {numInput(draft.sellingPerSqm, (n) =>
          setDraft((d) => ({ ...d, sellingPerSqm: n })),
        )}
      </td>
      <td className="mono digits-latin px-4 py-2 text-end">
        {formatCurrency(slice.sellingTotal, lang)}
      </td>
      <td className="px-4 py-2 text-end">
        <button
          type="button"
          data-testid={`button-waste-slice-${slice.id}`}
          title={labels.waste}
          onClick={() => onEditWaste(slice)}
          className="me-2 inline-flex rounded p-1.5 text-[#9B8C77] hover:bg-[#F1EEE8]"
        >
          <Scissors size={14} />
        </button>
        {save.isPending && (
          <Loader2 className="inline h-3 w-3 animate-spin text-[#9B8C77]" />
        )}
      </td>
      <td className="px-4 py-2 text-end">
        <button
          type="button"
          data-testid={`button-delete-slice-${slice.id}`}
          disabled={deleteSlice.isPending}
          onClick={() => deleteSlice.mutate()}
          className="text-[#D95C55] hover:opacity-80 disabled:opacity-50"
        >
          {deleteSlice.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      </td>
    </tr>
  );
}
