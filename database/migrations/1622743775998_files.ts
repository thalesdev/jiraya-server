import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Files extends BaseSchema {
  protected tableName = 'files';

  public async up() {
    this.schema.createTable(this.tableName, table => {
      table.increments('id');
      table
        .integer('user_id')
        .unsigned()
        .references('users.id')
        .onDelete('CASCADE');
      table.string('key');
      table.string('location');
      table.string('content_type');
      table.integer('size');
      table.string('original_name');
      table.string('mime_type');

      /**
       * Uses timestampz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
