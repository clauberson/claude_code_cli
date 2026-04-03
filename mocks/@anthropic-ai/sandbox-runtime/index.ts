export class SandboxManager {
  initialize = async () => {};
  isSupportedPlatform = () => true;
  isPlatformInEnabledList = () => true;
  getSandboxUnavailableReason = () => undefined;
  isSandboxingEnabled = () => false;
  isSandboxEnabledInSettings = () => false;
  checkDependencies = async () => ({ isAvailable: true, dependencies: [] });
  isAutoAllowBashIfSandboxedEnabled = () => false;
  areUnsandboxedCommandsAllowed = () => true;
  isSandboxRequired = () => false;
  areSandboxSettingsLockedByPolicy = () => false;
  setSandboxSettings = () => {};
  getFsReadConfig = () => ({});
  getFsWriteConfig = () => ({});
  getNetworkRestrictionConfig = () => ({});
  getAllowUnixSockets = () => false;
  getAllowLocalBinding = () => false;
  getIgnoreViolations = () => false;
  getEnableWeakerNestedSandbox = () => false;
  getExcludedCommands = () => [];
  getProxyPort = () => undefined;
  getSocksProxyPort = () => undefined;
  getLinuxHttpSocketPath = () => undefined;
  getLinuxSocksSocketPath = () => undefined;
  waitForNetworkInitialization = async () => {};
  wrapWithSandbox = (command: string) => command;
  cleanupAfterCommand = () => {};
  getSandboxViolationStore = () => new SandboxViolationStore();
  annotateStderrWithSandboxFailures = (_: any, stderr: string) => stderr;
  getLinuxGlobPatternWarnings = () => [];
  refreshConfig = () => {};
  reset = () => {};
}

export const SandboxRuntimeConfigSchema = {
  parse: (data: any) => data,
  safeParse: (data: any) => ({ success: true, data }),
};

export class SandboxViolationStore {
  getViolations = () => [];
  clear = () => {};
}

export type FsReadRestrictionConfig = any;
export type FsWriteRestrictionConfig = any;
export type IgnoreViolationsConfig = any;
export type NetworkHostPattern = any;
export type NetworkRestrictionConfig = any;
export type SandboxAskCallback = any;
export type SandboxDependencyCheck = any;
export type SandboxRuntimeConfig = any;
export type SandboxViolationEvent = any;
