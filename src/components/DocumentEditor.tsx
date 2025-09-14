import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useBlockNoteSync } from "@convex-dev/prosemirror-sync/blocknote";
import { BlockNoteView } from "@blocknote/mantine";
import { BlockNoteEditor } from "@blocknote/core";
import { useState, useEffect } from "react";
import { Globe, Lock, Edit3, Check, X } from "lucide-react";
import { toast } from "sonner";
import { PresenceIndicator } from "./PresenceIndicator";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface DocumentEditorProps {
  documentId: Id<"documents">;
}

export function DocumentEditor({ documentId }: DocumentEditorProps) {
  const document = useQuery(api.documents.get, { id: documentId });
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const updateTitle = useMutation(api.documents.updateTitle);
  const updateVisibility = useMutation(api.documents.updateVisibility);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  const sync = useBlockNoteSync<BlockNoteEditor>(api.prosemirror, documentId);

  useEffect(() => {
    if (document?.title) {
      setEditedTitle(document.title);
    }
  }, [document?.title]);

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || editedTitle === document?.title) {
      setIsEditingTitle(false);
      setEditedTitle(document?.title || "");
      return;
    }

    try {
      await updateTitle({ id: documentId, title: editedTitle.trim() });
      setIsEditingTitle(false);
      toast.success("Title updated");
    } catch (error) {
      toast.error("Failed to update title");
      setEditedTitle(document?.title || "");
      setIsEditingTitle(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!document) return;

    try {
      await updateVisibility({
        id: documentId,
        isPublic: !document.isPublic,
      });
      toast.success(
        `Document is now ${!document.isPublic ? "public" : "private"}`
      );
    } catch (error) {
      toast.error("Failed to update visibility");
    }
  };

  if (document === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (document === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Document not found
          </h2>
          <p className="text-gray-600">
            This document may have been deleted or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  const isOwner = document.createdBy === loggedInUser?._id;
  const canEdit = isOwner || document.isPublic;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Document Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setIsEditingTitle(false);
                      setEditedTitle(document.title);
                    }
                  }}
                  className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingTitle(false);
                    setEditedTitle(document.title);
                  }}
                  className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {document.title}
                </h1>
                {isOwner && (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <PresenceIndicator documentId={documentId} />

            {isOwner && (
              <button
                onClick={handleToggleVisibility}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  document.isPublic
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {document.isPublic ? (
                  <>
                    <Globe className="w-4 h-4" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Private
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Last modified: {new Date(document.lastModified).toLocaleString()}
          {!canEdit && (
            <span className="ml-4 text-amber-600">
              • Read-only (you don't have edit permissions)
            </span>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {sync.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : sync.editor ? (
          <div className="h-full">
            <BlockNoteView
              editor={sync.editor}
              editable={canEdit}
              className="h-full"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => sync.create({ type: "doc", content: [] })}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Initialize Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper component to handle document ID changes
export function DocumentEditorWrapper({ documentId }: DocumentEditorProps) {
  return <DocumentEditor key={documentId} documentId={documentId} />;
}
