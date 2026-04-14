import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Market = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground md:px-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Button variant="ghost" type="button" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card className="bg-card/40">
          <CardHeader>
            <CardTitle className="text-4xl">Market Place</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded border border-border bg-background/40 p-10 text-center">
              <p className="font-display text-5xl text-highlight">Coming Soon</p>
              <p className="mt-3 text-sm text-muted-foreground">Exclusive esports drops and big changes is cooking, stay with uss.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Market;