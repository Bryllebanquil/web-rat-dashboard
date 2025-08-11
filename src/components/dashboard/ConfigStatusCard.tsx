import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold">{value}</span>
  </div>
);

const ConfigStatusCard: React.FC = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Config Status</CardTitle>
        <span className="text-xs text-muted-foreground">Last updated: —</span>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <Row label="Admin password set" value="Yes" />
          <Row label="Secret key" value="Hidden" />
          <Row label="Session timeout" value="3600s" />
          <Row label="Blocked IPs" value="0" />
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigStatusCard;
