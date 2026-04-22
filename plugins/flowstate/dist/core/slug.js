export function titleToSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .split(/\s+/)
        .slice(0, 5)
        .join("-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
