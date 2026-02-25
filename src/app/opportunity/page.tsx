export default function OpportunityPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-3xl border border-[#E5E7EB] bg-[#FDFBF1] px-8 py-10 text-center shadow-none">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#3C2A6A]">
          Opportunity intelligence
        </p>
        <p className="mt-4 font-serif text-lg font-semibold text-[#3C2A6A]">
          The brain is still getting smarter
        </p>
        <p className="mt-3 text-xs text-slate-600 animate-pulse">
          We&apos;re training this module on live hiring data. Check back soon
          to see curated role maps and company-specific insights.
        </p>
      </div>
    </div>
  );
}

