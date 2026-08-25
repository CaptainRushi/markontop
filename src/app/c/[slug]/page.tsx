import { notFound } from "next/navigation";
import CategoryPillNav from "@/components/CategoryPillNav";
import RealtimeBoard from "@/components/RealtimeBoard";
import BidTicker from "@/components/BidTicker";
import { categoryBySlug } from "@/lib/categories";

export const dynamic = "force-static";

export async function generateStaticParams() {
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
    <div>
      <div className="-mx-4 sm:-mx-6">
        <BidTicker />
      </div>

      <div className="pt-5 sm:pt-7">
        <p className="font-data text-[10px] font-bold uppercase tracking-[0.16em] text-paper/30 sm:text-[11px]">
          {category.name.toUpperCase()} - TOP 3
        </p>
      </div>

      <div className="mt-3">
        <RealtimeBoard categoryId={category.id} />
      </div>

      <div className="mt-6 border-t border-white/[0.06] pt-4">
        <CategoryPillNav activeSlug={category.slug} />
      </div>
    </div>
  );
}
