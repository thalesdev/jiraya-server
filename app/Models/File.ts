import { DateTime } from 'luxon';
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm';

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

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
