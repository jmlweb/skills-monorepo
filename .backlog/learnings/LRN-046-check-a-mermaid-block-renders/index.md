---
id: LRN-046
title: Check a Mermaid block renders locally with mmdc and system Chrome
status: active
tags: [mermaid, dev-workflow, pr-writer, testing]
task: TSK-058
created: 2026-10-28
---

GitHub renders fenced `mermaid` blocks but gives no local check, and the terminal approve step shows raw source. To check a diagram renders without adding a dependency, use the globally installed mermaid-cli with the system Chrome:

```bash
echo '{"args":["--no-sandbox"],"executablePath":"/usr/bin/google-chrome"}' > pp.json
mmdc -p pp.json -i diagram.mmd -o diagram.svg
```

A syntax error exits non-zero; a clean render produces one `flowchart-<id>-N` element per node in the SVG, which is a quick count against the ~12-node limit. Without the puppeteer config mmdc tries to download its own Chromium and hangs or fails on sandboxing.
