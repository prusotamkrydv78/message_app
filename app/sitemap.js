export default async function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const base = siteUrl.replace(/\/$/, "");

  // Public, indexable routes only
  const routes = ["", "/login", "/register"]; 

  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${base}${route || "/"}`,
    lastModified,
    changeFrequency: "monthly",
    priority: route === "" ? 1.0 : 0.6,
  }));
}
