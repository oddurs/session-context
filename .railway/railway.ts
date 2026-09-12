import { defineRailway, project, service } from "railway/iac";

/**
 * Infrastructure for the hosted deployment.
 *
 * The start command runs the custom Node server rather than `next start`: the
 * page reports connection-level facts, such as raw header order, that only a
 * real server can see. The health check points at the static methods page,
 * which is cheap to render and does not touch any per-visitor collection.
 */
export default defineRailway(() => {
  const web = service("session-context", {
    build: "npm run build",
    start: "NODE_ENV=production node server.mjs",
    healthcheck: "/methods",
    healthcheckTimeout: 30,
  });

  return project("session-context", { resources: [web] });
});
