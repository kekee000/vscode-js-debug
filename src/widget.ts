/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
import { swanideInWidget as swanide } from '@swanide/extension';

interface FetchOption {
  url: string;
  headers: Record<string, string>;
}

export function activate() {
  swanide.registerCommand('swanide.proxy-fetch-debug-resource', async ({url, headers}: FetchOption) => {
    const res = await window.fetch(url, {headers});
    return res.text();
  });
}