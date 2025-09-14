import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user's private documents and all public documents
    const [privateDocuments, publicDocuments] = await Promise.all([
      ctx.db
        .query("documents")
        .withIndex("by_creator", (q) => q.eq("createdBy", userId))
        .order("desc")
        .collect(),
      ctx.db
        .query("documents")
        .withIndex("by_public", (q) => q.eq("isPublic", true))
        .order("desc")
        .collect(),
    ]);

    // Combine and deduplicate (user's public docs might appear in both lists)
    const allDocuments = [...privateDocuments];
    for (const doc of publicDocuments) {
      if (!allDocuments.find((d) => d._id === doc._id)) {
        allDocuments.push(doc);
      }
    }

    // Sort by last modified
    return allDocuments.sort((a, b) => b.lastModified - a.lastModified);
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (!args.query.trim()) {
      return [];
    }

    // Search in user's documents and public documents
    const [userResults, publicResults] = await Promise.all([
      ctx.db
        .query("documents")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.query).eq("createdBy", userId)
        )
        .collect(),
      ctx.db
        .query("documents")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.query).eq("isPublic", true)
        )
        .collect(),
    ]);

    // Combine and deduplicate
    const allResults = [...userResults];
    for (const doc of publicResults) {
      if (!allResults.find((d) => d._id === doc._id)) {
        allResults.push(doc);
      }
    }

    return allResults.sort((a, b) => b.lastModified - a.lastModified);
  },
});

export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      return null;
    }

    // Check if user can access this document
    if (!document.isPublic && document.createdBy !== userId) {
      throw new Error("Not authorized to access this document");
    }

    return document;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("documents", {
      title: args.title,
      isPublic: args.isPublic,
      createdBy: userId,
      lastModified: Date.now(),
    });
  },
});

export const updateTitle = mutation({
  args: {
    id: v.id("documents"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Only creator can update title
    if (document.createdBy !== userId) {
      throw new Error("Not authorized to update this document");
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      lastModified: Date.now(),
    });
  },
});

export const updateVisibility = mutation({
  args: {
    id: v.id("documents"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Only creator can update visibility
    if (document.createdBy !== userId) {
      throw new Error("Not authorized to update this document");
    }

    await ctx.db.patch(args.id, {
      isPublic: args.isPublic,
      lastModified: Date.now(),
    });
  },
});

export const deleteDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Only creator can delete
    if (document.createdBy !== userId) {
      throw new Error("Not authorized to delete this document");
    }

    await ctx.db.delete(args.id);
  },
});

export const updateLastModified = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      return;
    }

    // Check if user can access this document
    if (!document.isPublic && document.createdBy !== userId) {
      return;
    }

    await ctx.db.patch(args.id, {
      lastModified: Date.now(),
    });
  },
});
