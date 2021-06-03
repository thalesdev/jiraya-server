import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class PasswordRecoveries extends BaseSchema {
  protected tableName = 'password_recoveries';

  public async up() {
    this.schema.createTable(this.tableName, table => {
      table.increments('id');
      table.string('code', 6).unique();
      table
        .integer('user_id')
        .unsigned()
        .references('users.id')
        .onDelete('CASCADE');
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
