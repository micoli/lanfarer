import type { FrontendPlugin } from "../../frontend-plugin.ts";
import { useAirportHosts } from "./hooks/useAirport.ts";

export const plugin: FrontendPlugin = {
  type: "airport",
  hostListProvider: useAirportHosts,
};
