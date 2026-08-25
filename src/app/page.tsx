import CategoryPillNav from "@/components/CategoryPillNav";
import RealtimeBoard from "@/components/RealtimeBoard";
import BidTicker from "@/components/BidTicker";

export default function HomePage() {
  return (
    <div>
      <div className="-mx-4 sm:-mx-6">
        <BidTicker />
      </div>

      <div className="pt-5 sm:pt-7">
        <p className="flex items-center gap-2 font-data text-[10px] font-bold uppercase tracking-[0.16em] text-flag sm:text-[11px]">
          <span className="inline-block h-1.5 w-1.5 animate-pulse bg-flag" aria-hidden />
          LIVE - GLOBAL TOP 3
        </p>
      </div>

      <div className="mt-3">
        <RealtimeBoard />
      </div>

      <div className="mt-6 border-t border-white/[0.06] pt-4">
        <CategoryPillNav />
      </div>
    </div>
  );
}
