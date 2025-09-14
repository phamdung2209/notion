import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  documents: defineTable({
    title: v.string(),
    isPublic: v.boolean(),
    createdBy: v.id("users"),
    lastModified: v.number(),
  })
    .index("by_creator", ["createdBy"])
    .index("by_public", ["isPublic"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["isPublic", "createdBy"],
    }),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
