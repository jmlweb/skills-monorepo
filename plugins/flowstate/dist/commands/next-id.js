import { nextFileId } from "../core/file-store.js";
export async function nextId(root, type) {
    return nextFileId(root, type);
}
