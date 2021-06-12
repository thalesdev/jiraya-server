import { DateTime } from 'luxon';
import Hash from '@ioc:Adonis/Core/Hash';
import {
  column,
  beforeSave,
  BaseModel,
  hasMany,
  HasMany,
} from '@ioc:Adonis/Lucid/Orm';
import PasswordRecovery from './PasswordRecovery';
import File from './File';
import RefreshToken from './RefreshToken';

export default class User extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public email: string;

  @column()
  public username: string;

  @column()
  public birthY: number;

  @column()
  public birthM: number;

  @column()
  public birthD: number;

  @column()
  public gender: string;

  @column()
  public fullname: string;

  @column()
  public about: string;

  @column()
  public hometown: string;

  @column()
  public sensitive: boolean;

  @column()
  public maskSensitive: boolean;

  @column({ serializeAs: null })
  public verificationCode: string | null;

  @column({ serializeAs: null })
  public password: string;

  @column()
  public rememberMeToken?: string;

  @column.dateTime({ autoCreate: false })
  public verifiedAt: DateTime | null;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @hasMany(() => PasswordRecovery)
  public recoveries: HasMany<typeof PasswordRecovery>;

  @hasMany(() => RefreshToken)
  public refreshTokens: HasMany<typeof RefreshToken>;

  @hasMany(() => File)
  public files: HasMany<typeof File>;

  @beforeSave()
  public static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password);
    }
  }
}
