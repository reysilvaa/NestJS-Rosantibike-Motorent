import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

const SRC_PATH = path.join(process.cwd(), 'src');
const MODULES_PATH = path.join(SRC_PATH, 'modules');

// Direktori yang harus dibuat untuk setiap modul
const MODULE_DIRS = ['dto', 'controllers', 'services', '__tests__'];

// Template untuk modul.module.ts
const MODULE_TEMPLATE = (
  moduleName: string,
  moduleClassName: string,
) => `import { Module } from '@nestjs/common';
import { ${moduleClassName}Controller } from './controllers/${moduleName}.controller';
import { ${moduleClassName}Service } from './services/${moduleName}.service';
import { PrismaModule } from '../../common';

@Module({
  imports: [PrismaModule],
  controllers: [${moduleClassName}Controller],
  providers: [${moduleClassName}Service],
  exports: [${moduleClassName}Service]
})
export class ${moduleClassName}Module {}
`;

// Template untuk modul.module.ts yang menggunakan Redis
const MODULE_WITH_REDIS_TEMPLATE = (
  moduleName: string,
  moduleClassName: string,
) => `import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { redisConfig, PrismaModule } from '../../common';
import { ${moduleClassName}Controller } from './controllers/${moduleName}.controller';
import { ${moduleClassName}Service } from './services/${moduleName}.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forFeature(redisConfig),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('redis.host'),
        port: configService.get('redis.port'),
        ttl: configService.get('redis.ttl'),
        max: configService.get('redis.max'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [${moduleClassName}Controller],
  providers: [${moduleClassName}Service],
  exports: [${moduleClassName}Service]
})
export class ${moduleClassName}Module {}
`;

// Template untuk module.controller.ts
const CONTROLLER_TEMPLATE = (
  moduleName: string,
  moduleClassName: string,
) => `import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { ${moduleClassName}Service } from '../services/${moduleName}.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('${moduleName}')
@Controller('${moduleName}')
export class ${moduleClassName}Controller {
  constructor(private readonly ${toCamelCase(moduleName)}Service: ${moduleClassName}Service) {}

  @Get()
  findAll() {
    return this.${toCamelCase(moduleName)}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.${toCamelCase(moduleName)}Service.findOne(id);
  }

  @Post()
  create(@Body() createDto: any) {
    return this.${toCamelCase(moduleName)}Service.create(createDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.${toCamelCase(moduleName)}Service.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.${toCamelCase(moduleName)}Service.remove(id);
  }
}
`;

// Template untuk module.service.ts
const SERVICE_TEMPLATE = (
  moduleName: string,
  moduleClassName: string,
) => `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common';

@Injectable()
export class ${moduleClassName}Service {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Implementasi findAll
    return [];
  }

  async findOne(id: string) {
    // Implementasi findOne
    return { id };
  }

  async create(createDto: any) {
    // Implementasi create
    return { id: 'new-id', ...createDto };
  }

  async update(id: string, updateDto: any) {
    // Implementasi update
    return { id, ...updateDto };
  }

  async remove(id: string) {
    // Implementasi remove
    return { id };
  }
}
`;

// Template untuk DTO dasar
const CREATE_DTO_TEMPLATE = (
  moduleClassName: string,
) => `import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class Create${moduleClassName}Dto {
  @ApiProperty({
    description: 'Nama ${moduleClassName}',
    example: 'Contoh ${moduleClassName}'
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
`;

const UPDATE_DTO_TEMPLATE = (
  moduleClassName: string,
) => `import { PartialType } from '@nestjs/swagger';
import { Create${moduleClassName}Dto } from './create-${toKebabCase(moduleClassName)}.dto';

export class Update${moduleClassName}Dto extends PartialType(Create${moduleClassName}Dto) {}
`;

const DTO_INDEX_TEMPLATE = (
  moduleName: string,
  moduleClassName: string,
) => `export * from './create-${moduleName}.dto';
export * from './update-${moduleName}.dto';
`;

// Helper: kebab-case to PascalCase
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

// Helper: kebab-case to camelCase
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

// Helper: PascalCase to kebab-case
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

