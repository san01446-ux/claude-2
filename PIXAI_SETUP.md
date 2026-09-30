# PixAI for Claude Code Remote

1. In Claude Code's cloud environment settings, add the secret environment variable `PIXAI_API_KEY` with your PixAI API key. Never put the key in GitHub files, commits, or chat.
2. Allow network access to `api.pixai.art`. Allow the output image hostname only if downloading images requires it.
3. Start a new session using a branch containing `.mcp.json` and `pixai.mjs`. Approve the project MCP server if prompted.
4. Use `pixai_generate_image` to start one image (uses PixAI credits), then `pixai_get_task` to retrieve its status and image URLs. Poll no faster than every 1.5 seconds.

Requires Node.js 18 or newer. No npm dependencies. For an existing session that cannot load MCP, the same REST endpoints can be called directly from its terminal using `PIXAI_API_KEY`: POST https://api.pixai.art/v2/image/create and GET https://api.pixai.art/v1/task/{taskId}. Keep API keys out of command output.

The Windows encrypted key file is for the local PC only and cannot be read from the cloud environment. These source files contain no API keys.
