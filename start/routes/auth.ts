import Route from '@ioc:Adonis/Core/Route';
export default () => {
  Route.group(() => {
    Route.post('/signup', 'AuthController.signup').as('signup');
    Route.post('/signin', 'AuthController.signin').as('signin');
    Route.get('/refresh', 'AuthController.refresh')
      .as('refresh')
      .middleware('auth');
  }).prefix('auth');
};
