// This layout file is intentionally left simple.
// The root layout (src/app/layout.tsx) already provides the FirebaseClientProvider.
// By keeping this file, we maintain the route group structure for authentication pages.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
