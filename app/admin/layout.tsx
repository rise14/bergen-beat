// Auth protection is handled by middleware.ts — this layout is UI only.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarLinks = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/submissions", label: "Submissions" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/events/new", label: "＋ New Event" },
  ];

  return (
    <div className="flex min-h-screen gap-8">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 border-r border-gray-100 py-8">
        <p className="mb-6 px-4 text-xs font-bold uppercase tracking-widest text-gray-400">
          Admin
        </p>
        <nav className="flex flex-col gap-1">
          {sidebarLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-600"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Page content */}
      <div className="flex-1 py-8">{children}</div>
    </div>
  );
}
