export interface WebRoute {
  path: string;
  title: string;
}

export function createRouter(): { routes: WebRoute[] } {
  return {
    routes: [
      { path: "/metadata", title: "Metadata" },
      { path: "/catalogs", title: "Catalogs" },
      { path: "/documents", title: "Documents" },
      { path: "/registers", title: "Registers" },
      { path: "/auth", title: "Authentication" }
    ]
  };
}
