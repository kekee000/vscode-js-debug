/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { tmpdir } from 'os';
import * as vscode from 'vscode';
import {
  allDebugTypes,
  Commands,
  DebugType,
  preferredDebugTypes,
  registerCommand
} from './common/contributionUtils';
import { registerDebugSmartProgramCommand } from './common/swanide';
import { extensionId } from './configuration';
import { createGlobalContainer } from './ioc';
import { IExtensionContribution } from './ioc-extras';
import { DelegateLauncherFactory } from './targets/delegate/delegateLauncherFactory';
import { registerAutoAttach } from './ui/autoAttach';
import { registerCompanionBrowserLaunch } from './ui/companionBrowserLaunch';
import { IDebugConfigurationProvider, IDebugConfigurationResolver } from './ui/configuration';
import { registerCustomBreakpointsUI } from './ui/customBreakpointsUI';
import { debugNpmScript } from './ui/debugNpmScript';
import { DebugSessionTracker } from './ui/debugSessionTracker';
import { registerDebugTerminalUI } from './ui/debugTerminalUI';
import { attachProcess, pickProcess } from './ui/processPicker';
import { registerProfilingCommand } from './ui/profiling';
import { registerRequestCDPProxy } from './ui/requestCDPProxy';
import { registerRevealPage } from './ui/revealPage';
import { TerminalLinkHandler } from './ui/terminalLinkHandler';
import { toggleSkippingFile } from './ui/toggleSkippingFile';
import { VSCodeSessionManager } from './ui/vsCodeSessionManager';

export function activate(context: vscode.ExtensionContext) {
  const services = createGlobalContainer({
    // On Windows, use the os.tmpdir() since the extension storage path is too long. See:
    // https://github.com/microsoft/vscode-js-debug/issues/342
    storagePath:
      process.platform === 'win32' ? tmpdir() : context.storagePath || context.extensionPath,
    isVsCode: true,
    isRemote:
      !!process.env.JS_DEBUG_USE_COMPANION ||
      vscode.extensions.getExtension(extensionId)?.extensionKind === vscode.ExtensionKind.Workspace,
    context,
  });

  context.subscriptions.push(
    registerCommand(vscode.commands, Commands.DebugNpmScript, debugNpmScript),
    registerCommand(vscode.commands, Commands.PickProcess, pickProcess),
    registerCommand(vscode.commands, Commands.AttachProcess, attachProcess),
    registerCommand(vscode.commands, Commands.ToggleSkipping, toggleSkippingFile),
  );

  const debugResolvers = services.getAll<IDebugConfigurationResolver>(IDebugConfigurationResolver);
  for (const resolver of debugResolvers) {
    const cast = resolver as vscode.DebugConfigurationProvider;
    context.subscriptions.push(
      vscode.debug.registerDebugConfigurationProvider(resolver.type, cast),
    );

    const preferred = preferredDebugTypes.get(resolver.type as DebugType);
    if (preferred) {
      context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider(preferred, cast));
    }
  }

  const debugProviders = services.getAll<IDebugConfigurationProvider>(IDebugConfigurationProvider);
  for (const provider of debugProviders) {
    vscode.debug.registerDebugConfigurationProvider(
      provider.type,
      provider as vscode.DebugConfigurationProvider,
      vscode.DebugConfigurationProviderTriggerKind !== undefined ? provider.triggerKind : undefined,
    );
  }

  const sessionManager = new VSCodeSessionManager(services);
  context.subscriptions.push(
    ...[...allDebugTypes].map(type =>
      vscode.debug.registerDebugAdapterDescriptorFactory(type, sessionManager),
    ),
  );
  context.subscriptions.push(
    vscode.debug.onDidTerminateDebugSession(s => sessionManager.terminate(s)),
  );
  context.subscriptions.push(sessionManager);

  const debugSessionTracker = services.get(DebugSessionTracker);
  debugSessionTracker.attach();

  registerCompanionBrowserLaunch(context);
  registerCustomBreakpointsUI(context, debugSessionTracker);
  registerDebugTerminalUI(
    context,
    services.get(DelegateLauncherFactory),
    services.get(TerminalLinkHandler),
    services,
  );
  registerProfilingCommand(context, services);
  registerAutoAttach(context, services.get(DelegateLauncherFactory), services);
  registerRevealPage(context, debugSessionTracker);
  registerRequestCDPProxy(context, debugSessionTracker);
  services.getAll<IExtensionContribution>(IExtensionContribution).forEach(c => c.register(context));
  registerDebugSmartProgramCommand(context);
}

export function deactivate() {
  // nothing to do, yet...
}
