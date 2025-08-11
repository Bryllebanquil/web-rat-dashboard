import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Download, 
  File, 
  Folder,
  Trash2,
  Pause,
  Play,
  X
} from 'lucide-react';

interface FileTransfer {
  id: string;
  filename: string;
  size: number;
  progress: number;
  direction: 'upload' | 'download';
  status: 'pending' | 'active' | 'completed' | 'failed' | 'paused';
  speed: number;
}

interface FileTransferPanelProps {
  agentId: string;
  transfers: FileTransfer[];
  onFileAction: (action: string, params?: any) => void;
}

const FileTransferPanel: React.FC<FileTransferPanelProps> = ({
  agentId,
  transfers,
  onFileAction
}) => {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [downloadPath, setDownloadPath] = useState('');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatFileSize(bytesPerSecond) + '/s';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'failed': return 'destructive';
      case 'paused': return 'outline';
      default: return 'secondary';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const startUpload = () => {
    if (uploadFile) {
      onFileAction('upload', { file: uploadFile });
      setUploadFile(null);
    }
  };

  const startDownload = () => {
    if (downloadPath.trim()) {
      onFileAction('download', { path: downloadPath });
      setDownloadPath('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <File className="w-5 h-5" />
          File Transfer - Agent {agentId}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload File
          </h4>
          <div className="flex gap-2">
            <Input
              type="file"
              onChange={handleFileUpload}
              className="flex-1"
            />
            <Button 
              onClick={startUpload} 
              disabled={!uploadFile}
              size="sm"
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
          </div>
          {uploadFile && (
            <div className="text-sm text-muted-foreground">
              Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
            </div>
          )}
        </div>

        {/* Download Section */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download File
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder="Enter file path (e.g., C:\Users\file.txt)"
              value={downloadPath}
              onChange={(e) => setDownloadPath(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={startDownload} 
              disabled={!downloadPath.trim()}
              size="sm"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Active Transfers */}
        <div className="space-y-2">
          <h4 className="font-medium">Active Transfers</h4>
          <ScrollArea className="h-64 border rounded p-2">
            {transfers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No active transfers
              </div>
            ) : (
              <div className="space-y-3">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="space-y-2 p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {transfer.direction === 'upload' ? 
                          <Upload className="w-4 h-4 text-blue-500" /> : 
                          <Download className="w-4 h-4 text-green-500" />
                        }
                        <span className="font-medium text-sm">{transfer.filename}</span>
                        <Badge variant={getStatusColor(transfer.status)} className="text-xs">
                          {transfer.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        {transfer.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onFileAction('pause', { id: transfer.id })}
                          >
                            <Pause className="w-4 h-4" />
                          </Button>
                        )}
                        {transfer.status === 'paused' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onFileAction('resume', { id: transfer.id })}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFileAction('cancel', { id: transfer.id })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(transfer.size * transfer.progress / 100)} / {formatFileSize(transfer.size)}</span>
                        <span>{transfer.progress}%</span>
                      </div>
                      <Progress value={transfer.progress} className="h-2" />
                      {transfer.status === 'active' && (
                        <div className="text-xs text-muted-foreground">
                          Speed: {formatSpeed(transfer.speed)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Transfer Statistics */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium">{transfers.filter(t => t.status === 'active').length}</div>
            <div className="text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="font-medium">{transfers.filter(t => t.status === 'completed').length}</div>
            <div className="text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="font-medium">{transfers.filter(t => t.status === 'failed').length}</div>
            <div className="text-muted-foreground">Failed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileTransferPanel;