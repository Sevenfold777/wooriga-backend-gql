import { IncomingMessage } from 'http';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const https = require('node:https');

export function putObjectS3(url: string, data: Buffer): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'PUT',
        headers: { 'content-length': data.length },
      },
      (res: IncomingMessage) => {
        let responseBody = '';

        res.on('data', (chunk: Buffer) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          resolve(responseBody);
        });
      },
    );

    req.on('error', (err: Error) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}
