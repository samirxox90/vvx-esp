import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground md:px-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Button variant="ghost" type="button" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>
              VELOCITY VORTEX X (VVX) stores account, tournament, and team activity data needed to run the platform,
              including invites, participation responses, and inbox notifications.
            </p>
            <p>
              We use this data only for esports operations, moderation, and communication. We do not sell personal
              information.
            </p>
            <p>
              Access to sensitive admin actions is restricted, and users can only view or manage data permitted by
              their account access level.
            </p>
            <p>
              If you want data correction or account removal support, contact the team admin through official VVX
              channels.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default PrivacyPolicy;