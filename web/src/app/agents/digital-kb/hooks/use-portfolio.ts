import useSWR from "swr";
import type { PortfolioResponse, ProjectDetailResponse } from "@/app/agents/digital-kb/types/portfolio";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });

export function usePortfolio() {
  const { data, error, isLoading } = useSWR<PortfolioResponse>(
    "/api/agent/v1/digital-kb/portfolio",
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 300_000 }
  );
  return { portfolio: data, error, isLoading };
}

export function useProject(slug: string) {
  const { data, error, isLoading } = useSWR<ProjectDetailResponse>(
    slug ? `/api/agent/v1/digital-kb/portfolio/${slug}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );
  return { project: data, error, isLoading };
}
