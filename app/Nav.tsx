"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import { shortName } from "../lib/format";
import { Avatar, Badge, ButtonLink, Logo } from "./components/ui";

type NavItem = { href: string; label: string; active: (path: string) => boolean };

const isBrowse = (path: string) => path === "/" || path.startsWith("/workshop/");

// The three NavBar variants from Figma: Guest, Member, Admin.
const GUEST: NavItem[] = [{ href: "/", label: "Workshops", active: isBrowse }];
const MEMBER: NavItem[] = [
  { href: "/", label: "Workshops", active: isBrowse },
  { href: "/account", label: "My registrations", active: (p) => p === "/account" },
];
const ADMIN: NavItem[] = [
  { href: "/manage", label: "Workshops", active: (p) => p === "/manage" || isBrowse(p) },
  { href: "/manage/registrations", label: "Registrations", active: (p) => p.startsWith("/manage/registrations") },
  { href: "/manage/users", label: "Users", active: (p) => p.startsWith("/manage/users") },
];

// The log-in and sign-up screens are full-bleed and have no NavBar.
const BARE_ROUTES = ["/login", "/register"];

export function Nav() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  if (BARE_ROUTES.includes(pathname)) return null;

  const items = user?.role === "admin" ? ADMIN : user ? MEMBER : GUEST;

  return (
    <header className="nav">
      <Logo />
      <nav className="nav-links" aria-label="Main">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="nav-link" aria-current={item.active(pathname) ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="nav-actions">
        {loading ? null : user ? (
          <>
            {user.role === "admin" && <Badge status="registered">Admin</Badge>}
            <span className="nav-user">
              <Avatar name={user.name} id={user.id} colour={user.role === "admin" ? "var(--mint)" : "var(--pink)"} />
              <span>{shortName(user.name)}</span>
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <ButtonLink href="/login" variant="secondary">
              Log in
            </ButtonLink>
            <ButtonLink href="/register">Sign up</ButtonLink>
          </>
        )}
      </div>
    </header>
  );
}
