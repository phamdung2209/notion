import { components } from "./_generated/api";
import { ProsemirrorSync } from "@convex-dev/prosemirror-sync";
import { getAuthUserId } from "@convex-dev/auth/server";
import { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import { DataModel } from "./_generated/dataModel";
import { api } from "./_generated/api";

const prosemirrorSync = new ProsemirrorSync(components.prosemirrorSync);

async function checkPermissions(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
  documentId: string
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const document = await ctx.db.get(documentId as any);
  if (!document) {
    throw new Error("Document not found");
  }

  // Check if this is a document from our documents table
  if ('isPublic' in document && 'createdBy' in document) {
    // Check if user can access this document
    if (!document.isPublic && document.createdBy !== userId) {
      throw new Error("Not authorized to access this document");
    }
  }
}

export const { getSnapshot, submitSnapshot, latestVersion, getSteps, submitSteps } = 
  prosemirrorSync.syncApi<DataModel>({
    checkRead: async (ctx, id) => {
      await checkPermissions(ctx, id);
    },
    checkWrite: async (ctx, id) => {
      await checkPermissions(ctx, id);
    },
    onSnapshot: async (ctx, id, snapshot, version) => {
      // Update the document's last modified time when content changes
      await ctx.runMutation(api.documents.updateLastModified, { 
        id: id as any 
      });
    },
  });
