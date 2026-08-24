import CategorySwitcher from "@/components/CategorySwitcher";
import RealtimeBoard from "@/components/RealtimeBoard";

export default function HomePage() {
  return (
    <div className="pt-6">
      <section className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Pay to place. <span className="gold-text">Stay on top.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-400">
          Deterministic paid placement: the highest bid holds the rank until outbid.
          Entry starts at <strong className="text-white">$1.00</strong>. Top 3 in every
          category get the podium.
        </p>
      </section>

      <CategorySwitcher />
      <div className="mt-6">
        <RealtimeBoard />
      </div>
    </div>
  );
}
