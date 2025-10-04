export interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;   // e.g. "abc123"
  CLOUDFLARE_API_TOKEN: string;    // API token with Pages:Read on the account
}

/**
 * Query:
 *   ?projectName=<required>
 *   [&branch=main]        -> filters deployments to this branch (preview or prod)
 *   [&showEnv=true]       -> label becomes "Pages (prod)" or "Pages (preview)"
 *
 * Returns Shields.io endpoint JSON.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const project = url.searchParams.get("projectName");
    const branch = url.searchParams.get("branch") || undefined;
    const showEnv = (url.searchParams.get("showEnv") || "").toLowerCase() === "true";

    if (!project) {
      return json(badge({ label: "Cloudflare Pages", message: "missing projectName", color: "inactive" }), 400);
    }

    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const headers = { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` };

    // 1) Ask for latest deployments (newest first)
    const depUrl = new URL(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${encodeURIComponent(project)}/deployments`);
    depUrl.searchParams.set("per_page", "10"); // grab a few so we can filter by branch if requested

    let deployments: any[] = [];
    try {
      const r = await fetch(depUrl, { headers });
      if (r.status === 404) {
        return json(badge({ label: "Cloudflare Pages", message: "project not found", color: "lightgrey" }), 404);
      }
      if (!r.ok) throw new Error(`deployments api ${r.status}`);
      const data = await r.json();
      deployments = Array.isArray(data?.result) ? data.result : [];
    } catch (e) {
      // On API error, don’t guess—surface the issue
      return json(badge({ label: "Cloudflare Pages", message: "api error", color: "critical" }), 502);
    }

    // Optional: filter by branch if provided
    if (branch) {
      deployments = deployments.filter(d =>
        (d?.deployment_trigger?.metadata?.branch || "").toLowerCase() === branch.toLowerCase()
      );
    }

    const latest = deployments[0];

    if (latest) {
      const envName: string = latest?.environment || inferEnvFromStage(latest) || "preview";
      const raw =
        latest?.latest_stage?.status ??
        latest?.deployment_trigger?.metadata?.status ??
        latest?.status ??
        "unknown";
      const mapped = mapStatus(String(raw));
      const label = showEnv ? `Pages (${envName})` : "Cloudflare Pages";

      return json(badge({
        label,
        message: mapped.message,
        color: mapped.color,
        cacheSeconds: 60
      }));
    }

    // 2) Fallback: no deployments -> check project status (usually "active")
    try {
      const projRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${encodeURIComponent(project)}`,
        { headers }
      );
      if (projRes.status === 404) {
        return json(badge({ label: "Cloudflare Pages", message: "project not found", color: "lightgrey" }), 404);
      }
      if (!projRes.ok) throw new Error(`project api ${projRes.status}`);
      const proj = await projRes.json();
      const projectStatus = String(proj?.result?.source || proj?.result?.status || "active"); // status is typically "active"
      const { message, color } = mapProjectStatus(projectStatus);
      return json(badge({ label: "Cloudflare Pages", message, color, cacheSeconds: 300 }));
    } catch {
      return json(badge({ label: "Cloudflare Pages", message: "api error", color: "critical" }), 502);
    }
  }
};

// ---------- helpers ----------

function inferEnvFromStage(d: any): string | undefined {
  // Some payloads include environment; otherwise infer from stage or urls
  const env = d?.environment;
  if (env) return env;
  const stageName = d?.latest_stage?.name || "";
  if (stageName.toLowerCase().includes("preview")) return "preview";
  if (stageName.toLowerCase().includes("production") || stageName.toLowerCase().includes("prod")) return "production";
  return undefined;
}

function mapStatus(s: string): { message: string; color: string } {
  const t = s.toLowerCase();
  if (["success", "succeeded", "completed"].includes(t)) return { message: "passing", color: "green" };
  if (["building", "in_progress", "queued", "pending"].includes(t)) return { message: "building", color: "blue" };
  if (["canceled", "cancelled"].includes(t)) return { message: "canceled", color: "lightgrey" };
  if (["failed", "failure", "error", "errored"].includes(t)) return { message: "failing", color: "red" };
  return { message: t || "unknown", color: "yellow" };
}

function mapProjectStatus(s: string): { message: string; color: string } {
  const t = s.toLowerCase();
  // Pages "project" commonly returns "active" to indicate it's enabled
  if (t === "active") return { message: "active", color: "green" };
  if (["disabled", "paused", "suspended"].includes(t)) return { message: t, color: "lightgrey" };
  return { message: t || "unknown", color: "yellow" };
}

function badge({
  label,
  message,
  color,
  cacheSeconds
}: { label: string; message: string; color: string; cacheSeconds?: number }) {
  const body: Record<string, any> = {
    schemaVersion: 1,
    label,
    message,
    color
  };
  if (typeof cacheSeconds === "number") body.cacheSeconds = cacheSeconds;
  return body;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}