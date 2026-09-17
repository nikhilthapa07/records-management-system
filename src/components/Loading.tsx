const ROWS = 8

export function Loading() {
  return (
    <div className="p-4" role="status" aria-label="Loading employee records">
      <div className="space-y-3">
        {Array.from({ length: ROWS }, (_, index) => (
          <div
            key={index}
            className="flex animate-pulse items-center gap-4 rounded-md border border-slate-200 bg-white p-3"
          >
            <div className="h-9 w-9 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-slate-200" />
              <div className="h-3 w-2/3 rounded bg-slate-200" />
            </div>
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="h-3 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading employee records</span>
    </div>
  )
}