import { S3Service } from '../s3.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { S3Directory } from '../constants/s3-directory.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const https = require('node:https');

jest.mock('src/auth/auth.service');
jest.mock('@nestjs/jwt');

describe('s3 service test', () => {
  let s3Service: S3Service;
  let mockAuthService: jest.Mocked<AuthService>;

  let presigendUrl: string;

  beforeAll(async () => {
    const mockJwtService = new JwtService() as jest.Mocked<JwtService>;
    mockAuthService = new AuthService(
      mockJwtService,
    ) as jest.Mocked<AuthService>;

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: '.env.dev.local' })],
      providers: [
        S3Service,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    s3Service = module.get<S3Service>(S3Service);
  });

  it('get presigned url', async () => {
    // given
    const encryptedUserId = 'encryptedUserId';
    const encryptedFileName = 'encryptedFileName';
    const testDir = S3Directory.PHOTO;

    mockAuthService.encrypt
      .mockResolvedValueOnce('encryptedUserId')
      .mockResolvedValueOnce('encryptedFileName');

    // when
    const { result, error, url } = await s3Service.getPresignedUrl({
      userId: 1,
      dir: testDir,
      fileId: 1,
      expiresIn: 60 * 5,
    });
    presigendUrl = url;

    const endpoint = presigendUrl
      .replace(/^(https?:\/\/[^\/]+\.com\/)/, '')
      .split('?')[0];

    // then
    expect(result).toBe(true);
    expect(error).toBeUndefined();
    expect(endpoint).toBe(
      `${testDir}/${encryptedUserId}/${encryptedFileName}.jpeg`,
    );
  });

  it('s3 put object test', async () => {
    // given
    const testData = 'test data to upload to S3.';

    // when
    await putObjectS3(presigendUrl, testData);

    // then
    const targetUrl = presigendUrl.split('?')[0];
    const { data: uploadedValue } = await axios.get(targetUrl);

    expect(uploadedValue).toBe(testData);
  });

  it('delete file', async () => {
    // given
    const targetUrl = presigendUrl.split('?')[0];

    // when
    const { result, error } = await s3Service.deleteFile(targetUrl);

    // then
    expect(result).toBe(true);
    expect(error).toBeUndefined();

    axios.get(targetUrl).catch((err) => {
      expect(err.response.status).toBe(403);
    });
  });

  it('presigned url expired', async () => {
    // given
    const expiresIn = 0; // 단위: 초

    const encryptedUserId = 'encryptedUserId';
    const encryptedFileName = 'encryptedFileName';
    const testDir = S3Directory.PHOTO;

    mockAuthService.encrypt
      .mockResolvedValueOnce('encryptedUserId')
      .mockResolvedValueOnce('encryptedFileName');

    const { result, error, url } = await s3Service.getPresignedUrl({
      userId: 1,
      dir: testDir,
      fileId: 1,
      expiresIn,
    });

    const presigendUrlToBeExpired = url;

    const endpoint = presigendUrl
      .replace(/^(https?:\/\/[^\/]+\.com\/)/, '')
      .split('?')[0];

    expect(result).toBe(true);
    expect(error).toBeUndefined();
    expect(endpoint).toBe(
      `${testDir}/${encryptedUserId}/${encryptedFileName}.jpeg`,
    );

    // when
    const testData = 'test data to upload to S3.';
    const res = await putObjectS3(presigendUrlToBeExpired, testData);

    // then
    expect(String(res).includes('AccessDenied')).toBe(true);
    expect(String(res).includes('Request has expired')).toBe(true);
  });
});

function putObjectS3(url: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'PUT',
        headers: { 'content-length': new Blob([data]).size },
      },
      (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          resolve(responseBody);
        });
      },
    );

    req.on('error', (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}
