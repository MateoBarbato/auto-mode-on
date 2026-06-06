export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
