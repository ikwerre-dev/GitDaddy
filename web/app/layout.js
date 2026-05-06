"use client";

import "./globals.css";
import { useGitDaddy } from "../hooks/useGitDaddy";
import { AuthProvider } from "../contexts/AuthContext";

export default function RootLayout({ children }) {
  const state = useGitDaddy();

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>GitDaddy - Self-hosted Git Platform</title>
        <meta name="description" content="Open-source distributed Git hosting with GitHub-like interface" />
      </head>
      <body className="antialiased">
        <AuthProvider state={state}>{children}</AuthProvider>
      </body>
    </html>
  );
}
