export interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;   // e.g. "abc123..."
  CLOUDFLARE_API_TOKEN: string;    // API token with Pages:Read on the account
}

/**
 * GET /?projectName=<pages-project>
 * Optional: &branch=main  (defaults to "production"/latest)
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const project = url.searchParams.get("projectName");
    if (!project) {
      return json({ label: "Cloudflare Pages", message: "missing projectName", color: "inactive" }, 400);
    }

    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${encodeURIComponent(project)}`;

    // Get the most recent deployments (first page, latest first)
    const res = await fetch(`${apiBase}/deployments?per_page=1`, {
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` }
    });

    if (!res.ok) {
      return json({
        label: "Cloudflare Pages",
        message: `api ${res.status}`,
        color: "critical"
      }, 502);
    }

    const data = await res.json() as any;
    const latest = data?.result?.[0];

    if (!latest) {
      return json({ label: "Cloudflare Pages", message: "no deployments", color: "inactive" });
    }

    const status: string = latest?.deployment_trigger?.metadata?.status ?? latest?.latest_stage?.status ?? latest?.status ?? "unknown";

    // Map CF statuses to badge colors/messages
    const { message, color } = mapStatus(status);

    // Shields endpoint JSON format
    return json({
      schemaVersion: 1,
      label: "Cloudflare Pages",
      message,
      color,
      // cache for 60s to avoid hammering the API
      cacheSeconds: 60
    });
  }
};

function mapStatus(s: string): { message: string; color: string } {
  const t = s.toLowerCase();
  if (["success", "succeeded", "completed"].includes(t)) return { message: "passing", color: "green" };
  if (["building", "queued", "running", "in_progress"].includes(t)) return { message: "building", color: "blue" };
  if (["canceled", "cancelled"].includes(t)) return { message: "canceled", color: "lightgrey" };
  if (["failed", "failure", "errored", "error"].includes(t)) return { message: "failing", color: "red" };
  return { message: t || "unknown", color: "yellow" };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}