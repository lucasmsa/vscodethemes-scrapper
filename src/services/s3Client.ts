import { S3 } from '@aws-sdk/client-s3';
import { UploadFileInterface } from '../types/UploadFileInterface';

export class S3Client {
  s3: S3;

  constructor() {
    this.s3 = new S3({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
      region: process.env.AWS_REGION as string,
    });
  }

  async uploadFile({ bucket, key, body }: UploadFileInterface) {
    const params = {
      Bucket: bucket,
      Key: key,
      Body: body,
    };

    return this.s3.putObject(params);
  }
}
