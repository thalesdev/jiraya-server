import aws from 'aws-sdk';
import { PassThrough } from 'stream';
import { ManagedUpload } from 'aws-sdk/clients/s3';

export const S3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const AwsBucket =
  process.env.NODE_ENV === 'production' ? 'taliaapp.co' : 'test.taliaapp.co';

interface UploadStreamProps {
  stream: PassThrough;
  promise: Promise<ManagedUpload.SendData>;
}

export const createUploadStream = (
  key: string,
  options = {},
): UploadStreamProps => {
  const pass = new PassThrough();
  const params = {
    Bucket: AwsBucket,
    Key: key,
    Body: pass,
    ACL: 'public-read',
    ...options,
  };
  return {
    stream: pass,
    promise: S3.upload(params).promise(),
  };
};
