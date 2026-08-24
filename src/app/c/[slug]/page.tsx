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

      <div className="pt-6 sm:pt-8">
        <CategoryPillNav activeSlug={category.slug} />
        <div className="mt-4 sm:mt-6">
          <RealtimeBoard categoryId={category.id} />
        </div>
      </div>
    </div>
  );
}
