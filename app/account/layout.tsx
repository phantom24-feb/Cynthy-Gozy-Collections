import { Suspense } from "react";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">Loading...</div>
      }
    >
      {children}
    </Suspense>
  );
}
