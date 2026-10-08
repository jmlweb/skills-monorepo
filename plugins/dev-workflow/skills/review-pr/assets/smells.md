# Code smell baseline

Fowler's smells, each as what it is → how to fix. Apply to the changed code.

Rules:
- Every smell is a judgement call: report it only when it hurts readability or change cost here.
- Documented repo standards (AGENTS.md, CLAUDE.md, lint config) override this list.
- Skip what tooling already enforces (linters, formatters, type checker).

- **Mysterious Name**: a name that hides intent → rename to say what it is or does.
- **Duplicated Code**: the same logic in several places → extract a function or share a module.
- **Feature Envy**: a function uses another module's data more than its own → move it next to that data.
- **Data Clumps**: the same group of values travels together → introduce a type or object for the group.
- **Primitive Obsession**: raw strings or numbers stand in for domain concepts → introduce a value type or const map.
- **Repeated Switches**: the same switch or if-chain on one discriminator recurs → centralize in one lookup or polymorphic dispatch.
- **Shotgun Surgery**: one change forces small edits across many files → consolidate the scattered logic into one module.
- **Divergent Change**: one module changes for several unrelated reasons → split it by reason for change.
- **Speculative Generality**: hooks, parameters or abstractions for needs that do not exist → remove them until needed.
- **Message Chains**: `a.b().c().d()` reaches through several objects → hide the chain behind one method on the first object.
- **Middle Man**: a module only forwards calls → remove it and call the target directly.
- **Refused Bequest**: a subtype ignores or overrides away what it inherits → favor composition or narrow the base.
