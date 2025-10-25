import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FolderOpen, Save, Undo, FileText, File, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { File as FileType } from "@shared/schema";

export default function TextEditor() {
  const [openFiles, setOpenFiles] = useState<FileType[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all files
  const { data: allFiles = [] } = useQuery<FileType[]>({
    queryKey: ["/api/files"],
  });

  // Get text files only
  const textFiles = allFiles.filter(file => 
    file.type === "file" && (
      file.name.endsWith('.txt') ||
      file.name.endsWith('.py') ||
      file.name.endsWith('.js') ||
      file.name.endsWith('.ts') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.xml') ||
      file.name.endsWith('.html') ||
      file.name.endsWith('.css') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.sh') ||
      file.name.endsWith('.bashrc') ||
      file.name.endsWith('.profile') ||
      !file.name.includes('.')
    )
  );

  // Update file mutation
  const updateFile = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const response = await apiRequest("PUT", `/api/files/${id}`, { content });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setUnsavedChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.id);
        return newSet;
      });
      toast({
        title: "Success",
        description: "File saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save file",
        variant: "destructive",
      });
    },
  });

  const openFile = (file: FileType) => {
    if (!openFiles.find(f => f.id === file.id)) {
      setOpenFiles(prev => [...prev, file]);
      setFileContents(prev => ({ ...prev, [file.id]: file.content || "" }));
    }
    setActiveFileId(file.id);
  };

  const closeFile = (fileId: string) => {
    setOpenFiles(prev => prev.filter(f => f.id !== fileId));
    setFileContents(prev => {
      const newContents = { ...prev };
      delete newContents[fileId];
      return newContents;
    });
    setUnsavedChanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
    
    if (activeFileId === fileId) {
      const remainingFiles = openFiles.filter(f => f.id !== fileId);
      setActiveFileId(remainingFiles.length > 0 ? remainingFiles[0].id : null);
    }
  };

  const handleContentChange = (fileId: string, content: string) => {
    setFileContents(prev => ({ ...prev, [fileId]: content }));
    setUnsavedChanges(prev => new Set(prev).add(fileId));
  };

  const saveFile = (fileId: string) => {
    const content = fileContents[fileId];
    if (content !== undefined) {
      updateFile.mutate({ id: fileId, content });
    }
  };

  const activeFile = openFiles.find(f => f.id === activeFileId);
  const activeContent = activeFileId ? fileContents[activeFileId] || "" : "";
  const hasUnsavedChanges = activeFileId ? unsavedChanges.has(activeFileId) : false;

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.py') || fileName.endsWith('.js') || fileName.endsWith('.ts')) {
      return <FileText className="h-4 w-4 text-green-400" />;
    }
    return <File className="h-4 w-4 text-blue-400" />;
  };

  const getLineNumbers = (content: string) => {
    const lines = content.split('\n');
    return Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1);
  };

  return (
    <div className="flex-1 flex">
      {/* File Explorer */}
      <div className="w-64 terminal-panel border-r terminal-border p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold terminal-muted uppercase tracking-wide">
            Open Files
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs terminal-accent hover:terminal-info h-auto p-1"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Open Files Tabs */}
        <div className="space-y-1 mb-4">
          {openFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer ${
                activeFileId === file.id
                  ? "bg-cyan-500/20 terminal-accent"
                  : "terminal-muted hover:bg-gray-600/30"
              }`}
              onClick={() => setActiveFileId(file.id)}
            >
              {getFileIcon(file.name)}
              <span className="flex-1 truncate">{file.name}</span>
              {unsavedChanges.has(file.id) && (
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.id);
                }}
                className="p-0 h-auto terminal-muted hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Available Files */}
        <div className="border-t terminal-border pt-3">
          <h4 className="text-xs font-semibold terminal-muted uppercase tracking-wide mb-2">
            Available Files
          </h4>
          <div className="space-y-1">
            {textFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-600/30 rounded text-sm cursor-pointer terminal-muted"
                onClick={() => openFile(file)}
              >
                {getFileIcon(file.name)}
                <span className="truncate">{file.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {activeFile ? (
          <>
            {/* Editor Header */}
            <div className="h-12 terminal-panel border-b terminal-border flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono terminal-text">{activeFile.path}</span>
                {hasUnsavedChanges && (
                  <span className="text-xs terminal-warning">• Modified</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => activeFileId && saveFile(activeFileId)}
                  disabled={!hasUnsavedChanges || updateFile.isPending}
                  className="bg-green-500 text-black hover:bg-green-400"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="terminal-border terminal-text hover:bg-gray-600"
                >
                  <Undo className="h-4 w-4 mr-1" />
                  Undo
                </Button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 flex">
              {/* Line Numbers */}
              <div className="w-12 terminal-panel border-r terminal-border p-2 text-right text-xs font-mono terminal-muted select-none">
                {getLineNumbers(activeContent).map((num) => (
                  <div key={num}>{num}</div>
                ))}
              </div>

              {/* Editor */}
              <div className="flex-1 p-4">
                <Textarea
                  value={activeContent}
                  onChange={(e) => activeFileId && handleContentChange(activeFileId, e.target.value)}
                  className="w-full h-full bg-transparent border-none outline-none resize-none text-sm font-mono terminal-text placeholder-gray-500 focus:ring-0"
                  placeholder="Start typing..."
                  style={{ minHeight: 'calc(100vh - 200px)' }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center terminal-muted">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No File Open</h3>
              <p className="text-sm">Select a file from the sidebar to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
