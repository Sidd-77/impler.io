import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Injectable, HttpStatus, HttpException, UnauthorizedException } from '@nestjs/common';

import { APIMessages } from '@shared/constants';
import { SchemaDto } from 'app/common/dtos/Schema.dto';
import { ValidRequestCommand } from './valid-request.command';
import { ProjectRepository, TemplateRepository, UserEntity } from '@impler/dal';
import { UniqueColumnException } from '@shared/exceptions/unique-column.exception';
import { DocumentNotFoundException } from '@shared/exceptions/document-not-found.exception';
import { PaymentAPIService } from '@impler/services';
import { AVAILABLE_BILLABLEMETRIC_CODE_ENUM, ColumnTypesEnum } from '@impler/shared';

@Injectable()
export class ValidRequest {
  constructor(
    private projectRepository: ProjectRepository,
    private templateRepository: TemplateRepository,
    private paymentAPIService: PaymentAPIService
  ) {}

  async execute(command: ValidRequestCommand): Promise<{ success: boolean }> {
    try {
      if (command.projectId) {
        const projectCount = await this.projectRepository.count({
          _id: command.projectId,
        });

        if (!projectCount) {
          throw new DocumentNotFoundException('Project', command.projectId, APIMessages.INCORRECT_KEYS_FOUND);
        }
      }

      if (command.templateId) {
        const templateCount = await this.templateRepository.count({
          _id: command.templateId,
          _projectId: command.projectId,
        });

        if (!templateCount) {
          throw new DocumentNotFoundException('Template', command.templateId, APIMessages.INCORRECT_KEYS_FOUND);
        }
      }

      if (command.schema) {
        const parsedSchema: SchemaDto[] =
          typeof command.schema === 'string' ? JSON.parse(command.schema) : command.schema;

        const errors: string[] = [];
        if (!Array.isArray(parsedSchema)) {
          throw new DocumentNotFoundException(
            'Schema',
            command.schema,
            'Invalid schema input. An array of schema object columns is expected.'
          );
        }

        const columnKeysSet = new Set(parsedSchema.map((column) => column.key));
        if (columnKeysSet.size !== parsedSchema.length) {
          throw new UniqueColumnException(APIMessages.COLUMN_KEY_TAKEN);
        }

        for (const item of parsedSchema) {
          const columnDto = plainToClass(SchemaDto, item);
          const validationErrors = await validate(columnDto);

          // eslint-disable-next-line no-magic-numbers
          if (validationErrors.length > 0) {
            errors.push(
              `Schema Error : ${validationErrors
                .map((err) => {
                  return Object.values(err.constraints);
                })
                .join(', ')}`
            );

            throw new DocumentNotFoundException('Schema', command.schema, errors.toString());
          }
        }

        const hasImageColumns = parsedSchema.some((column) => column.type === ColumnTypesEnum.IMAGE);
        if (hasImageColumns) {
          const project = await this.projectRepository.getUserOfProject(command.projectId);

          const isBillableMetricAvailable = await this.paymentAPIService.checkEvent({
            email: (project._userId as unknown as UserEntity).email,
            billableMetricCode: AVAILABLE_BILLABLEMETRIC_CODE_ENUM.IMAGE_UPLOAD,
          });

          if (!isBillableMetricAvailable) {
            throw new DocumentNotFoundException(
              'Schema',
              command.schema,
              APIMessages.ERROR_ACCESSING_FEATURE.IMAGE_UPLOAD
            );
          }
        }
      }

      return { success: true };
    } catch (error) {
      if (error instanceof DocumentNotFoundException) {
        throw new HttpException(
          {
            message: error.message,
            errorCode: error.getStatus(),
          },
          HttpStatus.NOT_FOUND
        );
      }

      if (error instanceof UnauthorizedException) {
        throw new HttpException(
          {
            message: APIMessages.INVALID_AUTH_TOKEN,
            errorCode: error.getStatus(),
          },
          HttpStatus.NOT_FOUND
        );
      }

      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
