/**
 * Move the target between the remaining read and unread stories, preserving their order.
 * @param {Array<{ documentId: string, isRead: boolean }>} documents
 * @param {string} documentId
 * @returns {number} The target's new index, or -1 if it does not exist.
 */
export function reorderStoriesForDeepLink(documents, documentId) {
  const targetIndex = documents.findIndex((doc) => doc.documentId === documentId);
  if (targetIndex === -1) return -1;

  const [target] = documents.splice(targetIndex, 1);
  const readStories = documents.filter((doc) => doc.isRead);
  const unreadStories = documents.filter((doc) => !doc.isRead);

  documents.splice(0, documents.length, ...readStories, target, ...unreadStories);
  return readStories.length;
}
