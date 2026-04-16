import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CSSProperties } from "react";

const Market = () => {
  const navigate = useNavigate();

  return (
    <main
      className="min-h-screen bg-background px-6 py-10 text-foreground md:px-10"
      style={
        {
          "--background": "24 45% 8%",
          "--foreground": "32 75% 92%",
          "--card": "22 42% 14%",
          "--card-foreground": "30 70% 92%",
          "--border": "24 44% 28%",
          "--muted": "24 34% 16%",
          "--muted-foreground": "30 38% 72%",
          "--highlight": "22 76% 52%",
          "--highlight-foreground": "20 50% 10%",
        } as CSSProperties
      }
    >
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Button variant="ghost" type="button" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card className="border-border/80 bg-card/70 shadow-cathedral">
          <CardHeader>
            <div className="inline-flex w-fit items-center rounded-full border border-highlight/40 bg-highlight/20 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-highlight">
              ECD TEXT TAG
            </div>
            <CardTitle className="text-4xl">ELITE CUP ORGANISATION</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm tracking-[0.08em] text-muted-foreground">Market Place</p>
            <div className="rounded border border-border bg-background/60 p-10 text-center">
              <p className="font-display text-5xl text-highlight">Coming Soon</p>
              <p className="mt-3 text-sm text-muted-foreground">Exclusive esports drops and big chances is cooking, stay with uss.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Market;