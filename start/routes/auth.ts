import Route from '@ioc:Adonis/Core/Route';
export default () => {
  Route.group(() => {
    Route.post('/signup', 'AuthController.signup').as('signup');
    Route.post('/signin', 'AuthController.signin').as('signin');
    Route.get('/refresh', 'AuthController.refresh')
      .as('refresh')
      .middleware('auth');
    Route.post('/verify', 'AuthController.verify').as('verifyEmail');
    Route.post('/forget', 'AuthController.forget').as('forgetPassword');
    Route.post('/recovery', 'AuthController.recovery').as('recoveryPassword');
  }).prefix('auth');
};
