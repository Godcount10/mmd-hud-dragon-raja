---
version: 1
slug: "src-hud-themes-dragon-raja-dragonrajahud-vue"
primary_target: "src/hud/themes/dragon-raja/DragonRajaHud.vue"
related_targets: ["src/hud/themes/dragon-raja/dragon-raja.css","src/hud/themes/dragon-raja/components/StorySurface.vue"]
---

## Scope and mode

Story status rail only; visitor mode is Operate with visual spectacle intentionally weighted above dense reading. The rail is a local extension of the approved `01 · 轨道档案` Story direction, not a new product identity.

## Job, audience, and proof

The user is already inside an MMD role-play scene and needs the right rail to make the active cast, live native snapshot, dossier, derived status, available actions, and forum entry feel like one memorable instrument. Proof is the unchanged Snapshot/Bridge data and the existing click, pager, forum, native-panel, and composer events continuing to work.

## Selected direction and memorable moment

Revision: the `01 · 轨道档案 (Orbit Ledger)` star-chart module has been removed at the user's direction. Keep the rail as an opaque dark surface with a restrained seeded ember flow, cast ledger, native snapshot, dossier, derived statuses, forum, and actions. Character switching is not duplicated inside the dossier; the dossier presents the character already selected through the existing top-level/cast controls.

## Visual and motion contract

- Use a continuous rail surface rather than nested floating cards. Keep cast ledger, native snapshot, dossier, status fields, options, and forum as engraved divisions in one instrument.
- Desktop keeps the rail at the right of the reading sheet with equal visual authority. The cast count, active character, connection/generation state, dossier fields, and derived statuses remain visibly addressable.
- Ambient motion remains a single authored Canvas ember field behind the rail. Motion must be scene driven with `requestAnimationFrame`, not a cheap CSS infinite loop; the field pauses when hidden and freezes for reduced-motion preferences.
- Character selection continues through existing top-level/cast controls; the dossier itself is a static readout with no duplicate pager. Status revision animates only the changed field with its existing short cue. Forum and native-panel controls retain their current semantic actions.
- Mobile is collapsed by default. The collapsed affordance shows the active character, cast count, and a live-state mark. Opening creates a covering overlay over Story without pushing or resizing the reading surface; closing restores the previous scroll position. Escape and the existing close affordance remain available.

## Scope, states, and boundaries

In scope: status rail layout, materials, typography treatment, color application, Canvas/WebGL/Three.js/GSAP presentation, desktop/mobile collapse and overlay states, loading/empty/error/changed states for rail data, and motion/reduced-motion behavior. Preserve Host, Bridge, Protocol, iframe, MessagePort, Snapshot ownership, all existing event handlers, and every data label. Welcome, Opening, Story prose, and Composer are untouched. No neon, glassmorphism, cyberpunk, generic chat bubbles, or stacked floating cards.

## Performance and accessibility

Prefer WebGL when available, with a Canvas 2D or static engraved poster fallback. Pause or throttle when hidden, cap particle/ring density, and avoid layout work inside animation frames. `prefers-reduced-motion` freezes the ambient field and keeps only immediate state-change feedback. Keep semantic buttons, focus order, keyboard activation, focus-visible treatment, contrast, and a clear mobile close target.

## Open decisions for implementation

The builder may tune ring count, contour density, particle budget, and exact easing after the first comp, but must keep the physical astrolabe/dragon-map metaphor, the overlay behavior, and the two-layer ambient motion contract. No implementation begins until this brief is confirmed.
