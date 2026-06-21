import Link from "next/link";

type InventoryPaginationProps = {
  basePath: string;
  page: number;
  pageSize: number;
  totalCount: number;
  queryEntries: Array<[string, string]>;
};

function buildPageHref(basePath: string, queryEntries: Array<[string, string]>, targetPage: number) {
  const searchParams = new URLSearchParams(queryEntries);
  if (targetPage <= 1) {
    searchParams.delete("page");
  } else {
    searchParams.set("page", String(targetPage));
  }

  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function InventoryPagination({ basePath, page, pageSize, totalCount, queryEntries }: InventoryPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalCount === 0) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted md:flex-row md:items-center md:justify-between">
      <p>
        Showing {start}-{end} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link className="rounded-lg border border-border bg-white px-3 py-2 font-medium text-foreground" href={buildPageHref(basePath, queryEntries, page - 1)}>
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-slate-400">Previous</span>
        )}
        <span>
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link className="rounded-lg border border-border bg-white px-3 py-2 font-medium text-foreground" href={buildPageHref(basePath, queryEntries, page + 1)}>
            Next
          </Link>
        ) : (
          <span className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-slate-400">Next</span>
        )}
      </div>
    </div>
  );
}
