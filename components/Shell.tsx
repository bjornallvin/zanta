import Link from "next/link";
import Sky from "./Sky";

interface ShellProps {
  children: React.ReactNode;
  flare?: boolean;
  headerAside?: React.ReactNode; // shown opposite the logo, e.g. the countdown
}

export default function Shell({ children, flare = false, headerAside }: ShellProps) {
  return (
    <>
      <Sky flare={flare} />
      <div className="shell">
        <header className="shell-header">
          <Link href="/" aria-label="Awolve Secret Santa, startsida">
            <img src="/awolve-logo.svg" alt="awolve" />
          </Link>
          {headerAside}
        </header>
        <main className="shell-main">{children}</main>
        <footer className="shell-footer">
          Awolve Secret Santa {new Date().getFullYear()}
        </footer>
      </div>
    </>
  );
}
