/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { swanideInExtension as swanide } from '@swanide/extension';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Commands } from './contributionUtils';

export interface ProjectConfig {
  smartProgramRoot?: string;
  dependencyRoot?: string;
  dynamicLibRoot?: string;
}

export const isInSwanIDE = () => !!(vscode as any).extensionHostContext;

export function getProjectConfig(folder: vscode.WorkspaceFolder): ProjectConfig {
  try {
    const configPath = path.join(folder.uri.fsPath, 'project.swan.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ProjectConfig;
    return {
      smartProgramRoot: config.smartProgramRoot,
      dependencyRoot: config.dependencyRoot,
      dynamicLibRoot: config.dynamicLibRoot,
    }
  }
  catch {}
  return {};
}

export async function proxyFetchResource(url: string, headers?: Record<string, string>) {
  try {
    const res = await vscode.commands.executeCommand('swanide.proxy-fetch-debug-resource', {url, headers});
    return {
      ok: true,
      statusCode: 200,
      error: null,
      body: res,
    };
  }
  catch (e) {
    console.error('fetch resource error:', (e as Error).message);
    return {
      ok: false,
      statusCode: 403,
      error: e,
    };
  }
}

export function registerDebugSmartProgramCommand(context: vscode.ExtensionContext) {
  // 启动 swan 调试
  context.subscriptions.push(vscode.commands.registerCommand(Commands.DebugSmartProgram, () => {
    vscode.debug.startDebugging(vscode.workspace.workspaceFolders![0], {
      name: '调试小程序代码',
      type: 'pwa-swan',
      request: 'attach'
    });
  }));

  // 启动调试后刷新模拟器
  context.subscriptions.push(vscode.debug.onDidStartDebugSession(e => {
    if (e.type === 'pwa-chrome' && e.name.startsWith('调试小程序') && !e.parentSession) {
      setTimeout(() => {
        swanide.eventService.fire('simulator.refresh');
      }, 1200);
    }
  }));
}