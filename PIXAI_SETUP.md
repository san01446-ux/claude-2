# PixAI for Claude Code Remote

Recommended for Claude Pro/Max: open your cloud environment editor, choose API credentials > Add credential, and set:
- Name: PixAI
- Credential type: Bearer
- Allowed websites: api.pixai.art
- Custom header name: Authorization
- Prefix: Bearer
- Value: your PixAI API key (paste it directly into the credential form).

Click Connect. Anthropic's agent proxy attaches the key to PixAI requests without exposing it to Claude, terminal commands, repository files, or environment variables. The API credential also allows access to its host without changing the environment's network policy. No PIXAI_API_KEY environment variable is required with this method.

Start a new Claude Code cloud session using a branch containing `.mcp.json` and `pixai.mjs`, or pull these files into your existing session and reload its MCP configuration if supported. A session can also call the documented PixAI REST endpoints directly through the agent proxy.

For local Claude Code or environments without the credential proxy, set PIXAI_API_KEY privately in the process environment. The server uses it as a Bearer header if provided. Never commit the key to GitHub.

Use pixai_generate_image to start one image (uses PixAI credits), then pixai_get_task to retrieve its status and image URLs. Poll no faster than every 1.5 seconds. Node.js 18+ is required; no npm dependencies.

Reference: https://code.claude.com/docs/en/cloud-environments#add-api-credentials
