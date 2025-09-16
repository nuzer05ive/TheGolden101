export const metadata = { title: 'SP1RL Viewer', description: '100-seat ring — 89-core + 11 wobble — Möbius rotation' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
