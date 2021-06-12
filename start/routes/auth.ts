import Route from '@ioc:Adonis/Core/Route';
export default () => {
  Route.group(() => {
    Route.post('/signup', 'AuthController.signup').as('signup');
    Route.post('/signin', 'AuthController.signin').as('signin');
    Route.post('/refresh', 'AuthController.refresh').as('refresh');
    // .middleware('auth');
    Route.post('/revoke', 'AuthController.revoke')
      .as('revoke')
      .middleware('auth');
    Route.post('/verify', 'AuthController.verify').as('verifyEmail');
    Route.post('/forgot', 'AuthController.forgot').as('forgotPassword');
    Route.post('/recovery', 'AuthController.recovery').as('recoveryPassword');

    Route.post('/social', 'AuthController.social').as('social');
  }).prefix('auth');
};
