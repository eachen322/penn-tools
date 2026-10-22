// The cookies that remember how the user left the site sidebar. The root layout
// reads them so the server renders the sidebar that way; SiteSidebar.tsx writes
// them. Kept apart from that client module so the layout can import the names.

/** "closed" when the user hid the sidebar on desktop. */
export const SIDEBAR_COOKIE = "penntools_sidebar";

/** The IDs of the sections the user collapsed, separated by dots (commas aren't allowed in cookies). */
export const SECTIONS_COOKIE = "penntools_sidebar_collapsed";
