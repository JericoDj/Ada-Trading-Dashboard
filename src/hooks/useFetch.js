import { useCallback, useEffect, useState } from "react";
import { useData } from "../context/DataContext.jsx";

/** GET a backend path through the authenticated client; optional polling. */
export function useFetch(path, { intervalMs = 0, allowStatus } = {}) {
  const { call } = useData();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!path) return;
    try {
      setData(await call(path, { allowStatus }));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [path, call]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true);
    load();
    if (!intervalMs) return;
    const t = setInterval(load, intervalMs);
    return () => clearInterval(t);
  }, [load, intervalMs]);

  return { data, error, loading, reload: load };
}
