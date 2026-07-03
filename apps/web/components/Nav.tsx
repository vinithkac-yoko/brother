import Link from "next/link";

export function Nav() {
  return (
    <nav
      style={{
        display: "flex",
        gap: "1.5rem",
        padding: "1rem",
        borderBottom: "1px solid #ddd",
        alignItems: "center",
      }}
    >
      <strong>Fab ERP</strong>
      <Link href="/">Chat</Link>
      <Link href="/pipeline">Pipeline</Link>
      <Link href="/approvals">Approvals</Link>
    </nav>
  );
}
