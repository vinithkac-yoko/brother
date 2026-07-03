import type { ReactNode } from "react";

export const metadata = {
  title: "Fab ERP",
  description: "Agent-native ERP for custom metal fabrication",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
