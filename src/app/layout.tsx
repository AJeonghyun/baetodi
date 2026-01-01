import "./global.css";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Baetodi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
