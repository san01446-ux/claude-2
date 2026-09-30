# PixAI image workflow

When the user requests image assets, use PixAI automatically. The user authorizes API calls through the configured PixAI credential proxy; do not ask again simply because the MCP connector is absent.

- Prefer the `pixai_generate_image` and `pixai_get_task` MCP tools when available.
- If MCP tools are unavailable, call the PixAI REST API at `https://api.pixai.art` using curl through the cloud environment proxy. Read `pixai.mjs` for the request schema. The proxy injects authentication; a missing `PIXAI_API_KEY` variable is normal in this environment. Node callers must use `NODE_USE_ENV_PROXY=1`.
- Never read encrypted key files, print credentials, store keys in code, or commit secrets. Do not send Authorization headers to image download hosts.
- Reuse completed tasks and existing images before generating replacements. Poll existing tasks rather than resubmitting creation requests after a timeout.
- Download results from the returned media URL. Known result hosts are `images-ng.pixai.art` and `d2doj8oszwtcqy.cloudfront.net`. Save requested assets into the project and show previews.
- Respect the user's requested quantity and approval stages. For the current game, preview one title background and one hero portrait first; generate remaining assets only after style approval. Do not purchase credits or initiate payments.
- If authentication fails (401) or a download is blocked (403), report the exact failing host and stop repeated retries. Ask for a credential or network setting correction, never ask the user to paste a key in chat.

This workflow applies to user-requested image work; it does not schedule background generation.
