import Route from '@ioc:Adonis/Core/Route';
export default () => {
  Route.group(() => {
    Route.post('/upload', 'FilesController.upload').as('upload');
    Route.post('/external', 'FilesController.external').as('external');
    // Route.post('/signin', 'AuthController.signin').as('signin');
    // Route.get('/refresh', 'AuthController.refresh')
    //   .as('refresh')
    //   .middleware('auth');
    // Route.post('/verify', 'AuthController.verify').as('verifyEmail');
    // Route.post('/forget', 'AuthController.forget').as('forgetPassword');
    // Route.post('/recovery', 'AuthController.recovery').as('recoveryPassword');
  })
    .prefix('file')
    .middleware('auth');
};
