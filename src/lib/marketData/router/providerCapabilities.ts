/**
 * Compatibility re-export — canonical definitions live in state/capabilities.ts.
 * @deprecated Import from state/capabilities or state/index for new code.
 */
export {
  DEFAULT_PROVIDER_CAPABILITIES,
  providerSupports,
  providerSupportsCapability,
  type ProviderCapability,
  type ProviderCapabilityMap,
} from "../state/capabilities";
