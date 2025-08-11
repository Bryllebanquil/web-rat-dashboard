import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

const PasswordManagementCard = () => {
  const [pw, setPw] = useState("");
  const { toast } = useToast();

  const onChange = () => {
    toast({ title: "Password updated", description: "This is a demo action." });
    setPw("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="password"
          placeholder="New password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <Button
          variant="secondary"
          className="w-full font-medium"
          style={{ backgroundImage: "var(--gradient-primary)" }}
          onClick={onChange}
        >
          Change Password
        </Button>
        <p className="text-xs text-muted-foreground">
          Make sure you are connected via secure channel.
        </p>
      </CardContent>
    </Card>
  );
};

export default PasswordManagementCard;
