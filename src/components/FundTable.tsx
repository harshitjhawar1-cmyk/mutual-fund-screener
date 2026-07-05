import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
  SortingState,
  Updater,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Fund } from '../types/fund';
import { fmt, fmtNav } from '../utils/calculations';

const RETURNS_COLUMNS = new Set([
  'sixMonth', 'oneYear', 'threeYear', 'fiveYear', 'sevenYear', 'tenYear', 'xirr', 'cagr',
]);

const ROW_HEIGHT = 48;

function PercentileCell({ pct }: { pct: number | undefined }) {
  if (pct === undefined) return <span className="text-muted/40 text-xs">—</span>;
  const color =
    pct >= 75 ? 'bg-positive/20 text-positive' :
    pct >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
    pct >= 25 ? 'bg-orange-500/20 text-orange-400' :
                'bg-negative/20 text-negative';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold num ${color}`}
      title={`${pct}th percentile in category (3Y returns)`}>
      P{pct}
    </span>
  );
}

function ReturnCell({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="text-muted/40 text-xs">—</span>;
  const cls = value >= 0 ? 'text-positive' : 'text-negative';
  return <span className={`num text-xs ${cls}`}>{fmt(value)}</span>;
}

function StatusDot({ status }: { status: Fund['status'] }) {
  if (status === 'loading')
    return <span className="shrink-0 inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />;
  if (status === 'error')
    return <span className="shrink-0 inline-block w-1.5 h-1.5 rounded-full bg-negative" title="Failed to load" />;
  return null;
}

function PlanBadge({ plan }: { plan: Fund['planType'] }) {
  if (plan === 'Direct')
    return (
      <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-accent/20 text-accent leading-none">
        D
      </span>
    );
  if (plan === 'Regular')
    return (
      <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-400 leading-none">
        R
      </span>
    );
  return null;
}

interface FundTableProps {
  funds: Fund[];
  percentileMap: Map<number, number>;
  onRowVisible: (schemeCode: number) => void;
  onSortByReturns: () => void;
  onFundClick: (fund: Fund) => void;
}

export function FundTable({ funds, percentileMap, onRowVisible, onSortByReturns, onFundClick }: FundTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const handleSortingChange = useCallback((updater: Updater<SortingState>) => {
    setSorting(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const sortingByReturns = next.some(s => RETURNS_COLUMNS.has(s.id));
      if (sortingByReturns) onSortByReturns();
      return next;
    });
  }, [onSortByReturns]);

  const columns = useMemo<ColumnDef<Fund>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        size: 52,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted/50 num text-xs">{row.index + 1}</span>
        ),
      },
      {
        accessorKey: 'schemeName',
        header: 'Fund Name',
        size: 340,
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-0 w-full">
            <StatusDot status={row.original.status} />
            <div className="min-w-0 flex-1">
              <button
                onClick={() => onFundClick(row.original)}
                className="text-xs text-gray-100 truncate leading-snug hover:text-accent transition-colors text-left w-full block"
                title={row.original.schemeName}
              >
                {row.original.schemeName}
              </button>
              {row.original.fundHouse && (
                <p className="text-[10px] text-muted truncate">{row.original.fundHouse}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'planType',
        header: 'Plan',
        size: 56,
        enableSorting: true,
        cell: ({ getValue }) => <PlanBadge plan={getValue() as Fund['planType']} />,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        size: 220,
        enableSorting: true,
        cell: ({ getValue }) => {
          const v = getValue() as string | undefined;
          return v ? (
            <span className="text-[11px] text-gray-300 truncate block w-full" title={v}>{v}</span>
          ) : (
            <span className="text-muted/40 text-xs">—</span>
          );
        },
      },
      {
        accessorKey: 'currentNAV',
        header: 'NAV',
        size: 110,
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="num text-xs text-gray-200">{fmtNav(getValue() as number | undefined)}</span>
        ),
      },
      {
        id: 'sixMonth',
        header: '6M',
        size: 78,
        enableSorting: true,
        accessorFn: row => row.returns?.sixMonth,
        sortUndefined: 'last',
        cell: ({ getValue }) => <ReturnCell value={getValue() as number | undefined} />,
      },
      {
        id: 'oneYear',
        header: '1Y',
        size: 78,
        enableSorting: true,
        accessorFn: row => row.returns?.oneYear,
        sortUndefined: 'last',
        cell: ({ getValue }) => <ReturnCell value={getValue() as number | undefined} />,
      },
      {
        id: 'threeYear',
        header: '3Y',
        size: 78,
        enableSorting: true,
        accessorFn: row => row.returns?.threeYear,
        sortUndefined: 'last',
        cell: ({ getValue }) => <ReturnCell value={getValue() as number | undefined} />,
      },
      {
        id: 'fiveYear',
        header: '5Y',
        size: 78,
        enableSorting: true,
        accessorFn: row => row.returns?.fiveYear,
        sortUndefined: 'last',
        cell: ({ getValue }) => <ReturnCell value={getValue() as number | undefined} />,
      },
      {
        id: 'sevenYear',
        header: '7Y',
        size: 78,
        enableSorting: true,
        accessorFn: row => row.returns?.sevenYear,
        sortUndefined: 'last',
        cell: ({ getValue }) => <ReturnCell value={getValue() as number | undefined} />,
      },
      {
        id: 'tenYear',
        header: '10Y',
        size: 78,
        enableSorting: true,
        accessorFn: row => row.returns?.tenYear,
        sortUndefined: 'last',
        cell: ({ getValue }) => <ReturnCell value={getValue() as number | undefined} />,
      },
      {
        accessorKey: 'xirr',
        header: 'XIRR (3Y)',
        size: 95,
        enableSorting: true,
        sortUndefined: 'last',
        cell: ({ getValue }) => <ReturnCell value={getValue() as number | undefined} />,
      },
      {
        accessorKey: 'cagr',
        header: 'CAGR (Incep.)',
        size: 110,
        enableSorting: true,
        sortUndefined: 'last',
        cell: ({ getValue }) => <ReturnCell value={getValue() as number | undefined} />,
      },
      {
        id: 'percentile',
        header: 'Pct (3Y)',
        size: 90,
        enableSorting: true,
        sortUndefined: 'last',
        accessorFn: row => percentileMap.get(row.schemeCode),
        cell: ({ getValue }) => <PercentileCell pct={getValue() as number | undefined} />,
      },
      {
        id: 'expenseRatio',
        header: 'Exp. Ratio',
        size: 90,
        enableSorting: false,
        cell: () => <span className="text-muted/30 num text-xs">—</span>,
      },
    ],
    [percentileMap],
  );

  const table = useReactTable({
    data: funds,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0;

  // Lazy-load data for visible rows
  useEffect(() => {
    virtualItems.forEach(vi => {
      const row = rows[vi.index];
      if (row?.original.status === 'idle') {
        onRowVisible(row.original.schemeCode);
      }
    });
  }, [virtualItems, rows, onRowVisible]);

  const headers = table.getHeaderGroups()[0].headers;

  if (funds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
        <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">No funds match your filters</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto"
    >
      <table
        className="border-collapse"
        style={{ minWidth: 1420, width: '100%', tableLayout: 'fixed' }}
      >
        {/* Column width declarations */}
        <colgroup>
          {headers.map(h => (
            <col key={h.id} style={{ width: h.getSize() }} />
          ))}
        </colgroup>

        {/* Sticky header */}
        <thead className="sticky top-0 z-10 bg-surface-card">
          <tr>
            {headers.map(header => {
              const canSort = header.column.getCanSort();
              const sorted = header.column.getIsSorted();
              return (
                <th
                  key={header.id}
                  className={`px-3 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-wider border-b border-surface-border select-none whitespace-nowrap ${
                    canSort ? 'cursor-pointer hover:text-gray-300 transition-colors' : ''
                  }`}
                  onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                >
                  <span className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {canSort && (
                      <span className="text-muted/40 text-xs">
                        {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '⇅'}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {/* top spacer */}
          {paddingTop > 0 && (
            <tr><td style={{ height: paddingTop }} colSpan={columns.length} /></tr>
          )}

          {virtualItems.map(vi => {
            const row = rows[vi.index];
            return (
              <tr
                key={row.id}
                style={{ height: ROW_HEIGHT }}
                className="hover:bg-surface-hover transition-colors border-b border-surface-border/40"
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-3 overflow-hidden"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}

          {/* bottom spacer */}
          {paddingBottom > 0 && (
            <tr><td style={{ height: paddingBottom }} colSpan={columns.length} /></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
