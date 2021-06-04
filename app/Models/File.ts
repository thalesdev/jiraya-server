import { DateTime } from 'luxon';
import {
  BaseModel,
  column,
  beforeDelete,
  belongsTo,
  BelongsTo,
  hasOne,
} from '@ioc:Adonis/Lucid/Orm';
import { AwsBucket, S3 } from 'App/Services/s3';
import User from './User';

export default class File extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public key: string;

  @column()
  public location: string;

  @column()
  public contentType: string;

  @column()
  public size: number;

  @column()
  public originalName: string;

  @column()
  public mimeType: string;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column()
  public userId: number;

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @beforeDelete()
  public static async handleRemoveInS3(file: File) {
    const { key: Key } = file;
    await S3.deleteObject({
      Bucket: AwsBucket,
      Key,
    }).promise();
  }
}
