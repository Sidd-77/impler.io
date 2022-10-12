import { DynamicModule, Module } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';
import { SharedModule } from './app/shared/shared.module';
import { ProjectModule } from './app/project/project.module';
import { TemplateModule } from './app/template/template.module';
import { ColumnModule } from './app/column/column.module';
import { OpsModule } from './app/ops/ops.module';

const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [
  ProjectModule,
  SharedModule,
  TemplateModule,
  ColumnModule,
  OpsModule,
];

const providers = [];

@Module({
  imports: modules,
  controllers: [],
  providers,
})
export class AppModule {}
