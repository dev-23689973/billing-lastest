<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Responsive UI scale

- Use tokens from `lib/ui/responsiveScale.ts` for typography, icons, buttons, badges, padding, and table density (`rsTextBody`, `rsIconSm`, `uiBadgeClass`, `rsPadCard`, etc.).
- Root `html` font size is fluid (`--font-size` in `globals.css`); prefer `rem`/scale tokens over fixed pixel-only sizes.
- Optional CSS utilities: `ui-text-body`, `ui-badge`, `ui-btn-density` in `app/responsive-ui.css`.
- When editing a screen, replace ad-hoc `text-[11px]` / `h-8` pairs with the nearest `rs*` token instead of inventing new breakpoints.
