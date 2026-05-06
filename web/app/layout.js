import "./globals.css";

export const metadata = {
  title: "GitDaddy",
  description: "Open-source distributed Git hosting",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
