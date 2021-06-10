import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, BelongsTo } from '@ioc:Adonis/Lucid/Orm';
import User from './User';

export default class RefreshToken extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column()
  public userId: number;

  @column()
  public name: string;

  @column()
  public token: string;

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  public expiresAt: DateTime;
}
