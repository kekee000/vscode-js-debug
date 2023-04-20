/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import type { CancellationToken } from 'vscode';
import WebSocket from 'ws';
import { CancellationTokenSource, timeoutPromise } from '../common/cancellation';
import { EventEmitter } from '../common/events';
import { HrTime } from '../common/hrnow';
import { isLoopback } from '../common/urlUtils';
import { ITransport } from './transport';

export class WebSocketTransport implements ITransport {
  private _ws: WebSocket | undefined;
  private readonly messageEmitter = new EventEmitter<[string, HrTime]>();
  private readonly endEmitter = new EventEmitter<void>();

  public readonly onMessage = this.messageEmitter.event;
  public readonly onEnd = this.endEmitter.event;

  /**
   * Creates a WebSocket transport by connecting to the given URL.
   */
  static async create(
    url: string,
    cancellationToken: CancellationToken,
  ): Promise<WebSocketTransport> {
    const isSecure = !url.startsWith('ws://');
    const targetAddressIsLoopback = await isLoopback(url);

    while (true) {
      try {
        const options = {
          headers: { host: 'localhost' },
          perMessageDeflate: false,
          maxPayload: 256 * 1024 * 1024, // 256Mb
          rejectUnauthorized: !(isSecure && targetAddressIsLoopback),
          followRedirects: true,
        };

        const ws = new WebSocket(url, [], options);
        return await timeoutPromise(
          new Promise<WebSocketTransport>((resolve, reject) => {
            ws.addEventListener('open', () => resolve(new WebSocketTransport(ws)));
            ws.addEventListener('error', errorEvent => {
              // Check for invalid http redirects for compatibility with old cdp proxies
              const redirectUrl = url === ws.url ? url : ws.url.replace(/^http(s?):/, 'ws$1:');

              if (redirectUrl === url) {
                reject(errorEvent.error); // Parameter is an ErrorEvent. See https://github.com/websockets/ws/blob/master/doc/ws.md#websocketonerror
                return;
              }

              this.create(redirectUrl, cancellationToken).then(resolve, reject);
            });
          }),
          CancellationTokenSource.withTimeout(2000, cancellationToken).token,
          `Could not open ${url}`,
        ).catch(err => {
          ws.close();
          throw err;
        });
      } catch (err) {
        if (cancellationToken.isCancellationRequested) {
          throw err;
        }
      }
    }
  }

  constructor(ws: WebSocket) {
    this._ws = ws;
    this._ws.addEventListener('message', event => {
      const data = event.data.toString('utf-8');
      console.log(data);
      this.messageEmitter.fire([data, new HrTime()]);
    });
    this._ws.addEventListener('close', () => {
      this.endEmitter.fire();
      this._ws = undefined;
    });
    this._ws.addEventListener('error', () => {
      // Silently ignore all errors - we don't know what to do with them.
    });
  }

  /**
   * @inheritdoc
   */
  send(message: string) {
    console.log(message);
    this._ws?.send(message);
  }

  /**
   * @inheritdoc
   */
  dispose() {
    return new Promise<void>(resolve => {
      if (!this._ws) {
        return resolve();
      }

      this._ws.addEventListener('close', () => resolve());
      this._ws.close();
    });
  }
}
