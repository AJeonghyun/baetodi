import Link from "next/link";
import "./global.css";
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
      <body>{children}</body>
    </html>
  );
}
