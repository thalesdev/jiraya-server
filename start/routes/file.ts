import Route from '@ioc:Adonis/Core/Route';
export default () => {
  Route.group(() => {
    Route.post('/upload', 'FilesController.upload').as('upload');
    Route.post('/external', 'FilesController.external').as('external');
    Route.delete('/:id', 'FilesController.destroy').as('destroyFile');
  })
    .prefix('file')
    .middleware('auth');
};
