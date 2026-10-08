import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Scissors, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  edit: string;
  save: string;
  cancel: string;
  delete: string;
};

function formatDimM(n: number) {
  return formatNumber(n, 2);
}

type Draft = {
  lengthM: number;
  widthM: number;
  thicknessM: number;
  sliceCount: number;
  purchasePerSqm: number;
  sellingPerSqm: number;
  supplierId: string;
};

function draftFromSlice(slice: MarbleSlice): Draft {
  return {
    lengthM: slice.lengthM,
    widthM: slice.widthM,
    thicknessM: slice.thicknessM,
    sliceCount: slice.sliceCount,
    purchasePerSqm: slice.purchasePerSqm,
    sellingPerSqm: slice.sellingPerSqm,
    supplierId: slice.supplier.id,
  };
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFromSlice(slice));

  useEffect(() => {
    if (!editing) setDraft(draftFromSlice(slice));
  }, [slice, editing]);

  const save = useMutation({
    mutationFn: (payload: Draft) =>
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
      setEditing(false);
    },
  });

  const deleteSlice = useMutation({
    mutationFn: () => api.deleteMarbleSlice(slice.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marble-kind', kindId] });
      qc.invalidateQueries({ queryKey: ['marble-kinds'] });
    },
  });

  const supplierName =
    suppliers.find((s) => s.id === draft.supplierId)?.name ?? slice.supplier.name;
  const stockArea = slice.availableNetAreaSqm;
  const stockPurchase = Math.round(stockArea * slice.purchasePerSqm);
  const stockSelling = Math.round(stockArea * slice.sellingPerSqm);

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
      className="digits-latin w-full min-w-[52px] rounded border border-[#E7E5E0] px-1.5 py-1 text-xs"
    />
  );

  return (
    <tr className="border-t border-[#F0EEE9]">
      <td className="px-4 py-2.5">
        {editing ? (
          <select
            value={draft.supplierId}
            onChange={(e) =>
              setDraft((d) => ({ ...d, supplierId: e.target.value }))
            }
            className="w-full max-w-[140px] rounded border border-[#E7E5E0] px-1.5 py-1 text-xs"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-medium text-[#3A3D3F]">{supplierName}</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {editing ? (
          <div className="flex flex-wrap items-center gap-1 digits-latin">
            {numInput(draft.lengthM, (n) =>
              setDraft((d) => ({ ...d, lengthM: n })),
            )}
            <span>×</span>
            {numInput(draft.widthM, (n) => setDraft((d) => ({ ...d, widthM: n })))}
            <span>×</span>
            {numInput(
              draft.thicknessM,
              (n) => setDraft((d) => ({ ...d, thicknessM: n })),
              '0.001',
            )}
          </div>
        ) : (
          <span className="digits-latin text-[#3A3D3F]">
            {formatDimM(slice.lengthM)} × {formatDimM(slice.widthM)} ×{' '}
            {formatNumber(slice.thicknessM, 3)}
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 digits-latin">
        {editing ? (
          numInput(draft.sliceCount, (n) =>
            setDraft((d) => ({
              ...d,
              sliceCount: Math.max(1, Math.round(n)),
            })),
          )
        ) : (
          <>
            {formatNumber(slice.availableSliceCount ?? slice.sliceCount)}
            {(slice.availableSliceCount ?? slice.sliceCount) < slice.sliceCount && (
              <span className="text-[#8B949A]"> / {formatNumber(slice.sliceCount)}</span>
            )}
          </>
        )}
      </td>
      <td className="digits-latin px-4 py-2.5">
        {slice.wasteAreaOneSqm > 0 ? formatAreaSqm(slice.wasteAreaOneSqm) : '—'}
      </td>
      <td className="digits-latin px-4 py-2.5">
        {formatAreaSqm(slice.availableNetAreaSqm)}
      </td>
      <td className="px-4 py-2.5 text-end">
        {editing ? (
          numInput(draft.purchasePerSqm, (n) =>
            setDraft((d) => ({ ...d, purchasePerSqm: n })),
          )
        ) : (
          <span className="digits-latin">{formatNumber(slice.purchasePerSqm)}</span>
        )}
      </td>
      <td className="mono digits-latin px-4 py-2.5 text-end">
        {formatCurrency(stockPurchase, lang)}
      </td>
      <td className="px-4 py-2.5 text-end">
        {editing ? (
          numInput(draft.sellingPerSqm, (n) =>
            setDraft((d) => ({ ...d, sellingPerSqm: n })),
          )
        ) : (
          <span className="digits-latin">{formatNumber(slice.sellingPerSqm)}</span>
        )}
      </td>
      <td className="mono digits-latin px-4 py-2.5 text-end">
        {formatCurrency(stockSelling, lang)}
      </td>
      <td className="px-4 py-2.5 text-end">
        <div className="flex items-center justify-end gap-0.5">
          {editing ? (
            <>
              <button
                type="button"
                data-testid={`button-save-slice-${slice.id}`}
                disabled={save.isPending}
                title={labels.save}
                onClick={() => save.mutate(draft)}
                className="rounded p-1.5 text-[#2E9B68] hover:bg-[#EAF6EF] disabled:opacity-50"
              >
                {save.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-[10px] font-bold">{labels.save}</span>
                )}
              </button>
              <button
                type="button"
                data-testid={`button-cancel-slice-${slice.id}`}
                title={labels.cancel}
                onClick={() => {
                  setDraft(draftFromSlice(slice));
                  setEditing(false);
                }}
                className="rounded p-1.5 text-[#5F6B76] hover:bg-[#F1EEE8]"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <button
              type="button"
              data-testid={`button-edit-slice-${slice.id}`}
              title={labels.edit}
              onClick={() => setEditing(true)}
              className="rounded p-1.5 text-[#9B8C77] hover:bg-[#F1EEE8]"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            type="button"
            data-testid={`button-waste-slice-${slice.id}`}
            title={labels.waste}
            onClick={() => onEditWaste(slice)}
            className="rounded p-1.5 text-[#9B8C77] hover:bg-[#F1EEE8]"
          >
            <Scissors size={14} />
          </button>
          <button
            type="button"
            data-testid={`button-delete-slice-${slice.id}`}
            disabled={deleteSlice.isPending}
            title={labels.delete}
            onClick={() => deleteSlice.mutate()}
            className="rounded p-1.5 text-[#D95C55] hover:bg-[#FBEDEC] disabled:opacity-50"
          >
            {deleteSlice.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
