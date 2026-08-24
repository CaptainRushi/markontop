import CategoryPillNav from "@/components/CategoryPillNav";
import RealtimeBoard from "@/components/RealtimeBoard";
import BidTicker from "@/components/BidTicker";

export default function HomePage() {
  return (
    <div>
      {/* Ticker — full-bleed, sits under header */}
      <div className="-mx-4 sm:-mx-6">
        <BidTicker />
      </div>

      <div className="pt-6 sm:pt-8">
        <CategoryPillNav />
        <div className="mt-4 sm:mt-6">
          <RealtimeBoard />
        </div>
      </div>
    </div>
  );
}
