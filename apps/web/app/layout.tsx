import type { ReactNode } from "react";
import { Nav } from "../components/Nav";

export const metadata = {
  title: "Fab ERP",
  description: "Agent-native ERP for custom metal fabrication",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
