import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Download, 
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Folder,
  Trash2,
  Pause,
  Play,
  Square,
  RefreshCw,
  Clock,
  HardDrive,
  Wifi,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Copy,
  FolderOpen,
  Search,
  Filter,
  Settings
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface FileTransfer {
  id: string;
  filename: string;
  size: number;
  progress: number;
  status: 'uploading' | 'downloading' | 'completed' | 'failed' | 'paused' | 'queued';
  direction: 'upload' | 'download';
  speed: number;
  eta: number;
  startTime: string;
  endTime?: string;
  localPath: string;
  remotePath: string;
  chunks_total: number;
  chunks_completed: number;
  error?: string;
}

interface FileInfo {
  name: string;
  size: number;
  type: 'file' | 'directory';
  modified: string;
  permissions: string;
  path: string;
}

interface TransferStats {
  total_uploads: number;
  total_downloads: number;
  bytes_uploaded: number;
  bytes_downloaded: number;
  active_transfers: number;
  completed_transfers: number;
  failed_transfers: number;
}

interface EnhancedFileTransferPanelProps {
  agentId?: string | null;
}

const EnhancedFileTransferPanel: React.FC<EnhancedFileTransferPanelProps> = ({ agentId }) => {
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [stats, setStats] = useState<TransferStats>({
    total_uploads: 0,
    total_downloads: 0,
    bytes_uploaded: 0,
    bytes_downloaded: 0,
    active_transfers: 0,
    completed_transfers: 0,
    failed_transfers: 0
  });
  const [currentPath, setCurrentPath] = useState("C:\\");
  const [fileList, setFileList] = useState<FileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [uploadPath, setUploadPath] = useState("");
  const [downloadPath, setDownloadPath] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("transfers");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:8080/ws');

  // WebSocket message handling
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        
        switch (data.type) {
          case 'file_transfer_update':
            if (data.agent_id === agentId) {
              setTransfers(prev => 
                prev.map(transfer => 
                  transfer.id === data.transfer_id 
                    ? { ...transfer, ...data.update }
                    : transfer
                )
              );
            }
            break;
          case 'file_transfer_complete':
            if (data.agent_id === agentId) {
              setTransfers(prev => 
                prev.map(transfer => 
                  transfer.id === data.transfer_id 
                    ? { ...transfer, status: 'completed', progress: 100, endTime: new Date().toISOString() }
                    : transfer
                )
              );
              updateStats();
            }
            break;
          case 'file_transfer_error':
            if (data.agent_id === agentId) {
              setTransfers(prev => 
                prev.map(transfer => 
                  transfer.id === data.transfer_id 
                    ? { ...transfer, status: 'failed', error: data.error }
                    : transfer
                )
              );
            }
            break;
          case 'file_list_response':
            if (data.agent_id === agentId) {
              setFileList(data.files || []);
              setCurrentPath(data.path || currentPath);
            }
            break;
          case 'transfer_stats':
            setStats(data.stats || stats);
            break;
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    }
  }, [lastMessage, agentId]);

  const updateStats = () => {
    const activeTransfers = transfers.filter(t => ['uploading', 'downloading'].includes(t.status));
    const completedTransfers = transfers.filter(t => t.status === 'completed');
    const failedTransfers = transfers.filter(t => t.status === 'failed');
    
    setStats({
      total_uploads: transfers.filter(t => t.direction === 'upload').length,
      total_downloads: transfers.filter(t => t.direction === 'download').length,
      bytes_uploaded: transfers.filter(t => t.direction === 'upload' && t.status === 'completed')
        .reduce((sum, t) => sum + t.size, 0),
      bytes_downloaded: transfers.filter(t => t.direction === 'download' && t.status === 'completed')
        .reduce((sum, t) => sum + t.size, 0),
      active_transfers: activeTransfers.length,
      completed_transfers: completedTransfers.length,
      failed_transfers: failedTransfers.length
    });
  };

  const browseDirectory = (path?: string) => {
    if (!agentId) return;
    
    const targetPath = path || currentPath;
    sendMessage(JSON.stringify({
      type: 'file_control',
      agent_id: agentId,
      action: 'list_directory',
      params: {
        path: targetPath
      }
    }));
  };

  const uploadFiles = (files: FileList) => {
    if (!agentId || !files.length) return;
    
    Array.from(files).forEach(file => {
      const transferId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newTransfer: FileTransfer = {
        id: transferId,
        filename: file.name,
        size: file.size,
        progress: 0,
        status: 'queued',
        direction: 'upload',
        speed: 0,
        eta: 0,
        startTime: new Date().toISOString(),
        localPath: file.name,
        remotePath: uploadPath || currentPath,
        chunks_total: Math.ceil(file.size / 65536), // 64KB chunks
        chunks_completed: 0
      };
      
      setTransfers(prev => [...prev, newTransfer]);
      
      // Start chunked upload
      startChunkedUpload(transferId, file);
    });
  };

  const startChunkedUpload = (transferId: string, file: File) => {
    const chunkSize = 65536; // 64KB chunks
    let offset = 0;
    
    const uploadChunk = () => {
      const chunk = file.slice(offset, offset + chunkSize);
      const reader = new FileReader();
      
      reader.onload = () => {
        sendMessage(JSON.stringify({
          type: 'upload_file_chunk',
          agent_id: agentId,
          transfer_id: transferId,
          filename: file.name,
          data: reader.result,
          offset: offset,
          total_size: file.size,
          destination_path: uploadPath || currentPath
        }));
        
        offset += chunkSize;
        const progress = Math.min((offset / file.size) * 100, 100);
        
        setTransfers(prev => 
          prev.map(transfer => 
            transfer.id === transferId 
              ? { 
                  ...transfer, 
                  progress, 
                  status: 'uploading',
                  chunks_completed: Math.floor(offset / chunkSize)
                }
              : transfer
          )
        );
        
        if (offset < file.size) {
          setTimeout(uploadChunk, 10); // Small delay between chunks
        } else {
          sendMessage(JSON.stringify({
            type: 'upload_file_end',
            agent_id: agentId,
            transfer_id: transferId,
            filename: file.name
          }));
        }
      };
      
      reader.readAsDataURL(chunk);
    };
    
    uploadChunk();
  };

  const downloadFile = (fileInfo: FileInfo) => {
    if (!agentId) return;
    
    const transferId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTransfer: FileTransfer = {
      id: transferId,
      filename: fileInfo.name,
      size: fileInfo.size,
      progress: 0,
      status: 'queued',
      direction: 'download',
      speed: 0,
      eta: 0,
      startTime: new Date().toISOString(),
      localPath: downloadPath || fileInfo.name,
      remotePath: fileInfo.path,
      chunks_total: Math.ceil(fileInfo.size / 65536),
      chunks_completed: 0
    };
    
    setTransfers(prev => [...prev, newTransfer]);
    
    sendMessage(JSON.stringify({
      type: 'download_file',
      agent_id: agentId,
      transfer_id: transferId,
      filename: fileInfo.name,
      remote_path: fileInfo.path,
      local_path: downloadPath || fileInfo.name
    }));
  };

  const pauseTransfer = (transferId: string) => {
    setTransfers(prev => 
      prev.map(transfer => 
        transfer.id === transferId 
          ? { ...transfer, status: 'paused' }
          : transfer
      )
    );
  };

  const resumeTransfer = (transferId: string) => {
    setTransfers(prev => 
      prev.map(transfer => 
        transfer.id === transferId 
          ? { ...transfer, status: transfer.direction === 'upload' ? 'uploading' : 'downloading' }
          : transfer
      )
    );
  };

  const cancelTransfer = (transferId: string) => {
    setTransfers(prev => prev.filter(transfer => transfer.id !== transferId));
    
    sendMessage(JSON.stringify({
      type: 'cancel_transfer',
      agent_id: agentId,
      transfer_id: transferId
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s';
  };

  const formatETA = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getFileIcon = (filename: string, type: string) => {
    if (type === 'directory') return <Folder className="h-4 w-4 text-blue-500" />;
    
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return <Image className="h-4 w-4 text-green-500" />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return <Video className="h-4 w-4 text-purple-500" />;
      case 'mp3':
      case 'wav':
      case 'flac':
        return <Music className="h-4 w-4 text-orange-500" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <Archive className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'uploading':
      case 'downloading': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = searchTerm === "" || 
      transfer.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || transfer.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (!agentId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Please select an agent to access file transfer features</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Enhanced File Transfer Panel
            <Badge variant="outline">
              {stats.active_transfers} active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="transfers">Transfers</TabsTrigger>
              <TabsTrigger value="browser">File Browser</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="transfers" className="space-y-4">
              {/* Statistics */}
              <div className="grid gap-4 md:grid-cols-7 mb-6">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold">{stats.total_uploads}</div>
                    <div className="text-xs text-muted-foreground">Uploads</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold">{stats.total_downloads}</div>
                    <div className="text-xs text-muted-foreground">Downloads</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-blue-500">{stats.active_transfers}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-green-500">{stats.completed_transfers}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-red-500">{stats.failed_transfers}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-sm font-bold">{formatFileSize(stats.bytes_uploaded)}</div>
                    <div className="text-xs text-muted-foreground">Uploaded</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-sm font-bold">{formatFileSize(stats.bytes_downloaded)}</div>
                    <div className="text-xs text-muted-foreground">Downloaded</div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search transfers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">All Status</option>
                  <option value="uploading">Uploading</option>
                  <option value="downloading">Downloading</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              {/* Transfer List */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Transfers ({filteredTransfers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    {filteredTransfers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No file transfers</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredTransfers.map((transfer) => (
                          <div key={transfer.id} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {getFileIcon(transfer.filename, 'file')}
                                <div>
                                  <div className="font-medium">{transfer.filename}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatFileSize(transfer.size)} • {transfer.direction}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(transfer.status)}
                                <Badge variant={
                                  transfer.status === 'completed' ? 'default' :
                                  transfer.status === 'failed' ? 'destructive' :
                                  transfer.status === 'paused' ? 'secondary' : 'outline'
                                }>
                                  {transfer.status.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>Progress: {transfer.progress.toFixed(1)}%</span>
                                <span>{transfer.chunks_completed}/{transfer.chunks_total} chunks</span>
                              </div>
                              <Progress value={transfer.progress} className="h-2" />
                              
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Speed: {formatSpeed(transfer.speed)}</span>
                                <span>ETA: {formatETA(transfer.eta)}</span>
                                <span>Started: {new Date(transfer.startTime).toLocaleTimeString()}</span>
                              </div>
                              
                              {transfer.error && (
                                <Alert className="mt-2">
                                  <XCircle className="h-4 w-4" />
                                  <AlertDescription>{transfer.error}</AlertDescription>
                                </Alert>
                              )}
                              
                              <div className="flex items-center gap-2 mt-3">
                                {transfer.status === 'paused' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => resumeTransfer(transfer.id)}
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    Resume
                                  </Button>
                                ) : transfer.status === 'uploading' || transfer.status === 'downloading' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => pauseTransfer(transfer.id)}
                                  >
                                    <Pause className="h-3 w-3 mr-1" />
                                    Pause
                                  </Button>
                                ) : null}
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => cancelTransfer(transfer.id)}
                                >
                                  <Square className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="browser" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Remote File Browser</span>
                    <Button size="sm" variant="outline" onClick={() => browseDirectory()}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <FolderOpen className="h-4 w-4" />
                    <span className="font-mono text-sm">{currentPath}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const parentPath = currentPath.split('\\').slice(0, -1).join('\\') || 'C:\\';
                        browseDirectory(parentPath);
                      }}
                    >
                      Up
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-80">
                    {fileList.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No files found or directory not accessible</p>
                        <Button onClick={() => browseDirectory()} variant="outline" className="mt-4">
                          Browse Directory
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {fileList.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                            onClick={() => {
                              if (file.type === 'directory') {
                                browseDirectory(file.path);
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {getFileIcon(file.name, file.type)}
                              <div>
                                <div className="font-medium">{file.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {file.type === 'file' ? formatFileSize(file.size) : 'Directory'} • 
                                  Modified: {new Date(file.modified).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            {file.type === 'file' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadFile(file);
                                }}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Files</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Upload Destination</label>
                    <Input
                      placeholder="Remote path (leave empty for current directory)"
                      value={uploadPath}
                      onChange={(e) => setUploadPath(e.target.value)}
                    />
                  </div>
                  
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        uploadFiles(files);
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
                    <p className="text-sm text-muted-foreground">
                      Supports multiple files and large file uploads via chunking
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        uploadFiles(e.target.files);
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transfer Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Default Download Path</label>
                    <Input
                      placeholder="Local download directory"
                      value={downloadPath}
                      onChange={(e) => setDownloadPath(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Default Upload Path</label>
                    <Input
                      placeholder="Remote upload directory"
                      value={uploadPath}
                      onChange={(e) => setUploadPath(e.target.value)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Transfer Information</div>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Chunk Size:</span>
                        <span>64 KB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Concurrent:</span>
                        <span>5 transfers</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Timeout:</span>
                        <span>30 seconds</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retry Attempts:</span>
                        <span>3</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedFileTransferPanel;