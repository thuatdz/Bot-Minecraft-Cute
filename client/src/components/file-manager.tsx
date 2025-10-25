import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Plus, FolderPlus, Folder, FolderOpen, File, FileText, Edit3, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { File as FileType } from "@shared/schema";

interface FileManagerProps {
  currentPath: string;
  onPathChange: (path: string) => void;
}

export default function FileManager({ currentPath, onPathChange }: FileManagerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState<"file" | "directory">("file");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get files in current directory
  const { data: allFiles = [], isLoading } = useQuery<FileType[]>({
    queryKey: ["/api/files"],
  });

  // Filter files for current directory
  const filesInCurrentDir = allFiles.filter(file => {
    const parentPath = file.path.substring(0, file.path.lastIndexOf('/')) || '/';
    return parentPath === currentPath;
  });

  // Create file/directory mutation
  const createFile = useMutation({
    mutationFn: async ({ name, type }: { name: string; type: "file" | "directory" }) => {
      const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
      const response = await apiRequest("POST", "/api/files", {
        name,
        path,
        content: "",
        type,
        size: type === "directory" ? 4096 : 0,
        permissions: type === "directory" ? "755" : "644",
        owner: "root",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setIsCreateDialogOpen(false);
      setNewFileName("");
      toast({
        title: "Success",
        description: `${newFileType === "file" ? "File" : "Directory"} created successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to create ${newFileType}`,
        variant: "destructive",
      });
    },
  });

  // Delete file mutation
  const deleteFile = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest("DELETE", `/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const handleFileClick = (file: FileType) => {
    if (file.type === "directory") {
      onPathChange(file.path);
    } else {
      setSelectedFile(file.id);
    }
  };

  const handleBack = () => {
    if (currentPath !== "/") {
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
      onPathChange(parentPath);
    }
  };

  const getFileIcon = (file: FileType) => {
    if (file.type === "directory") {
      return file.path === currentPath ? 
        <FolderOpen className="h-4 w-4 text-yellow-500" /> : 
        <Folder className="h-4 w-4 text-yellow-500" />;
    }
    
    if (file.name.endsWith('.py') || file.name.endsWith('.js') || file.name.endsWith('.ts')) {
      return <FileText className="h-4 w-4 text-green-400" />;
    }
    
    return <File className="h-4 w-4 text-blue-400" />;
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Build directory tree
  const buildDirectoryTree = () => {
    const directories = allFiles.filter(f => f.type === "directory").sort((a, b) => a.path.localeCompare(b.path));
    
    return directories.map(dir => {
      const depth = (dir.path.match(/\//g) || []).length - 1;
      const isCurrentPath = dir.path === currentPath;
      
      return (
        <div
          key={dir.id}
          className={`flex items-center gap-2 py-1 px-2 cursor-pointer rounded text-sm ${
            isCurrentPath ? 'terminal-accent' : 'terminal-muted hover:terminal-text'
          }`}
          style={{ marginLeft: `${depth * 16}px` }}
          onClick={() => onPathChange(dir.path)}
        >
          {isCurrentPath ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
          <span>{dir.name}</span>
        </div>
      );
    });
  };

  if (isLoading) {
    return <div className="flex-1 p-4 terminal-text">Loading files...</div>;
  }

  return (
    <div className="flex-1 flex">
      {/* Directory Tree */}
      <div className="w-64 terminal-panel border-r terminal-border p-3">
        <h3 className="text-xs font-semibold terminal-muted uppercase tracking-wide mb-3">
          Directory Tree
        </h3>
        <div className="font-mono space-y-1">
          {buildDirectoryTree()}
        </div>
      </div>

      {/* File Browser */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 terminal-panel border-b terminal-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={currentPath === "/"}
              className="p-1 terminal-muted hover:terminal-text"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 terminal-muted hover:terminal-text"
              disabled
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-mono terminal-text">{currentPath}</span>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-cyan-500 text-black hover:bg-cyan-400"
                  onClick={() => setNewFileType("file")}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New File
                </Button>
              </DialogTrigger>
              <DialogContent className="terminal-panel border terminal-border">
                <DialogHeader>
                  <DialogTitle className="terminal-text">Create New {newFileType}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={newFileType === "file" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewFileType("file")}
                    >
                      File
                    </Button>
                    <Button
                      variant={newFileType === "directory" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewFileType("directory")}
                    >
                      Directory
                    </Button>
                  </div>
                  <Input
                    placeholder={`${newFileType} name`}
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="terminal-panel border terminal-border terminal-text"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => createFile.mutate({ name: newFileName, type: newFileType })}
                      disabled={!newFileName.trim() || createFile.isPending}
                      className="bg-cyan-500 text-black hover:bg-cyan-400"
                    >
                      Create
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              size="sm" 
              variant="outline"
              className="terminal-border terminal-text hover:bg-gray-600"
              onClick={() => {
                setNewFileType("directory");
                setIsCreateDialogOpen(true);
              }}
            >
              <FolderPlus className="h-4 w-4 mr-1" />
              New Folder
            </Button>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 p-4 custom-scrollbar overflow-y-auto">
          <div className="space-y-2">
            {filesInCurrentDir.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                  selectedFile === file.id 
                    ? 'bg-cyan-500/20 border border-cyan-500/50' 
                    : 'hover:bg-gray-600/30'
                }`}
                onClick={() => handleFileClick(file)}
              >
                {getFileIcon(file)}
                <div className="flex-1">
                  <div className="text-sm terminal-text">{file.name}</div>
                  <div className="text-xs terminal-muted">
                    {file.type === "directory" 
                      ? "Folder" 
                      : `${formatFileSize(file.size)} • Modified ${formatDate(file.lastModified)}`
                    }
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {file.type === "file" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 terminal-muted hover:terminal-text"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  )}
                  {file.type === "file" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 terminal-muted hover:terminal-text"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile.mutate(file.id);
                    }}
                    className="p-1 terminal-muted hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {filesInCurrentDir.length === 0 && (
              <div className="text-center py-8 terminal-muted">
                <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>This directory is empty</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
