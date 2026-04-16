import { Link } from "react-router-dom";

const SiteFooter = () => {
  return (
    <footer className="border-t border-border bg-background/95 px-4 py-4 text-center text-xs text-muted-foreground">
      <p>Copyright @VELOCITY VORTEX X (VVX) 2026</p>
      <div className="mt-2 flex items-center justify-center gap-4">
        <Link to="/terms-policy" className="transition-colors hover:text-foreground">
          Terms &amp; Policy
        </Link>
        <Link to="/privacy-policy" className="transition-colors hover:text-foreground">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
};

export default SiteFooter;