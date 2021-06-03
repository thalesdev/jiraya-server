import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class UsersSchema extends BaseSchema {
  protected tableName = 'users';

  public async up() {
    this.schema.createTable(this.tableName, table => {
      table.increments('id').primary();
      table.string('email', 255).notNullable().unique();
      table.string('username', 16).unique().notNullable();
      table.integer('birth_y').nullable();
      table.integer('birth_m').nullable();
      table.integer('birth_d').nullable();
      table.string('gender').nullable();
      table.string('fullname', 50).notNullable();
      table.string('verification_code', 6).nullable().unique();
      table.text('about').nullable();
      table.string('hometown').nullable();
      table.string('password', 180).notNullable();
      table.string('remember_me_token').nullable();
      table.boolean('sensitive').nullable().defaultTo(false);
      table.boolean('mask_sensitive').nullable().defaultTo(true);

      /**
       * Uses timestampz for PostgreSQL and DATETIME2 for MSSQL
       */
      table
        .timestamp('verified_at', { useTz: true })
        .nullable()
        .defaultTo(null);
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
