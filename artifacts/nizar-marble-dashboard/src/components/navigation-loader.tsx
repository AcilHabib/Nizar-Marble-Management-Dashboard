import { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { LoadingBar } from '@/components/page-loading';

export function NavigationLoader() {
  const [location] = useLocation();
  const [routePending, setRoutePending] = useState(false);
  const fetching = useIsFetching();
  const mutating = useIsMutating();

  useEffect(() => {
    setRoutePending(true);
    const t = window.setTimeout(() => setRoutePending(false), 400);
    return () => window.clearTimeout(t);
  }, [location]);

  const active = routePending || fetching > 0 || mutating > 0;
  return <LoadingBar active={active} />;
}
