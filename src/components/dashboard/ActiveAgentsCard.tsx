import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import React from "react";

const ActiveAgentsCard: React.FC = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Active Agents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No agents connected
        </div>
        <div className="grid gap-2">
          <Button
            variant="secondary"
            className="justify-start font-medium"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            Agent Stats
          </Button>
          <Button variant="secondary" className="justify-start bg-muted/30">
            System Health
          </Button>
          <Button variant="secondary" className="justify-start bg-muted/30">
            List Processes
          </Button>
          <Button variant="secondary" className="justify-start bg-muted/30">
            Refresh Dashboard
          </Button>
        </div>
        <Separator />
      </CardContent>
    </Card>
  );
};

export default ActiveAgentsCard;
