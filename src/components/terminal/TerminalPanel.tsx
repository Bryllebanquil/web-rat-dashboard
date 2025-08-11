import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Send, Trash2, Copy, Download } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface TerminalPanelProps {
  agentId?: string | null;
}

interface TerminalOutput {
  id: string;
  timestamp: string;
  type: 'command' | 'output' | 'error' | 'system';
  content: string;
  agentId?: string;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ agentId }) => {
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState<TerminalOutput[]>([
    {
      id: "1",
      timestamp: new Date().toLocaleTimeString(),
      type: "system",
      content: "NEURAL_TERMINAL_v2.1 > Terminal ready - waiting for commands..."
    }
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:8080/ws');

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        if (data.type === 'terminal_output') {
          addOutput({
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            type: 'output',
            content: data.content,
            agentId: data.agent_id
          });
        } else if (data.type === 'command_result') {
          addOutput({
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            type: data.success ? 'output' : 'error',
            content: data.result,
            agentId: data.agent_id
          });
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  const addOutput = (newOutput: TerminalOutput) => {
    setOutput(prev => [...prev, newOutput]);
  };

  const executeCommand = () => {
    if (!command.trim()) return;

    // Add command to output
    addOutput({
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type: 'command',
      content: `$ ${command}`,
      agentId
    });

    // Send command via WebSocket
    sendMessage(JSON.stringify({
      type: 'issue_command',
      command: command.trim(),
      agent_id: agentId
    }));

    setCommand("");
    inputRef.current?.focus();
  };

  const clearTerminal = () => {
    setOutput([{
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type: "system",
      content: "Terminal cleared"
    }]);
  };

  const copyOutput = () => {
    const textOutput = output
      .map(item => `[${item.timestamp}] ${item.content}`)
      .join('\n');
    navigator.clipboard.writeText(textOutput);
  };

  const downloadOutput = () => {
    const textOutput = output
      .map(item => `[${item.timestamp}] ${item.content}`)
      .join('\n');
    const blob = new Blob([textOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-output-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getOutputColor = (type: string) => {
    switch (type) {
      case 'command': return 'text-blue-400';
      case 'error': return 'text-red-400';
      case 'system': return 'text-green-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              <CardTitle>Terminal Control</CardTitle>
              {agentId && (
                <Badge variant="outline">Agent: {agentId}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              <Button variant="outline" size="sm" onClick={copyOutput}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={downloadOutput}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={clearTerminal}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Terminal Output */}
          <div className="relative">
            <ScrollArea 
              className="h-[400px] w-full rounded-md border bg-black p-4 font-mono text-sm"
              ref={scrollRef}
            >
              <div className="space-y-1">
                {output.map((item) => (
                  <div key={item.id} className="flex gap-2">
                    <span className="text-gray-500 text-xs min-w-[80px]">
                      {item.timestamp}
                    </span>
                    <span className={getOutputColor(item.type)}>
                      {item.content}
                    </span>
                    {item.agentId && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.agentId}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Command Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    executeCommand();
                  }
                }}
                placeholder={agentId ? `Enter command for agent ${agentId}...` : "Enter command for all agents..."}
                className="font-mono"
              />
            </div>
            <Button onClick={executeCommand} disabled={!command.trim()}>
              <Send className="h-4 w-4" />
              Execute
            </Button>
          </div>

          {/* Quick Commands */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommand("whoami")}
            >
              whoami
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommand("systeminfo")}
            >
              systeminfo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommand("tasklist")}
            >
              tasklist
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommand("netstat -an")}
            >
              netstat
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommand("ipconfig /all")}
            >
              ipconfig
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommand("dir C:\\")}
            >
              dir C:\
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommand("wmic process list")}
            >
              processes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommand("powershell Get-Service")}
            >
              services
            </Button>
          </div>

          {/* Command History */}
          <div className="text-sm text-muted-foreground">
            <p>Press Enter to execute commands. Use the quick command buttons for common operations.</p>
            <p>Commands will be sent to {agentId ? `agent ${agentId}` : "all connected agents"}.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TerminalPanel;