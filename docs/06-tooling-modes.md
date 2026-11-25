# Tooling: Architect and Code Modes (Cline / Roo Code / Kilo)

The request was to "find extensions like Cline or Roo Code" so the platform can be worked on directly in **Architect** or **Code** mode, and to isolate the polar parser and OSC bridge as focused modules.

This repository already contains the project-level configuration for that workflow:

| Tool | File | Purpose |
|---|---|---|
| **Roo Code** | `.roomodes` | Two custom modes: `aura-architect`, `aura-engineer` |
| **Cline** | `.clinerules/00-aura.md` | Project invariants and verification commands |
| **Kilo Code** | `AGENTS.md` + this document | Working agreement and mode prompts |
| **Any agent** | `docs/` | Normative architecture, acoustics, schemas, roadmap |

The current session is already running in **Kilo Code**, which belongs to the same lineage as Cline and Roo Code (Cline → Roo Code → Kilo Code). You do not need to install anything to keep working here. Install Cline or Roo Code only if you want a second, independent agent surface or their specific mode UIs.

---

## 1. The three tools

### Cline

- VS Code extension.
- Two primary behaviours: **Plan** and **Act** (the names have varied across versions).
- Project rules: `.clinerules` file or `.clinerules/` directory.
- Strong MCP integration, terminal/file editing, human approval.
- Good for: a single careful pair-programmer, explicit plan → act transitions.

### Roo Code

- VS Code extension, a fork in the Cline lineage.
- First-class **custom modes**: Architect, Code, Debug, Ask, Orchestrator, plus user-defined modes.
- Project rules: `.roo/rules/`, `.roo/rules-{mode}/`, and `.roomodes`.
- Good for: switching between design and implementation with different tool permissions and prompts.

### Kilo Code

- The environment used here; a later branch of the same lineage.
- Config: `kilo.json` / `.kilo/`, agents in `.kilo/agent/*.md`, commands in `.kilo/command/*.md`, skills in `.kilo/skill/`.
- Supports primary agents, subagents, custom modes, permissions, MCP and Agent Manager.
- Good for: orchestrating multiple workers, isolated worktrees, review passes.

They can be installed side by side in VS Code. They do not share chat history, but they can share the repository and the rule files.

---

## 2. Install side by side (optional)

