import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import React from "react";

interface FilterToolbarProps {
  deviceGroup?: string;
  category: string;
  check: string;
  range: string;
  onSystemHealth?: () => void;
  onListProcesses?: () => void;
  onRefreshDashboard?: () => void;
}

const Pill: React.FC<{ label: string; value: string }>
  = ({ label, value }) => (
  <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 border border-border">
    <span className="text-xs text-muted-foreground">{label}:</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);

const FilterToolbar: React.FC<FilterToolbarProps> = ({ deviceGroup = "Online", category, check, range, onSystemHealth, onListProcesses, onRefreshDashboard }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Pill label="Device Group" value={deviceGroup} />
        <Pill label="Category" value={category} />
        <Pill label="Checks" value={check} />
        <Pill label="Time Range" value={range} />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onSystemHealth}>System Health</Button>
        <Button variant="secondary" onClick={onListProcesses}>List Processes</Button>
        <Button variant="secondary" onClick={onRefreshDashboard}>Refresh Dashboard</Button>
      </div>
      <Separator className="basis-full" />
    </div>
  );
};

export default FilterToolbar;
