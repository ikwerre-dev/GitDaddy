import "./globals.css";

export const metadata = {
  title: "GitDaddy - Self-hosted Git Platform",
  description: "Open-source distributed Git hosting with GitHub-like interface",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
