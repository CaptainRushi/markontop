export const CATEGORIES = [
  { id: "saas-tools", name: "SaaS Tools", slug: "saas-tools" },
  { id: "ai-tools-agents", name: "AI Tools & Agents", slug: "ai-tools-agents" },
  { id: "dev-tools-apis", name: "Dev Tools & APIs", slug: "dev-tools-apis" },
  { id: "marketing-growth", name: "Marketing & Growth Agencies", slug: "marketing-growth" },
  { id: "ecommerce-d2c", name: "E-commerce/D2C Brands", slug: "ecommerce-d2c" },
  { id: "newsletters-content", name: "Newsletters & Content Creators", slug: "newsletters-content" },
  { id: "design-creative", name: "Design & Creative Tools", slug: "design-creative" },
  { id: "mobile-apps", name: "Mobile Apps", slug: "mobile-apps" },
  { id: "personal-brand", name: "Personal Brand/Portfolio", slug: "personal-brand" },
  { id: "other", name: "Other", slug: "other" },
] as const;

export function categoryById(id: string | null | undefined) {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

export function categoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export const ENTRY_FLOOR = 1.0;
export const TAKEOVER_INCREMENT = 1.0;
