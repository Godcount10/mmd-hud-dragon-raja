---
version: 1
slug: "hud-themes-dragon-raja-components-storysurface-vue"
primary_target: "src/hud/themes/dragon-raja/components/StorySurface.vue"
related_targets: ["src/hud/themes/dragon-raja/DragonRajaHud.vue","src/hud/themes/dragon-raja/dragon-raja.css"]
---

## Scope and mode

Story only; visitor mode is Operate with long-form narrative reading as the primary task and character/status comparison as an equal second task.

## Audience, job, and proof

The product owner arrives inside an MMD role-play session to read a 1,000–3,000 Chinese-character reply, understand up to five active characters, then submit the next action. Proof is the real Snapshot, assistant-derived dossier/status markers, and working send/edit/rollback/native-panel actions.

## Chosen direction and memorable moment

`A · 场次脊线`, the approved comp-led direction. Treat Story as a real-world stage-manager desk: an opaque warm paper reading sheet, a dark cast ledger, brass cue marks, ember-red scene spine, and cobalt player-action rule. The memorable moment is a status change returning to the exact narrative passage where its cue occurred.

Approved comps: `.impeccable/mocks/story/story-a-desktop.png` and `.impeccable/mocks/story/story-a-mobile.png`.

## Structure and interaction

Desktop keeps a narrow low-frequency tool rail, a wide continuous reading sheet, and an equal-weight dark status rail with a five-person cast ledger and active dossier. Mobile keeps the tool strip, cast ledger, active dossier, reading sheet, and composer in one non-overlapping vertical path; status is before the long-form text rather than hidden. Messages remain semantic articles with stream, edit, rollback, and draft actions. Character selection changes the active dossier without leaving Story.

## Component and material inventory

- Paper reading sheet: semantic HTML/CSS, opaque warm paper with a restrained ruled grain.
- Scene spine and cue rules: CSS geometry, ember red for scene boundaries and cobalt for player actions.
- Cast ledger: semantic buttons and CSS blocks, one color bar per character, active row with brass edge.
- Dossier fields: semantic definition list and existing portrait asset when present; no fabricated portrait.
- Composer: existing textarea/model/send controls restyled as a single paper instrument; existing native action remains the only submission path.
- Low-frequency navigation: existing icon buttons and labels, restyled as a compact tool rail.

## Constraints and unresolved decisions

Preserve Host, Bridge, Protocol, iframe connection, all existing interaction events, and Welcome/Opening. Do not introduce futuristic technology, cyberpunk HUD language, neon, glassmorphism, holograms, generic chat bubbles, or floating card stacks. Keep text readable at long-form density, preserve reduced-motion behavior, and keep desktop/mobile equally complete.
