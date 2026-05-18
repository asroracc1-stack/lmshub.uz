import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface PaginatedQueryState {
  page: number;
  search: string;
  params: Record<string, any>;
}

export interface UsePaginatedQueryOptions {
  url: string;
  queryKey: (string | number | boolean | Record<string, any>)[];
  pageSize?: number;
  enabled?: boolean;
  initialPage?: number;
  initialSearch?: string;
  initialParams?: Record<string, any>;
}

export function usePaginatedQuery<T>({
  url,
  queryKey,
  pageSize = 10,
  enabled = true,
  initialPage = 0,
  initialSearch = "",
  initialParams = {},
}: UsePaginatedQueryOptions) {
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [params, setParams] = useState<Record<string, any>>(initialParams);

  const queryParams = useMemo(
    () => ({
      page,
      size: pageSize,
      query: search || undefined,
      ...params,
    }),
    [page, pageSize, search, params],
  );

  const query = useQuery<T>({
    queryKey: [...queryKey, queryParams],
    queryFn: async () => {
      const response = await api.get<T>(url, { params: queryParams });
      return response.data;
    },
    enabled,
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const totalPages = (query.data as any)?.totalPages ?? 0;

  return {
    ...query,
    page,
    setPage,
    search,
    setSearch,
    params,
    setParams,
    pageSize,
    totalPages,
  };
}
