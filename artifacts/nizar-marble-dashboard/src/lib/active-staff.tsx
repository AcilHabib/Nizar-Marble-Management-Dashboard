import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type StaffMember } from '@/lib/api';
import { setApiStaffActor } from '@/lib/api-client';

const STORAGE_KEY = 'nizar-active-staff-id';

type ActiveStaffContextValue = {
  staff: StaffMember | null;
  staffList: StaffMember[];
  setActiveStaffId: (id: string) => void;
  isLoading: boolean;
};

const ActiveStaffContext = createContext<ActiveStaffContextValue | null>(null);

function pickInitialStaff(
  list: StaffMember[],
  savedId: string | null,
): StaffMember | null {
  const active = list.filter((m) => m.status === 'نشط' || m.status === 'Actif');
  const pool = active.length > 0 ? active : list;
  if (savedId) {
    const found = pool.find((m) => m.id === savedId);
    if (found) return found;
  }
  return pool[0] ?? null;
}

export function ActiveStaffProvider({ children }: { children: ReactNode }) {
  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: api.getStaff,
  });

  const [staffId, setStaffIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const staff = useMemo(
    () => pickInitialStaff(staffList, staffId),
    [staffList, staffId],
  );

  useEffect(() => {
    if (!staff && staffList.length > 0) {
      const initial = pickInitialStaff(staffList, staffId);
      if (initial) setStaffIdState(initial.id);
    }
  }, [staff, staffList, staffId]);

  useEffect(() => {
    setApiStaffActor(
      staff
        ? { staffId: staff.id, staffName: staff.name }
        : { staffName: '—' },
    );
  }, [staff]);

  const setActiveStaffId = useCallback((id: string) => {
    setStaffIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      staff,
      staffList,
      setActiveStaffId,
      isLoading,
    }),
    [staff, staffList, setActiveStaffId, isLoading],
  );

  return (
    <ActiveStaffContext.Provider value={value}>
      {children}
    </ActiveStaffContext.Provider>
  );
}

export function useActiveStaff() {
  const ctx = useContext(ActiveStaffContext);
  if (!ctx) {
    throw new Error('useActiveStaff must be used within ActiveStaffProvider');
  }
  return ctx;
}