// Fungsi untuk membuat scaffold modul dengan pilihan Redis
function scaffoldModule(moduleName: string, useRedis: boolean = false) {
  // Validasi nama modul (harus kebab-case)
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(moduleName)) {
    console.error(
      chalk.red(
        `Nama modul '${moduleName}' tidak valid. Gunakan format kebab-case (contoh: 'my-module').`,
      ),
    );
    process.exit(1);
  }

  const modulePath = path.join(MODULES_PATH, moduleName);
  const moduleClassName = toPascalCase(moduleName);

  // Buat direktori modul jika belum ada
  if (!fs.existsSync(modulePath)) {
    fs.mkdirSync(modulePath, { recursive: true });
    console.log(chalk.green(`✓ Direktori modul ${moduleName} dibuat`));
  } else {
    console.log(chalk.yellow(`! Direktori modul ${moduleName} sudah ada`));
  }

  // Buat subdirektori yang diperlukan
  for (const dir of MODULE_DIRS) {
    const dirPath = path.join(modulePath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(chalk.green(`✓ Direktori ${dir}/ dibuat`));
    } else {
      console.log(chalk.yellow(`! Direktori ${dir}/ sudah ada`));
    }
  }

  // Buat file modul
  const moduleFilePath = path.join(modulePath, `${moduleName}.module.ts`);
  if (!fs.existsSync(moduleFilePath)) {
    const moduleTemplate = useRedis ? MODULE_WITH_REDIS_TEMPLATE : MODULE_TEMPLATE;
    fs.writeFileSync(moduleFilePath, moduleTemplate(moduleName, moduleClassName));
    console.log(chalk.green(`✓ File ${moduleName}.module.ts dibuat ${useRedis ? 'dengan dukungan Redis' : ''}`));
  } else {
    console.log(chalk.yellow(`! File ${moduleName}.module.ts sudah ada`));
  }

  // Buat file controller di folder controllers
  const controllersPath = path.join(modulePath, 'controllers');
  const controllerFilePath = path.join(controllersPath, `${moduleName}.controller.ts`);
  if (!fs.existsSync(controllerFilePath)) {
    fs.writeFileSync(controllerFilePath, CONTROLLER_TEMPLATE(moduleName, moduleClassName));
    console.log(chalk.green(`✓ File controllers/${moduleName}.controller.ts dibuat`));
  } else {
    console.log(chalk.yellow(`! File controllers/${moduleName}.controller.ts sudah ada`));
  }

  // Buat file service di folder services
  const servicesPath = path.join(modulePath, 'services');
  const serviceFilePath = path.join(servicesPath, `${moduleName}.service.ts`);
  if (!fs.existsSync(serviceFilePath)) {
    fs.writeFileSync(serviceFilePath, SERVICE_TEMPLATE(moduleName, moduleClassName));
    console.log(chalk.green(`✓ File services/${moduleName}.service.ts dibuat`));
  } else {
    console.log(chalk.yellow(`! File services/${moduleName}.service.ts sudah ada`));
  }

  // Buat DTO dasar
  const dtoPath = path.join(modulePath, 'dto');
  const createDtoFilePath = path.join(dtoPath, `create-${moduleName}.dto.ts`);
  const updateDtoFilePath = path.join(dtoPath, `update-${moduleName}.dto.ts`);
  const dtoIndexFilePath = path.join(dtoPath, `index.ts`);

  if (!fs.existsSync(createDtoFilePath)) {
    fs.writeFileSync(createDtoFilePath, CREATE_DTO_TEMPLATE(moduleClassName));
    console.log(chalk.green(`✓ File dto/create-${moduleName}.dto.ts dibuat`));
  } else {
    console.log(chalk.yellow(`! File dto/create-${moduleName}.dto.ts sudah ada`));
  }

  if (!fs.existsSync(updateDtoFilePath)) {
    fs.writeFileSync(updateDtoFilePath, UPDATE_DTO_TEMPLATE(moduleClassName));
    console.log(chalk.green(`✓ File dto/update-${moduleName}.dto.ts dibuat`));
  } else {
    console.log(chalk.yellow(`! File dto/update-${moduleName}.dto.ts sudah ada`));
  }

  if (!fs.existsSync(dtoIndexFilePath)) {
    fs.writeFileSync(dtoIndexFilePath, DTO_INDEX_TEMPLATE(moduleName, moduleClassName));
    console.log(chalk.green(`✓ File dto/index.ts dibuat`));
  } else {
    console.log(chalk.yellow(`! File dto/index.ts sudah ada`));
  }

  console.log(chalk.green.bold(`\nModul ${moduleName} berhasil di-scaffold!`));
  console.log(chalk.blue(`\nLangkah selanjutnya:`));
  console.log(`1. Sesuaikan DTO berdasarkan kebutuhan modul Anda`);
  console.log(`2. Implementasikan logika business di service`);
  console.log(`3. Import ${moduleClassName}Module di app.module.ts`);
}

// Fungsi utama
function main() {
  // Ambil nama modul dari argumen command-line
  const moduleName = process.argv[2];
  const useRedis = process.argv.includes('--redis');

  if (!moduleName) {
    console.error(chalk.red('Nama modul tidak diberikan!'));
    console.log(`Penggunaan: ${chalk.blue('npm run scaffold:module -- <nama-modul> [--redis]')}`);
    console.log(`Contoh: ${chalk.blue('npm run scaffold:module -- user-management')}`);
    console.log(`Contoh dengan Redis: ${chalk.blue('npm run scaffold:module -- user-management --redis')}`);
    process.exit(1);
  }

  // Memastikan direktori modules ada
  if (!fs.existsSync(MODULES_PATH)) {
    fs.mkdirSync(MODULES_PATH, { recursive: true });
    console.log(chalk.green('✓ Direktori modules/ dibuat'));
  }

  // Membuat scaffold modul
  scaffoldModule(moduleName, useRedis);
}

// Jalankan script
main();
