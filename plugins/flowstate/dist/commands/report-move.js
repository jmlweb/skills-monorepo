import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
export async function reportMove(store, id, status, taskId) {
    const report = await store.find("report", id, ["pending"]);
    if (!report) {
        throw new EntityNotFoundError(id, "reports/pending");
    }
    const fm = { ...report.frontmatter };
    fm["status"] = status;
    fm["triaged"] = today();
    if (taskId) {
        fm["task-id"] = taskId;
    }
    const moved = await store.save(report, fm, report.body, "complete");
    return { path: moved.path };
}
