/** Placeholder image tag for infra-only `docker compose` when app-prod is not started. */
export const COMPOSE_APP_IMAGE_PLACEHOLDER =
  "edge-app:0000000000000000000000000000000000000000";

export function withComposeEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return {
    ...env,
    EDGE_APP_IMAGE: env.EDGE_APP_IMAGE ?? COMPOSE_APP_IMAGE_PLACEHOLDER,
  };
}
