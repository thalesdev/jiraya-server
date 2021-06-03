import Mail from '@ioc:Adonis/Addons/Mail';
import Database from '@ioc:Adonis/Lucid/Database';
import User from 'App/Models/User';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { schema, rules } from '@ioc:Adonis/Core/Validator';
import { generate } from 'App/util/token';
import { DateTime } from 'luxon';
import PasswordRecovery from 'App/Models/PasswordRecovery';

export default class AuthController {
  public async signup({ request, response }: HttpContextContract) {
    const newUserSchema = schema.create({
      email: schema.string({ trim: true, escape: true }, [rules.email()]),
      password: schema.string({ trim: true }),
      fullname: schema.string(),
      username: schema.string({}, [rules.maxLength(16)]),
    });
    try {
      const { email, username, fullname, password } = await request.validate({
        schema: newUserSchema,
      });
      const emailExist = await User.findBy('email', email);
      const usernameExists = await User.findBy('username', username);
      if (usernameExists || emailExist) {
        response.badRequest({
          error: 'User already exist',
        });
        return;
      }
      return await Database.transaction(async trx => {
        const userData = new User().fill({
          email,
          username,
          password,
          fullname,
          verificationCode: generate(6),
        });
        userData.useTransaction(trx);
        const user = await userData.save();
        await Mail.sendLater(message => {
          message
            .from('support@taliaapp.co')
            .to(user.email)
            .subject('Validate your account!')
            .htmlView('emails/verify', {
              user,
            });
        });

        return user;
      });
    } catch (error) {
      console.log(error);
      response.badRequest(error.messages);
    }
  }

  public async signin({ response, request, auth }: HttpContextContract) {
    const loginSchema = schema.create({
      email: schema.string({ trim: true, escape: true }, [rules.email()]),
      password: schema.string({ trim: true }),
    });

    try {
      const { email, password } = await request.validate({
        schema: loginSchema,
      });
      const accessToken = await auth.use('api').attempt(email, password, {
        expiresIn: '30mins',
        name: 'Acess Token',
      });
      const refreshToken = await auth.use('api').attempt(email, password, {
        expiresIn: '3d',
        name: 'Refresh Token',
      });
      // #Improve: Deletar os tokens antigos
      return { access: accessToken, refresh: refreshToken, user: auth.user };
    } catch (error) {
      response.badRequest(error.messages ?? 'Invalid credentials');
    }
  }

  public async refresh({ response, auth }: HttpContextContract) {
    const user = auth.use('api').user;
    const token = auth.use('api').token;
    if (!user || !token || !token.expiresAt) {
      response.badRequest('Oops! Invalid Request');
      return;
    }
    const accessToken = await auth.use('api').generate(user, {
      expiresIn: '30mins',
      name: 'Access Token',
    });
    const timeToExpirt = DateTime.fromJSDate(
      token.expiresAt as unknown as Date,
    ).diffNow('days').days;
    if (timeToExpirt <= 1) {
      const refreshToken = await auth.use('api').generate(user, {
        expiresIn: '3d',
        name: 'Refresh Token',
      });
      // #Improve: deletar os tokens antigos
      return { access: accessToken, refresh: refreshToken, user: auth.user };
    } else {
      return { access: accessToken, user: auth.user };
    }
  }

  public async verify({ request, response }: HttpContextContract) {
    const code = request.input('code');
    const user = await User.findBy('verificationCode', code);
    if (!user) {
      response.badRequest('Invalid Verification Code');
      return;
    }
    user.verifiedAt = DateTime.now();
    user.verificationCode = null;
    user.save();
  }

  public async recovery({ response, request }: HttpContextContract) {
    const recoverySchema = schema.create({
      code: schema.string({}, [rules.minLength(6), rules.maxLength(6)]),
      password: schema.string({ trim: true }, [rules.confirmed()]),
    });

    try {
      const { password, code } = await request.validate({
        schema: recoverySchema,
      });
      const passwordRecovery = await PasswordRecovery.findBy('code', code);
      if (!passwordRecovery) {
        response.badRequest('Invalid recovery code.');
        return;
      }
      await passwordRecovery.load('user');
      passwordRecovery.user.password = password;
      await passwordRecovery.user.save();
      await passwordRecovery.delete();
    } catch (errors) {
      response.badRequest(errors.messages);
    }
  }

  public async forget({ request, response }: HttpContextContract) {
    const forgetSchema = schema.create({
      email: schema.string({ trim: true, escape: true }, [rules.email()]),
    });
    try {
      const { email } = await request.validate({ schema: forgetSchema });
      const user = await User.findBy('email', email);
      if (!user) {
        response.badRequest("User doesn't exist");
        return;
      }

      const { code } = await user.related('recoveries').create({
        code: generate(6),
      });
      await Mail.sendLater(message => {
        message
          .from('support@taliaapp.co')
          .to(user.email)
          .subject('Recovery you password!')
          .htmlView('emails/forget', {
            code,
            user,
          });
      });
    } catch (errors) {
      console.log(errors);
      response.badRequest(errors.messages);
    }
  }
}
