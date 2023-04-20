/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { swanideInExtension as swanide } from '@swanide/extension';
import { injectable } from 'inversify';
import * as vscode from 'vscode';
import { DebugType } from '../../common/contributionUtils';
import { isInSwanIDE } from '../../common/swanide';
import {
  AnyChromeConfiguration,
  IChromeAttachConfiguration,
  ISwanAttachConfiguration,
  ResolvingChromeConfiguration
} from '../../configuration';
import { BaseConfigurationProvider } from './baseConfigurationProvider';
import {
  ChromiumDebugConfigurationResolver
} from './chromiumDebugConfigurationProvider';

/**
 * Configuration provider for swan debugging.
 */
@injectable()
export class SwanDebugConfigurationResolver
  extends ChromiumDebugConfigurationResolver<AnyChromeConfiguration>
  implements vscode.DebugConfigurationProvider
{
  /**
   * @override
   */
  protected async resolveDebugConfigurationAsync(
    folder: vscode.WorkspaceFolder | undefined,
    config: ResolvingChromeConfiguration,
  ): Promise<IChromeAttachConfiguration | null | undefined> {
    if (!config.name && !config.type && !(config as ISwanAttachConfiguration).request) {
      const fromContext = new SwanDebugConfigurationProvider().getDefaultLaunch();
      if (!fromContext) {
        // Return null so it will create a launch.json and fall back on
        // provideDebugConfigurations - better to point the user towards
        // the config than try to work automagically for complex scenarios.
        return null;
      }

      config = fromContext;
    }

    const newConfig = ((config as ISwanAttachConfiguration).debugTarget === 'renderer'
      ? {
          name: '调试小程序模板代码',
          type: 'chrome',
          request: 'attach',
          urlFilter: '*/slaves/slaves.html?*',
          sourceMaps: true,
          perScriptSourcemaps: 'no',
          sourceMapPathOverrides: {
            "webpack:////*": "/*",
            "webpack:///([a-z]):/(.+)": "$1:/$2",
            "swan-source:///*": "${workspaceFolder}/*",
          },
          timeout: 10000,
          skipFiles: [
              '${workspaceFolder}/**/*.js',
              '<node_internals>/**/*.js',
              '**/app.asar/**/*.js',
          ]
        }
      : {
        ...config,
        type: DebugType.Chrome,
        request: 'attach',
        name: '调试小程序代码',
        urlFilter: '*/worker-container.html?*',
        sourceMaps: true,
        perScriptSourcemaps: 'no',
        sourceMapPathOverrides: {
          "webpack:////*": "/*",
          "webpack:///([a-z]):/(.+)": "$1:/$2",
          "swan-source:///*": "${workspaceFolder}/*",
        },
        timeout: 10000,
        skipFiles: [
            '${workspaceFolder}/node_modules/**/*.js',
            '<node_internals>/**/*.js',
            '**/app.asar/**/*.js',
        ]
      }) as IChromeAttachConfiguration;
    await this.resolveBrowserCommon(folder, newConfig);
    if (isInSwanIDE()) {
      if ((!newConfig.address || !config.port)) {
        const debugHost = await swanide.getEnvironment<string>('app.remoteDebuggerHost');
        if (!debugHost) {
          throw new Error('no debug host connected');
        }
        const {hostname, port} = new URL(debugHost);
        newConfig.address = hostname;
        newConfig.port = +port;
      }
    }

    return newConfig;
  }

  protected getType() {
    return DebugType.Swan as const;
  }
}

@injectable()
export class SwanDebugConfigurationProvider extends BaseConfigurationProvider<ISwanAttachConfiguration> {

  protected provide() {
    return this.getDefaultLaunch();
  }

  protected getTriggerKind() {
    return vscode.DebugConfigurationProviderTriggerKind.Initial;
  }

  public getDefaultLaunch() {
    return {
      type: this.getType(),
      request: 'attach',
      name: '调试小程序代码',
    } as ISwanAttachConfiguration;
  }

  protected getType() {
    return DebugType.Swan as const;
  }
}
