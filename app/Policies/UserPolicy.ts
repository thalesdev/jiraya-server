import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer';
import User from 'App/Models/User';

export default class UserPolicy extends BasePolicy {
  public async confirmed(user: User) {
    return user.verifiedAt !== null;
  }
}
