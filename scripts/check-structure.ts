import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

const SRC_PATH = path.join(process.cwd(), 'src');
const MODULES_PATH = path.join(SRC_PATH, 'modules');

// Struktur modul yang diharapkan
const EXPECTED_MODULE_STRUCTURE = ['controllers', 'services', 'dto', '__tests__'];

// Pola file yang diharapkan dalam modul
const EXPECTED_MODULE_FILES = (moduleName: string) => [
  `${moduleName}.module.ts`,
  `controllers/${moduleName}.controller.ts`,
  `services/${moduleName}.service.ts`,
  `dto/index.ts`,
];

// Fungsi untuk memeriksa struktur modul
function checkModuleStructure(modulePath: string, moduleName: string): boolean {
  console.log(chalk.blue(`\nMemeriksa modul: ${moduleName}`));

  let isValid = true;

  // Memeriksa keberadaan file-file yang diharapkan
  for (const expectedFile of EXPECTED_MODULE_FILES(moduleName)) {
    const filePath = path.join(modulePath, expectedFile);
    const exists = fs.existsSync(filePath);

    console.log(`  ${exists ? chalk.green('✓') : chalk.red('✗')} ${expectedFile}`);

    if (!exists) {
      isValid = false;
    }
  }

  // Memeriksa keberadaan direktori yang diharapkan
  for (const expectedDir of EXPECTED_MODULE_STRUCTURE) {
    const dirPath = path.join(modulePath, expectedDir);
    const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();

    console.log(`  ${exists ? chalk.green('✓') : chalk.yellow('!')} ${expectedDir}/`);

    if (!exists) {
      // Direktori kosong kurang penting, jadi tidak membatalkan validasi
      console.log(
        chalk.yellow(
          `    Direktori ${expectedDir}/ tidak ditemukan. Pertimbangkan untuk membuatnya.`,
        ),
      );
    }
  }

  return isValid;
}

// Fungsi utama
function main() {
  console.log(chalk.bold.blue('Memeriksa struktur proyek...'));

  // Memastikan direktori modules ada
  if (!fs.existsSync(MODULES_PATH)) {
    console.error(chalk.red('Direktori modules tidak ditemukan di src/'));
    process.exit(1);
  }

  // Dapatkan semua modul
  const modules = fs.readdirSync(MODULES_PATH).filter(item => {
    const itemPath = path.join(MODULES_PATH, item);
    return fs.statSync(itemPath).isDirectory();
  });

  console.log(chalk.blue(`Menemukan ${modules.length} modul untuk diperiksa.`));

  let validModules = 0;

  // Periksa struktur masing-masing modul
  for (const moduleName of modules) {
    const modulePath = path.join(MODULES_PATH, moduleName);
    const isValid = checkModuleStructure(modulePath, moduleName);

    if (isValid) {
      validModules++;
    }
  }

  // Laporan ringkasan
  console.log('\n' + chalk.bold.blue('Ringkasan:'));
  console.log(`${validModules} dari ${modules.length} modul memiliki struktur yang valid.`);

  if (validModules < modules.length) {
    console.log(
      chalk.yellow(
        '\nSaran: Jalankan `npm run scaffold:module -- <nama-modul>` untuk membuat struktur standar pada modul yang belum lengkap.',
      ),
    );
  } else {
    console.log(chalk.green('\nSemua modul memenuhi standar struktur yang ditetapkan!'));
  }
}

// Jalankan script
main();
