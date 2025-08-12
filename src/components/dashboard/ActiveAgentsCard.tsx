import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      </CardContent>
    </Card>
  );
};

export default ActiveAgentsCard;
