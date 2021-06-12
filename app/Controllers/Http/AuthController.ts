import Mail from '@ioc:Adonis/Addons/Mail';
import Database from '@ioc:Adonis/Lucid/Database';
import User from 'App/Models/User';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { schema, rules } from '@ioc:Adonis/Core/Validator';
import { generate } from 'App/util/token';
import { v4 as uuid } from 'uuid';
import { DateTime } from 'luxon';
import PasswordRecovery from 'App/Models/PasswordRecovery';
import RefreshToken from 'App/Models/RefreshToken';

const refreshTokenExpiresTime = () =>
  DateTime.fromSeconds(DateTime.now().toSeconds() + 60 * 60 * 24 * 7); // 7 days

const accessTokenExpiresTime = '1min';

export default class AuthController {
  public async signup({ request, response, auth }: HttpContextContract) {
    const newUserSchema = schema.create({
      email: schema.string({ trim: true, escape: true }, [rules.email()]),
      password: schema.string({ trim: true }),
      fullname: schema.string(),
      username: schema.string({}, [rules.maxLength(16)]),
      device: schema.string.optional(),
    });
    try {
      const { email, username, fullname, password, device } =
        await request.validate({
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
      const user = await Database.transaction(async trx => {
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

      // gerar os tokens
      const access = await auth.use('api').generate(user, {
        expiresIn: accessTokenExpiresTime,
        name: 'Access Token',
      });

      const refresh = await user?.related('refreshTokens').create({
        token: uuid(),
        name: device,
        expiresAt: refreshTokenExpiresTime(),
      });

      return { access, refresh, user };
    } catch (error) {
      console.log(error);
      response.badRequest(error.messages);
    }
  }

  public async signin({ response, request, auth }: HttpContextContract) {
    const { 'user-agent': device } = request.headers();

    const loginSchema = schema.create({
      email: schema.string({ trim: true, escape: true }, [rules.email()]),
      password: schema.string({ trim: true }),
    });

    try {
      const { email, password } = await request.validate({
        schema: loginSchema,
      });
      const accessToken = await auth.use('api').attempt(email, password, {
        expiresIn: accessTokenExpiresTime,
        name: 'Acess Token',
      });
      const refreshToken = await auth.user?.related('refreshTokens').create({
        token: uuid(),
        name: device,
        expiresAt: refreshTokenExpiresTime(),
      });

      // tokens for delete
      await Database.query()
        .from('api_tokens')
        .where('expires_at', '<=', DateTime.now().toISO())
        .delete();

      return { access: accessToken, refresh: refreshToken, user: auth.user };
    } catch (error) {
      response.badRequest(error.messages ?? 'Invalid credentials');
    }
  }

  public async refresh({ request, response, auth }: HttpContextContract) {
    const token = request.input('token');
    if (!token) {
      return response.badRequest('You did not provided refresh token');
    }
    const refreshToken = await RefreshToken.findBy('token', token);
    if (!refreshToken) {
      return response.unauthorized('Token invalid');
    }
    await refreshToken.load('user');
    const user = refreshToken.user;
    const accessToken = await auth.use('api').generate(user, {
      expiresIn: accessTokenExpiresTime,
      name: 'Access Token',
    });

    const newRefreshToken = await refreshToken
      .merge({
        token: uuid(),
        expiresAt: refreshTokenExpiresTime(),
      })
      .save();

    return { access: accessToken, refresh: newRefreshToken, user };
  }

  public async revoke({ auth, request, response }: HttpContextContract) {
    const user = auth.user;
    await user?.load('refreshTokens');
    const revokeSchema = schema.create({
      token: schema.string({}, [rules.uuid()]),
    });
    try {
      const { token } = await request.validate({ schema: revokeSchema });
      const refreshToken = user?.refreshTokens.find(
        refresh => refresh.token === token,
      );
      if (!refreshToken || !user)
        return response.badRequest('Oops Bad Request!');

      await refreshToken.delete();
      await auth.logout();
      await Database.query()
        .from('api_tokens')
        .where('user_id', '=', user.id)
        .delete();
    } catch (errors) {
      return response.badRequest(errors.messages ?? 'Oops! Bad request');
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

  public async recovery({ response, request, bouncer }: HttpContextContract) {
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
      try {
        await bouncer
          .forUser(passwordRecovery.user)
          .with('UserPolicy')
          .authorize('confirmed');
      } catch {
        response.badRequest(
          'You must first confirm your email, then retrieve your password',
        );
        return;
      }

      passwordRecovery.user.password = password;
      await passwordRecovery.user.save();
      await passwordRecovery.delete();
    } catch (errors) {
      response.badRequest(errors.messages);
    }
  }

  public async forgot({ request, response, bouncer }: HttpContextContract) {
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

      try {
        await bouncer.forUser(user).with('UserPolicy').authorize('confirmed');
      } catch {
        response.badRequest(
          'You must first confirm your email, then retrieve your password',
        );
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
      response.badRequest(errors.messages ?? 'Bad Request');
    }
  }

  public async social({ response, request, ally, auth }: HttpContextContract) {
    const socialSchema = schema.create({
      provider: schema.enum(['github']),
      email: schema.string({}, [rules.email()]),
      name: schema.string({}),
      image: schema.string.optional(),
      accessToken: schema.string(),
      device: schema.string(),
    });
    try {
      const { provider, email, name, accessToken, device } =
        await request.validate({
          schema: socialSchema,
        });
      const userSocial = await ally.use(provider).userFromToken(accessToken);

      if (!userSocial) {
        return response.badRequest({
          code: 'auth.social.invalidAcessToken',
          message: 'Código de acesso invalido.',
        });
      }
      if (userSocial.email !== email) {
        return response.badRequest({
          code: 'auth.social.unauthorizedAcessToken',
          email: 'Token não autorizado',
        });
      }
      let user = await User.findBy('email', email);
      if (!user) {
        user = await User.create({
          email,
          fullname: name,
          username: generate(16), // melhorar essa parte
          password: 'batata', // mudar pra permitir password nulos e setar uma propriedade chamada third-party auth
          verifiedAt:
            userSocial.emailVerificationState === 'verified'
              ? DateTime.now()
              : null,
        });
      }

      const access = await auth.use('api').generate(user, {
        expiresIn: accessTokenExpiresTime,
        name: 'Access Token',
      });

      const refresh = await user?.related('refreshTokens').create({
        token: uuid(),
        name: device,
        expiresAt: refreshTokenExpiresTime(),
      });

      return { access, refresh };
    } catch (errors) {
      return {
        error: 'Provider Invalido',
        code: 'social.provider.invalid',
        errors: errors.messages,
      };
    }
  }
}
