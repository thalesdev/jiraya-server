import fs from 'fs';
import { extname } from 'path';
import Database from '@ioc:Adonis/Lucid/Database';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { v4 as uuid } from 'uuid';
import { lookup } from 'mime-types';
import { URL } from 'url';
import { schema, rules } from '@ioc:Adonis/Core/Validator';

import File from 'App/Models/File';
import { AwsBucket, createUploadStream, S3 } from 'App/Services/s3';
import axios from 'axios';

export default class FilesController {
  public async upload({ request, response, bouncer }: HttpContextContract) {
    const file = request.file('file', {
      size: '5mb',
      extnames: ['jpg', 'png', 'gif'],
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

        const fileData = new File().fill({
          key: Key,
          location: Location,
          mimeType: file.extname,
          contentType:
            lookup(file.extname as unknown as string) || 'plain/text',
          size: file.size,
          originalName: file.fileName,
        });
        fileData.useTransaction(trx);
        await fileData.save();

        return fileData;
      });
    } catch {
      response.badRequest('Oops! Bad request');
    }
  }

  public async external({ request, response }: HttpContextContract) {
    const externalSchema = schema.create({
      url: schema.string({}, [rules.url()]),
    });
    try {
      const { url } = await request.validate({ schema: externalSchema });
      const urlParsed = new URL(url);
      const originalName = urlParsed.pathname;
      const mimeType = extname(originalName);
      const { promise, stream } = createUploadStream(
        `tmp/${uuid()}${extname(originalName)}`,
      );
      const { data, headers } = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
      });
      console.log(headers);
      data.pipe(stream);
      const { Key, Location: location } = await promise;
      const { ContentLength: size, ContentType: contentType } =
        await S3.headObject({
          Key,
          Bucket: AwsBucket,
        }).promise();
      return await Database.transaction(async trx => {
        const file = new File().fill({
          contentType,
          size,
          mimeType,
          originalName,
          location,
          key: Key,
        });
        file.useTransaction(trx);
        try {
          return await file.save();
        } catch (err) {
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
}
