## Development



When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Context

At the start of every session, read the following Obsidian notes for this project:

- `~/obsidian-sofi/04_PROJECTS/funding-app/AI_CONTEXT.md` — main context, architecture decisions, and current state
- `~/obsidian-sofi/04_PROJECTS/funding-app/Cover Fees Feature.md` — fee calculation spec, formula, and implementation checklist
- `~/obsidian-sofi/04_PROJECTS/funding-app/Frontend Architecture.md` — component structure, data-* hooks, and form conventions
- `~/obsidian-sofi/04_PROJECTS/funding-app/Backend Architecture.md` — API routes, service layer, and Zod schemas
- `~/obsidian-sofi/04_PROJECTS/funding-app/Payment Integration.md` — Lemon Squeezy checkout and webhook spec
- `~/obsidian-sofi/04_PROJECTS/funding-app/Database Schema.md` — SQLite schema and migrations

For task-specific context, also read as needed:

- `~/obsidian-sofi/04_PROJECTS/funding-app/OBS WebSocket Feature.md`
- `~/obsidian-sofi/04_PROJECTS/funding-app/Donation Tiers Feature.md`
- `~/obsidian-sofi/04_PROJECTS/funding-app/Roadmap.md`

## Skills

You MUST ALWAYS use the following skills when implementing code, reviewing architecture, or writing documentation for this project:

- **`astro-framework`**: For everything related to Astro (components, routing, SSR, hydration, Content Layer, Server Islands, View Transitions).
- **`hono`**: For everything related to the backend API, routes, middleware, RPC, and Zod validation.
- **`workers-best-practices`**: For Cloudflare Workers specific implementations, bindings, observability, and platform APIs.
