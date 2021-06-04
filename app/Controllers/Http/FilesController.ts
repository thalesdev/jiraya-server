import fs from 'fs';
import { extname } from 'path';
import Database from '@ioc:Adonis/Lucid/Database';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { v4 as uuid } from 'uuid';
import { extension, lookup } from 'mime-types';
import { URL } from 'url';
import { schema, rules } from '@ioc:Adonis/Core/Validator';
import { AwsBucket, createUploadStream, S3 } from 'App/Services/s3';
import axios from 'axios';
import File from 'App/Models/File';

export default class FilesController {
  private maxSize: number = 1024 * 1024 * 5; // 5mb
  private extnames = ['jpg', 'png', 'gif'];

  public async upload({
    request,
    response,
    bouncer,
    auth,
  }: HttpContextContract) {
    const user = auth.use('api').user;
    const file = request.file('file', {
      size: '5mb',
      extnames: this.extnames,
    });

    if (!file) {
      response.badRequest('You must send valid file.');
      return;
    }

    if (await bouncer.with('UserPolicy').denies('confirmed')) {
      response.unauthorized('You must first signin before upload a file.');
      return;
    }

    try {
      return await Database.transaction(async trx => {
        const fileName = `tmp/${uuid()}.${file.extname}`;
        const { Location, Key } = await S3.upload({
          Key: fileName,
          Bucket: AwsBucket,
          Body: fs.createReadStream(file.tmpPath as unknown as string),
        }).promise();

        const fileData = await user?.related('files').create({
          key: Key,
          location: Location,
          mimeType: file.extname,
          contentType:
            lookup(file.extname as unknown as string) || 'plain/text',
          size: file.size,
          originalName: file.fileName,
        });

        return fileData;
      });
    } catch {
      response.badRequest('Oops! Bad request');
    }
  }

  public async external({
    request,
    response,
    auth,
    bouncer,
  }: HttpContextContract) {
    const user = auth.use('api').user;
    const externalURL = schema.create({
      url: schema.string({}, [rules.url()]),
    });
    const externalFileSchema = schema.create({
      size: schema.number([rules.range(200, this.maxSize)]),
      mimeType: schema.enum(this.extnames),
    });

    if (await bouncer.with('UserPolicy').denies('confirmed')) {
      response.unauthorized('You must first signin before upload a file.');
      return;
    }

    try {
      const { url } = await request.validate({ schema: externalURL });
      const urlParsed = new URL(url);
      const originalName = urlParsed.pathname;
      const { promise, stream } = createUploadStream(
        `tmp/${uuid()}${extname(originalName)}`,
      );
      const {
        data,
        headers: { 'content-type': contentType, 'content-length': size },
      } = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
      });
      const mimeType = extension(contentType) as unknown as string;
      await request.validate({
        schema: externalFileSchema,
        data: { size, mimeType },
      });
      data.pipe(stream);
      const { Key, Location: location } = await promise;
      return await Database.transaction(async trx => {
        try {
          const file = await user?.related('files').create({
            contentType,
            size,
            mimeType,
            originalName,
            location,
            key: Key,
          });
          return file;
        } catch (err) {
          trx.rollback();
          await S3.deleteObject({
            Bucket: AwsBucket,
            Key,
          }).promise();
          throw err;
        }
      });
    } catch (errors) {
      response.badRequest(errors.messages);
    }
  }

  public async destroy({ params, bouncer, response }: HttpContextContract) {
    const { id } = params;
    const file = await File.find(id);
    if (!file) {
      response.badRequest('Invalid file Id.');
      return;
    }
    if (await bouncer.with('FilePolicy').denies('delete', file)) {
      response.unauthorized('You do not authorized to delete this file.');
      return;
    }
    try {
      return await file.delete();
    } catch (error) {
      response.internalServerError(error);
    }
  }
}
