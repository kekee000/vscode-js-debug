/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

export * from './configurationProvider';
import {
  ChromeDebugConfigurationProvider,
  ChromeDebugConfigurationResolver,
} from './chromeDebugConfigurationProvider';
import {
  EdgeDebugConfigurationProvider,
  EdgeDebugConfigurationResolver,
} from './edgeDebugConfigurationProvider';
import { ExtensionHostConfigurationResolver } from './extensionHostConfigurationResolver';
import {
  NodeDynamicDebugConfigurationProvider,
  NodeInitialDebugConfigurationProvider,
} from './nodeDebugConfigurationProvider';
import { NodeConfigurationResolver } from './nodeDebugConfigurationResolver';
import { SwanDebugConfigurationProvider, SwanDebugConfigurationResolver } from './swanDebugConfigurationProvider';
import { TerminalDebugConfigurationResolver } from './terminalDebugConfigurationResolver';

export const allConfigurationResolvers = [
  ChromeDebugConfigurationResolver,
  EdgeDebugConfigurationResolver,
  ExtensionHostConfigurationResolver,
  NodeConfigurationResolver,
  TerminalDebugConfigurationResolver,
  SwanDebugConfigurationResolver,
];

export const allConfigurationProviders = [
  ChromeDebugConfigurationProvider,
  EdgeDebugConfigurationProvider,
  NodeInitialDebugConfigurationProvider,
  NodeDynamicDebugConfigurationProvider,
  SwanDebugConfigurationProvider,
];