1. Open VS Code → Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`).
2. Search for **Cline** and install the extension published by Cline.
3. Search for **Roo Code** and install the extension published by Roo Veterinary.
4. Reload the window.
5. Open this repository root or `spatial-aura-engine/` as the workspace.
6. For Cline: it reads `.clinerules/` from the workspace root. For Roo: it reads `.roomodes`.
7. Select the mode from the extension’s mode selector.

Use separate VS Code profiles if you want separate API keys, models and approval policies. Never put API keys in the repository.

> The exact marketplace names and UI labels change. Install by publisher and verify the extension ID in the Extensions panel before granting terminal permissions.

---

## 3. Provided modes

### 3.1 Roo Code `.roomodes`

The file contains:

```json
{
  "customModes": [
    {
      "slug": "aura-architect",
      "name": "AURA Architect",
      "roleDefinition": "Principal architect for AURA-SPEC...",
      "whenToUse": "System design, acoustic model decisions, schema evolution...",
      "groups": ["read", "edit", "command"],
      "customInstructions": "World is right-handed, metres, Y up..."
    },
    {
      "slug": "aura-engineer",
      "name": "AURA Engineer",
      "roleDefinition": "Implementation engineer...",
      "whenToUse": "Implement or refactor code, add schemas, write tests...",
      "groups": ["read", "edit", "command"],
      "customInstructions": "Keep acoustic math in core-acoustics..."
    }
  ]
}
```

If your Roo version uses a different schema, import the same role definitions through the **Modes** UI and keep `.roomodes` as the source of truth.

### 3.2 Cline `.clinerules/00-aura.md`

The rules enforce:

- scope limited to `spatial-aura-engine/`,
- coordinate/unit invariants,
- dependency-free core,
- provenance for manufacturer data,
- no Node built-ins in browser code,
- typecheck/test commands,
- no commits without explicit request.

Cline reads this before planning or acting. Keep it short and normative; put long explanations in `docs/`.

### 3.3 Kilo Code agents

Kilo supports custom agents as Markdown files with YAML frontmatter in `.kilo/agent/` at the workspace root (not inside `spatial-aura-engine/` unless that folder is opened as its own workspace). Intended definitions:

```md
---
description: AURA-SPEC principal architect for acoustic architecture, spatial systems, data contracts and milestone plans
mode: primary
color: "#8ad7c1"
steps: 40
---
You are the Principal Systems Architect for AURA-SPEC...
```

```md
---
description: AURA-SPEC implementation engineer for TypeScript core, polar pipeline, OSC bridge and Three.js studio
mode: primary
color: "#ffd166"
steps: 60
---
You implement AURA-SPEC inside spatial-aura-engine/...
```

If your Kilo build rejects a frontmatter field, remove optional fields (`color`, `steps`) and keep `description` + `mode`. The full prompts are reproducible from `.roomodes` and `AGENTS.md`.

---

## 4. Recommended workflow

### Architect pass

1. Select `aura-architect` (Roo) or the Kilo Architect agent.
2. Ask for a decision, not code:
   - "Design the M1 CAD import boundary. List modules, data contracts, failure modes and acceptance tests."
3. Require:
   - units and coordinate conventions,
   - explicit assumptions,
   - a Mermaid diagram,
   - a risk table,
   - the smallest next verifiable step.
4. Save the decision as `docs/adr/NNNN-title.md` (create `docs/adr/` when the first decision is accepted).
5. Do not let Architect mode edit production code.

### Code pass

1. Switch to `aura-engineer` / Kilo Code.
2. Give a bounded task with file paths and acceptance tests.
3. Require the agent to run:
   ```bash
   npx tsc -p packages/core-acoustics/tsconfig.json --noEmit
   npx vitest run --config vitest.config.ts
   ```
4. Review the diff before accepting. The agent must not commit.
5. Run a separate review pass (`/review uncommitted` in Kilo) for non-trivial changes.

### Review pass

- Check acoustic formulas against `docs/01-acoustics.md`.
- Check units and coordinate order.
- Check browser/Node boundaries.
- Check provenance and illustrative-data warnings.
- Check tests actually assert the physical behaviour, not just snapshot output.

---

## 5. Module isolation prompts

The two modules requested as isolated workstreams are already separated by package boundaries. Use these prompts to keep an agent focused.

### 5.1 Polar parser module

**Scope:** `packages/core-acoustics/src/polar/**`, tests in `packages/core-acoustics/tests/polar-parser.spec.ts`, and the balloon scene in `apps/studio-web/src/scene/PolarBalloon.tsx`.

Prompt:

> Implement the next polar-parser increment. Read `docs/03-polar-parser.md` and `packages/core-acoustics/src/types/speaker.ts` first. Do not change the coordinate convention or the `PolarGrid` layout. Add support for [format/layout]. Preserve on-axis normalisation and provenance. Add tests with a golden fixture and a seam check at ±180°. Run `npx tsc -p packages/core-acoustics/tsconfig.json --noEmit` and `npx vitest run --config vitest.config.ts packages/core-acoustics`. Do not edit the OSC bridge or the catalog seed data.

Acceptance:

- Grid dimensions and band count are validated.
- Values are finite and normalised.
- A balloon preview uses the same atlas as the CPU sampler.
- Warnings are surfaced, not swallowed.

### 5.2 OSC bridge module

**Scope:** `packages/osc-bridge/**`, `examples/supercollider/`, `examples/max/`, `examples/clap/`.

Prompt:

> Implement the next OSC bridge increment. Read `docs/04-osc-bridge.md` and `packages/osc-bridge/src/address-space.ts` first. Keep the OSC 1.0 codec dependency-free and the address space backward compatible within `/aura/v1`. Add [target/feature]. Add round-trip tests and a diff-publisher test. Do not change acoustic math or the Three.js scene. Run `npx tsc -p packages/osc-bridge/tsconfig.json --noEmit` and `npx vitest run --config vitest.config.ts packages/osc-bridge`.

Acceptance:

- Messages round-trip byte-for-byte through `encodeMessage`/`decodePacket`.
- Unchanged fields are not published.
- Timetags are explicit.
- The receiver example matches the generated address map.

---

## 6. Guardrails for agentic work

- **No silent data promotion.** An agent may not change `verification: "illustrative"` to `"manufacturer"` without a source file and checksum.
- **No hidden dependencies.** Adding a library requires a justification and a check that the browser/Node boundary is preserved.
- **No formula drift.** Shader and native code must consume derived data from the core, not reimplement a different SPL formula.
- **No unreviewed geometry edits.** Structural CAD changes need a human review and a snapshot.
- **No secrets.** API keys, Dante credentials and venue tokens stay out of the repo and out of OSC.
- **No commits** unless the user explicitly asks.

---

## 7. Why this division matters

The polar parser and the OSC bridge fail in different ways:

- A polar bug produces a **plausible but wrong** balloon: coverage looks fine, the physics is wrong, and nobody notices until commissioning.
- An OSC bug produces a **correct model that cannot perform**: wrong address, wrong rate, wrong clock, or a target that silently stops updating.

Keeping them in separate packages with separate acceptance tests prevents a UI refactor from breaking the acoustic contract, and prevents an acoustic experiment from destabilising the show-control path.
