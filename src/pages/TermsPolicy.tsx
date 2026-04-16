import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TermsPolicy = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground md:px-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Button variant="ghost" type="button" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-3xl">Terms &amp; Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>
              By using VELOCITY VORTEX X (VVX), you agree to follow team rules, fair-play standards, and respectful
              communication across all features.
            </p>
            <p>
              Accounts, tournament participation, and inbox notifications are provided for esports operations. Abuse,
              spam, impersonation, and harassment may result in access restriction.
            </p>
            <p>
              Admin decisions for moderation, participation eligibility, and roster updates are final to protect team
              integrity and tournament readiness.
            </p>
            <p>
              These terms may be updated when competitive, operational, or legal requirements change. Continued use
              means you accept the latest version.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default TermsPolicy;