import MyRankView from "@/components/MyRankView";

export const metadata = { title: "My Rank — MarkOnTop" };

export default function MyRankPage() {
  return (
    <div className="pt-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold sm:text-3xl">My Rank</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
          Your exact position on every board, and one-click bid raises.
        </p>
      </header>
      <MyRankView />
    </div>
  );
}
