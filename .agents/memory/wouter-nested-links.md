---
name: Wouter nested links
description: How to handle clickable cards with inner links in wouter — avoids nested <a> errors
---

When building clickable card components that contain inner navigation links (e.g. project name inside a proposal card), do NOT wrap the outer card in a `<Link>`. Instead:

1. Make the outer card a `<div>` with `onClick={() => navigate(href)}` using `const [, navigate] = useLocation()` from wouter.
2. Set `role="button"` and `tabIndex={0}` for accessibility.
3. Keep inner navigation as `<button>` with `onClick={e => { e.stopPropagation(); navigate(href); }}`.

**Why:** wouter's `<Link>` renders as a native `<a>` tag. Nesting `<a>` inside `<a>` is invalid HTML, causes a React hydration error, and triggers console warnings about "In HTML, <a> cannot be a descendant of <a>."

**How to apply:** Any time a card/row/tile links to one page but contains a sub-element linking to another page.
