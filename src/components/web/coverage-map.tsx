import type { PublicCoverageSummary } from "@/lib/db/jobs";

export function CoverageMap({ coverage }: { coverage: PublicCoverageSummary }) {
  const hasProjects = coverage.mappedProjectCount > 0;

  return (
    <div className="relative min-h-[25rem] overflow-hidden rounded-[2rem] border border-[#d8d0bd] bg-[#dfe8dd] shadow-[0_18px_45px_rgba(39,55,45,0.12)]">
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.52)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.52)_1px,transparent_1px)] [background-size:3.6rem_3.6rem]" />
      <div className="absolute -left-16 top-12 h-64 w-[34rem] rotate-[-11deg] rounded-[48%] border-[38px] border-[#eef2ea]/90" />
      <div className="absolute -right-24 bottom-[-7rem] h-72 w-[34rem] rotate-[19deg] rounded-[48%] border-[42px] border-[#d3e6df]/90" />
      <div className="absolute left-[43%] top-0 h-full w-1 -rotate-[34deg] bg-white/80" />
      <div className="absolute left-[63%] top-0 h-full w-1 rotate-[23deg] bg-white/70" />
      <span className="absolute left-[42%] top-[38%] text-sm font-semibold tracking-wide text-[#52635a]">MINNEAPOLIS</span>
      <span className="absolute left-[64%] top-[54%] text-sm font-semibold tracking-wide text-[#52635a]">ST. PAUL</span>
      <span className="absolute left-[21%] top-[64%] text-xs font-medium uppercase tracking-[0.16em] text-[#68786e]">West metro</span>
      <span className="absolute right-[10%] top-[26%] text-xs font-medium uppercase tracking-[0.16em] text-[#68786e]">North metro</span>
      <span className="absolute bottom-[10%] right-[17%] text-xs font-medium uppercase tracking-[0.16em] text-[#68786e]">South metro</span>

      {coverage.cells.map((cell, index) => (
        <div
          aria-label={`${cell.projectCount} completed project${cell.projectCount === 1 ? "" : "s"} in this area`}
          className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-[#fffdf8]/90 bg-[#b28b45] text-[0.65rem] font-bold text-white shadow-[0_5px_12px_rgba(75,54,20,0.28)]"
          key={`${cell.x}-${cell.y}-${index}`}
          style={{ left: `${cell.x}%`, top: `${cell.y}%`, height: `${30 + Math.min(cell.projectCount, 5) * 5}px`, width: `${30 + Math.min(cell.projectCount, 5) * 5}px` }}
        >
          {cell.projectCount > 1 ? cell.projectCount : ""}
        </div>
      ))}

      <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/80 bg-[#fffdf8]/90 p-4 backdrop-blur-sm sm:right-auto sm:max-w-xs">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9e7b39]">Twin Cities coverage</p>
        <p className="mt-2 text-sm leading-6 text-[#4f5d55]">
          {hasProjects ? "Each marker represents a multi-mile area, never an individual home or address." : "Project coverage will appear here as we add completed work."}
        </p>
      </div>
    </div>
  );
}
