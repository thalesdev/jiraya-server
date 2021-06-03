import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, BelongsTo } from '@ioc:Adonis/Lucid/Orm';
import User from './User';

export default class PasswordRecovery extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  public id: number;

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime;

  @column()
  public code: string;

  @belongsTo(() => User, { serializeAs: null })
  public user: BelongsTo<typeof User>;

  @column({ serializeAs: null })
  public userId: number;

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime;
}
