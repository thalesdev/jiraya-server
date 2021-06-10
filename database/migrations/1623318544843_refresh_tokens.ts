import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class RefreshTokens extends BaseSchema {
  protected tableName = 'refresh_tokens';

  public async up() {
    this.schema.createTable(this.tableName, table => {
      table.increments('id');
      table
        .integer('user_id')
        .unsigned()
        .references('users.id')
        .onDelete('CASCADE');
      table.string('token').unique();
      table.string('name').nullable();

      /**
       * Uses timestampz for PostgreSQL and DATETIME2 for MSSQL
       */

      table.timestamp('expires_at', { useTz: true });
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
