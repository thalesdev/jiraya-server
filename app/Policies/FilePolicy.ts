import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer';
import User from 'App/Models/User';
import File from 'App/Models/File';

export default class FilePolicy extends BasePolicy {
  public async delete(user: User, file: File) {
    return user.id === file.userId;
  }
}
