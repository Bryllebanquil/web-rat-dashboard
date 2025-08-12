import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useSocketIO } from "@/hooks/useSocketIO";

const PasswordManagementCard = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const { toast } = useToast();
  const { changePassword } = useSocketIO();

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ 
        title: "Error", 
        description: "Please enter both current and new passwords.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({ 
        title: "Error", 
        description: "New password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsChanging(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        toast({ 
          title: "Success", 
          description: "Password changed successfully." 
        });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        toast({ 
          title: "Error", 
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to change password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button
          variant="secondary"
          className="w-full font-medium"
          style={{ backgroundImage: "var(--gradient-primary)" }}
          onClick={handleChangePassword}
          disabled={isChanging || !currentPassword || !newPassword}
        >
          {isChanging ? "Changing..." : "Change Password"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Make sure you are connected via secure channel.
        </p>
      </CardContent>
    </Card>
  );
};

export default PasswordManagementCard;
