import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { schema, rules } from '@ioc:Adonis/Core/Validator';
import { generate } from 'App/util/token';
import { DateTime } from 'luxon';
import Database from '@ioc:Adonis/Lucid/Database';
import User from 'App/Models/User';

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
        //#Improve: chamar os mailers
        return user;
      });
    } catch (error) {
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

  public async refresh({ response, request, auth }: HttpContextContract) {
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

  public async recovery(ctx) {
    // #Improve: Recuperar a senha
  }

  public async forget(ctx) {
    // #Improve: Enviar o email que perdeu a senha
  }
}
