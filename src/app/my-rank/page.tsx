import MyRankView from "@/components/MyRankView";

export const metadata = { title: "My Rank — MarkOnTop" };

export default function MyRankPage() {
  return (
    <div className="pt-6 sm:pt-8">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-black tracking-[-0.02em] text-paper sm:text-[36px]">My Rank</h1>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-paper/40">
          Your exact position on every board. Plain facts, no celebration.
        </p>
      </header>
      <MyRankView />
    </div>
  );
}
