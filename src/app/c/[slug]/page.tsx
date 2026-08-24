import { notFound } from "next/navigation";
import CategorySwitcher from "@/components/CategorySwitcher";
import RealtimeBoard from "@/components/RealtimeBoard";
import { categoryBySlug } from "@/lib/categories";

export const dynamic = "force-static";

export async function generateStaticParams() {
  // All category boards are pre-renderable; data is fetched client-side live.
  const slugs = [
    "saas-tools",
    "ai-tools-agents",
    "dev-tools-apis",
    "marketing-growth",
    "ecommerce-d2c",
    "newsletters-content",
    "design-creative",
    "mobile-apps",
    "personal-brand",
    "other",
  ];
  return slugs.map((slug) => ({ slug }));
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();

  return (
    <div className="pt-6">
      <header className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Category board</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{category.name}</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-neutral-400">
          Highest paid placement holds rank #1. Outbid by $1.00+ to claim a spot.
        </p>
      </header>

      <CategorySwitcher activeSlug={category.slug} />
      <div className="mt-6">
        <RealtimeBoard categoryId={category.id} />
      </div>
    </div>
  );
}
