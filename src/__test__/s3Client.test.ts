import { S3 } from '@aws-sdk/client-s3';
import { S3Client } from '../services/s3Client';

describe('S3 Client', () => {
  const mockPutObject = jest.fn();

  beforeEach(() => {
    S3.prototype.putObject = mockPutObject;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call putObject with the correct parameters', async () => {
    const s3Client = new S3Client();

    const putObjectParameters = {
      bucket: 'test-bucket',
      key: 'test-key',
      body: Buffer.from('test-body'),
    };

    await s3Client.uploadFile(putObjectParameters);

    expect(mockPutObject).toHaveBeenCalledTimes(1);
    expect(mockPutObject).toHaveBeenCalledWith({
      Bucket: putObjectParameters.bucket,
      Key: putObjectParameters.key,
      Body: putObjectParameters.body,
    });
  });
});
