# Cloudflare Pages Status Badge

A simple [Cloudflare Worker](https://developers.cloudflare.com/workers/) that exposes the latest [Cloudflare Pages](https://developers.cloudflare.com/pages/) deployment status as a [Shields.io badge](https://shields.io/endpoint).

Use this to show the deploy status of your Cloudflare Pages project right in your GitHub README.

## Features
*	✅ Shows real deployment status: passing, building, failing, canceled, or fallback active.
*	✅ Supports filtering by branch (main, feature branch, etc).
*	✅ Optional environment label (production vs preview).
*	✅ Returns proper [Shields endpoint JSON schema](https://shields.io/endpoint).
*	✅ Deployable in minutes with Wrangler v3.


## Example Badges

```
![Cloudflare Pages](https://img.shields.io/endpoint?url=https://<YOUR_SUBDOMAIN>.workers.dev/?projectName=<YOUR_PROJECT>)

![Pages (env)](https://img.shields.io/endpoint?url=https://<YOUR_SUBDOMAIN>.workers.dev/?projectName=<YOUR_PROJECT>&showEnv=true)

![Pages (main)](https://img.shields.io/endpoint?url=https://<YOUR_SUBDOMAIN>.workers.dev/?projectName=<YOUR_PROJECT>&branch=main&showEnv=true)
```

![Cloudflare Pages](https://img.shields.io/endpoint?url=https://cloudflare-pages-status-badge.sunpech.workers.dev/?projectName=sunpech)

![Pages (env)](https://img.shields.io/endpoint?url=https://cloudflare-pages-status-badge.sunpech.workers.dev/?projectName=sunpech&showEnv=true)

![Pages (main)](https://img.shields.io/endpoint?url=https://cloudflare-pages-status-badge.sunpech.workers.dev/?projectName=sunpech&branch=main&showEnv=true)

## Deployment

### 1. Clone & install

```bash
git clone https://github.com/sunpech/cloudflare-pages-status-badge.git
cd cloudflare-pages-status-badge
npm install
```

### 2. Check Wrangler config

```toml
name = "cloudflare-pages-status-badge"
main = "src/worker.ts"
compatibility_date = "2025-10-03"
workers_dev = true

[observability]
enabled = true
```

You normally don’t need to edit this. Only change name if you want a different Worker name in your Cloudflare account.

### 3. Add secrets

```bash
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_API_TOKEN
```

* Account ID: find it in your Cloudflare dashboard → Workers & Pages.
* API token: create under My Profile → API Tokens with Pages:Read permissions for your account.

### 4. Deploy

```bash
npx wrangler deploy
```
This will give you a <subdomain>.workers.dev endpoint you can use in Shields badges.



## API Parameters

* **projectName** (required): the Pages project name.
* **branch** (optional): filter deployments to a specific branch.
* **showEnv=true** (optional): label includes environment (production/preview).

## Example Responses

### Successful deploy
```json
{
  "schemaVersion": 1,
  "label": "Cloudflare Pages",
  "message": "passing",
  "color": "green"
}
```

### No deployments yet
```json
{
  "schemaVersion": 1,
  "label": "Cloudflare Pages",
  "message": "active",
  "color": "green"
}
```

### Failed deploy
```json
{
  "schemaVersion": 1,
  "label": "Cloudflare Pages",
  "message": "failing",
  "color": "red"
}
```

## Development
Run locally with:
```bash
npm run dev
```
## Acknowledgements
This project was inspired by [aidenwallis/cloudflare-pages-badge](https://github.com/aidenwallis/cloudflare-pages-badge).

That repository no longer works with current versions of Wrangler and the Pages API, so Cloudflare Pages Status Badge was created as a modern, working alternative.

## License

This project is licensed under the [MIT License](LICENSE).

## Disclaimer

This project was created with the assistance of [ChatGPT](https://chat.openai.com).

While the code works with the current Cloudflare Pages API and Wrangler CLI, it is provided as-is, without warranty. Please review, test, and adapt it for your own use cases before deploying in production.