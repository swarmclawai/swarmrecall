import { SwarmRecallClient } from "@swarmrecall/sdk";
import { resolveClientOptions } from "@swarmrecall/shared/config";

/**
 * Build a SwarmRecallClient from the environment / config file. Throws
 * MissingApiKeyError (from @swarmrecall/shared) when no API key is available.
 */
export function buildDefaultClient(): SwarmRecallClient {
  return new SwarmRecallClient(resolveClientOptions());
}
