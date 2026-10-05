import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { api, type Customer } from '@/lib/api';

type Lang = 'ar' | 'fr';

const labels = {
  ar: {
    title: 'إدارة العملاء',
    name: 'الاسم',
    phone: 'الهاتف',
    address: 'العنوان',
    actions: 'إجراءات',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    empty: 'لا يوجد عملاء',
    confirmDelete: 'حذف هذا العميل؟ الطلبات السابقة تبقى باسمه لكن بدون ربط.',
    editTitle: 'تعديل العميل',
  },
  fr: {
    title: 'Gestion des clients',
    name: 'Nom',
    phone: 'Téléphone',
    address: 'Adresse',
    actions: 'Actions',
    edit: 'Modifier',
    delete: 'Supprimer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    empty: 'Aucun client',
    confirmDelete:
      'Supprimer ce client ? Les commandes passées gardent le nom mais ne seront plus liées.',
    editTitle: 'Modifier le client',
  },
};

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] bg-white px-3 text-xs font-normal outline-none focus:border-[#CFC3AE]"
      />
    </label>
  );
}

export function CustomersManagerModal({
  lang,
  onClose,
}: {
  lang: Lang;
  onClose: () => void;
}) {
  const t = labels[lang];
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: api.getCustomers,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Omit<Customer, 'id'>;
    }) => api.updateCustomer(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const filtered = customers.filter((c) =>
    `${c.fullName} ${c.phone} ${c.address}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17212B]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="fade-up flex max-h-[90vh] w-full max-w-[720px] flex-col rounded-t-[16px] bg-[#F8F8F6] shadow-2xl sm:rounded-[13px]">
        <div className="flex items-center justify-between border-b border-[#E7E5E0] p-5">
          <h2 className="text-base font-bold">{t.title}</h2>
          <button
            type="button"
            data-testid="button-close-customers-manager"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#8B949A] hover:bg-[#E7E5E0]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="border-b border-[#E7E5E0] p-4">
          <input
            data-testid="input-customers-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث...' : 'Rechercher…'}
            className="h-10 w-full rounded-lg border border-[#E7E5E0] bg-white px-3 text-xs outline-none focus:border-[#CFC3AE]"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#9B8C77]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#5F6B76]">{t.empty}</p>
          ) : (
            <table className="w-full min-w-[520px] text-xs">
              <thead className="text-[10px] text-[#8B949A]">
                <tr>
                  <th className="pb-2 text-start font-medium">{t.name}</th>
                  <th className="pb-2 text-start font-medium">{t.phone}</th>
                  <th className="pb-2 text-start font-medium">{t.address}</th>
                  <th className="pb-2 text-end font-medium">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    data-testid={`row-customer-${c.id}`}
                    className="border-t border-[#F0EEE9]"
                  >
                    <td className="py-3 pe-2 font-semibold">{c.fullName}</td>
                    <td className="py-3 pe-2 text-[#5F6B76]">{c.phone || '—'}</td>
                    <td className="max-w-[180px] truncate py-3 pe-2 text-[#5F6B76]">
                      {c.address || '—'}
                    </td>
                    <td className="py-3 text-end">
                      <button
                        type="button"
                        data-testid={`button-edit-customer-${c.id}`}
                        onClick={() => setEditing(c)}
                        className="me-1 rounded p-1.5 text-[#8B949A] hover:bg-[#F1EEE8]"
                        title={t.edit}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        data-testid={`button-delete-customer-${c.id}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm(t.confirmDelete)) {
                            deleteMutation.mutate(c.id);
                          }
                        }}
                        className="rounded p-1.5 text-[#D95C55] hover:bg-[#FBEDEC] disabled:opacity-50"
                        title={t.delete}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#17212B]/40 p-4">
          <div className="w-full max-w-md rounded-[13px] bg-[#F8F8F6] p-5 shadow-2xl">
            <h3 className="mb-4 text-sm font-bold">{t.editTitle}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                updateMutation.mutate({
                  id: editing.id,
                  body: {
                    fullName: String(fd.get('fullName')),
                    phone: String(fd.get('phone')),
                    address: String(fd.get('address')),
                  },
                });
              }}
              className="space-y-3"
            >
              <Field label={t.name} name="fullName" defaultValue={editing.fullName} required />
              <Field label={t.phone} name="phone" defaultValue={editing.phone} />
              <Field label={t.address} name="address" defaultValue={editing.address} />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-[8px] border border-[#E7E5E0] px-3 py-2 text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  data-testid="button-save-customer-edit"
                  disabled={updateMutation.isPending}
                  className="rounded-[8px] bg-[#3A3D3F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    t.save
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
