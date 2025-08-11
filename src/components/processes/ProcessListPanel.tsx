import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { List, RefreshCw, Search, MoreHorizontal, X, AlertTriangle } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface ProcessListPanelProps {
  agentId?: string | null;
}

interface Process {
  pid: number;
  name: string;
  status: string;
  cpuUsage: number;
  memoryUsage: number;
  path?: string;
  user?: string;
  startTime?: string;
}

const ProcessListPanel: React.FC<ProcessListPanelProps> = ({ agentId }) => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [filteredProcesses, setFilteredProcesses] = useState<Process[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<keyof Process>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:8080');

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        if (data.type === 'process_list_response') {
          setProcesses(data.processes || []);
          setLastUpdate(new Date().toLocaleTimeString());
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
        setIsLoading(false);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    let filtered = processes.filter(process =>
      process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.pid.toString().includes(searchTerm) ||
      (process.path && process.path.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Sort processes
    filtered.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (sortOrder === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });

    setFilteredProcesses(filtered);
  }, [processes, searchTerm, sortBy, sortOrder]);

  const refreshProcessList = () => {
    setIsLoading(true);
    sendMessage(JSON.stringify({
      type: 'list_processes',
      agent_id: agentId
    }));
  };

  const killProcess = (pid: number, processName: string) => {
    sendMessage(JSON.stringify({
      type: 'issue_command',
      command: `taskkill /F /PID ${pid}`,
      agent_id: agentId
    }));
    
    // Optimistically remove from list
    setProcesses(prev => prev.filter(p => p.pid !== pid));
  };

  const handleSort = (column: keyof Process) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running': return 'bg-green-500';
      case 'suspended': return 'bg-yellow-500';
      case 'stopped': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatMemory = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Mock data for demonstration
  useEffect(() => {
    if (processes.length === 0) {
      setProcesses([
        { pid: 1234, name: "explorer.exe", status: "Running", cpuUsage: 2.1, memoryUsage: 45678912, path: "C:\\Windows\\explorer.exe", user: "SYSTEM" },
        { pid: 5678, name: "chrome.exe", status: "Running", cpuUsage: 15.3, memoryUsage: 234567890, path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", user: "User" },
        { pid: 9012, name: "notepad.exe", status: "Running", cpuUsage: 0.1, memoryUsage: 12345678, path: "C:\\Windows\\System32\\notepad.exe", user: "User" },
        { pid: 3456, name: "svchost.exe", status: "Running", cpuUsage: 0.5, memoryUsage: 23456789, path: "C:\\Windows\\System32\\svchost.exe", user: "SYSTEM" },
        { pid: 7890, name: "agent.exe", status: "Running", cpuUsage: 1.2, memoryUsage: 8765432, path: "C:\\Users\\User\\AppData\\Roaming\\agent.exe", user: "User" },
      ]);
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List className="h-5 w-5" />
              <CardTitle>Process List</CardTitle>
              {agentId && (
                <Badge variant="outline">Agent: {agentId}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <span className="text-sm text-muted-foreground">
                  Last updated: {lastUpdate}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refreshProcessList}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search processes by name, PID, or path..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            {searchTerm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Process Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{processes.length}</div>
              <div className="text-sm text-muted-foreground">Total Processes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {processes.filter(p => p.status === 'Running').length}
              </div>
              <div className="text-sm text-muted-foreground">Running</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {processes.reduce((acc, p) => acc + p.cpuUsage, 0).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Total CPU</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatMemory(processes.reduce((acc, p) => acc + p.memoryUsage, 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total Memory</div>
            </div>
          </div>

          {/* Process Table */}
          <ScrollArea className="h-[500px] w-full rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('pid')}
                  >
                    PID {sortBy === 'pid' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('name')}
                  >
                    Process Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('cpuUsage')}
                  >
                    CPU % {sortBy === 'cpuUsage' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('memoryUsage')}
                  >
                    Memory {sortBy === 'memoryUsage' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcesses.map((process) => (
                  <TableRow key={process.pid}>
                    <TableCell className="font-mono">{process.pid}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{process.name}</span>
                        {process.path && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {process.path}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(process.status)}`} />
                        {process.status}
                      </div>
                    </TableCell>
                    <TableCell>{process.cpuUsage.toFixed(1)}%</TableCell>
                    <TableCell>{formatMemory(process.memoryUsage)}</TableCell>
                    <TableCell>{process.user || "Unknown"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => killProcess(process.pid, process.name)}
                            className="text-red-600"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Kill Process
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Suspend Process
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {filteredProcesses.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No processes match your search" : "No processes found"}
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading processes...
            </div>
          )}

          {/* Process Management Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={refreshProcessList}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh List
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                sendMessage(JSON.stringify({
                  type: 'issue_command',
                  command: 'wmic process list full',
                  agent_id: agentId
                }));
              }}
            >
              Detailed View
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                sendMessage(JSON.stringify({
                  type: 'issue_command',
                  command: 'powershell Get-Process | Sort-Object CPU -Descending | Select-Object -First 10',
                  agent_id: agentId
                }));
              }}
            >
              Top CPU Processes
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Showing {filteredProcesses.length} of {processes.length} processes</p>
            <p>Click column headers to sort. Use the search box to filter processes.</p>
            {agentId && <p>Data from agent: {agentId}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessListPanel;