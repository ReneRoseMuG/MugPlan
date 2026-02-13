import { useMemo, useState } from "react";

type QueryPrimitive = string | number | boolean | null | undefined;
type QueryParamsInput = Record<string, QueryPrimitive>;

interface UseListFiltersOptions<TFilters extends object> {
  initialFilters: TFilters;
  initialPage?: number;
  buildQueryParams?: (filters: TFilters, page: number) => QueryParamsInput;
}

interface UseListFiltersResult<TFilters extends object> {
  filters: TFilters;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setFilters: React.Dispatch<React.SetStateAction<TFilters>>;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  resetFilters: () => void;
  queryParams: URLSearchParams;
}

export function useListFilters<TFilters extends object>(
  options: UseListFiltersOptions<TFilters>,
): UseListFiltersResult<TFilters> {
  const { initialFilters, initialPage = 1, buildQueryParams } = options;
  const [filters, setFilters] = useState<TFilters>(initialFilters);
  const [page, setPage] = useState(initialPage);

  const setFilter = <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setPage(1);
  };

  const queryParams = useMemo(() => {
    const rawParams = buildQueryParams ? buildQueryParams(filters, page) : {};
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(rawParams)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      params.set(key, String(value));
    }

    return params;
  }, [buildQueryParams, filters, page]);

  return {
    filters,
    page,
    setPage,
    setFilters,
    setFilter,
    resetFilters,
    queryParams,
  };
}

export type { QueryParamsInput, UseListFiltersOptions, UseListFiltersResult };
