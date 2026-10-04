export type Route = {
  screen: "home" | "room" | "board" | "host" | "test" | "gallery";
  code: string;
};
export function readRoute(): Route {
  const [screen, code = ""] = location.hash.replace(/^#\/?/, "").split("/");
  if (["room", "board", "host", "test", "gallery"].includes(screen))
    return { screen: screen as Route["screen"], code: code.toUpperCase() };
  return { screen: "home", code: "" };
}
export function navigate(screen: Route["screen"], code = "") {
  location.hash = `/${screen === "home" ? "" : screen}${code ? `/${code}` : ""}`;
}
