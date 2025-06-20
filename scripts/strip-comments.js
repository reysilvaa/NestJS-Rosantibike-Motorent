const fs = require('fs');
const path = require('path');

/**
 * Fungsi untuk menghapus komentar dari kode JavaScript/TypeScript
 * @param {string} input - String kode yang akan dihapus komentarnya
 * @param {object} options - Opsi tambahan untuk menghapus komentar
 * @returns {string} String kode tanpa komentar
 */
function stripComments(input, options = {}) {
  // Default options
  const opts = {
    line: options.line !== false,
    block: options.block !== false,
    keepProtected: options.keepProtected || false,
    preserveNewlines: options.preserveNewlines || false
  };

  if (!input || typeof input !== 'string') {
    return '';
  }

  let output = input;

  // Hapus block comments (/* ... */)
  if (opts.block) {
    const blockRegex = opts.keepProtected 
      ? /\/\*(?!!)[\s\S]*?\*\//g 
      : /\/\*[\s\S]*?\*\//g;
    
    output = output.replace(blockRegex, function() {
      // Jika perlu mempertahankan baris baru, ganti dengan jumlah baris baru yang sama
      if (opts.preserveNewlines) {
        return '\n';
      }
      return '';
    });
  }

  // Hapus line comments (// ...)
  if (opts.line) {
    const lineRegex = opts.keepProtected 
      ? /(?<!:)\/\/(?!!).*$/gm 
      : /(?<!:)\/\/.*$/gm;
    
    output = output.replace(lineRegex, function() {
      // Jika perlu mempertahankan baris baru, kembalikan baris baru
      if (opts.preserveNewlines) {
        return '';
      }
      return '';
    });
  }

  return output;
}

// Ekstensi file yang akan diproses
const EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.css', '.scss', '.less',
  '.html', '.php', '.java', '.c', '.cpp'
]);

// Direktori yang akan dilewati
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  'public',
  'scripts',
  '.github'
]);

// File yang akan dilewati
const IGNORE_FILES = new Set([
  '.env',
  '.env.local',
  '.env.example',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'README.md',
  'tsconfig.json',
  'next.config.ts',
  'next-env.d.ts'
]);

// Opsi untuk menghapus komentar
const options = {
  keepProtected: true, // Simpan komentar yang dilindungi (/*! ... */ atau //!)
  preserveNewlines: true, // Pertahankan baris baru setelah komentar dihapus
};

// Counter untuk statistik
let filesProcessed = 0;
let filesSkipped = 0;
let commentsRemoved = 0;

/**
 * Menghitung jumlah komentar dalam string kode
 * @param {string} code - Kode sumber
 * @returns {number} Jumlah komentar
 */
function countComments(code) {
  let count = 0;
  
  // Hitung komentar blok
  const blockMatches = code.match(/\/\*[\s\S]*?\*\//g);
  if (blockMatches) {
    count += blockMatches.length;
  }
  
  // Hitung komentar baris
  const lineMatches = code.match(/(?<!:)\/\/.*$/gm);
  if (lineMatches) {
    count += lineMatches.length;
  }
  
  return count;
}

/**
 * Memproses sebuah file
 * @param {string} filePath - Path file yang akan diproses
 */
function processFile(filePath) {
  // Periksa ekstensi file
  const ext = path.extname(filePath).toLowerCase();
  if (!EXTENSIONS.has(ext)) {
    console.log(`Melewati file: ${filePath} (ekstensi tidak didukung)`);
    filesSkipped++;
    return;
  }
  
  // Periksa nama file untuk dilewati
  const fileName = path.basename(filePath);
  if (IGNORE_FILES.has(fileName)) {
    console.log(`Melewati file: ${filePath} (dalam daftar abaikan)`);
    filesSkipped++;
    return;
  }

  try {
    // Baca file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Hitung jumlah komentar sebelum dihapus
    const commentCount = countComments(content);
    
    // Hapus komentar
    const processed = stripComments(content, options);
    
    // Hanya tulis ulang jika ada perubahan
    if (content === processed) {
      console.log(`Tidak ada komentar ditemukan di: ${filePath}`);
      filesSkipped++;
    } else {
      fs.writeFileSync(filePath, processed, 'utf8');
      console.log(`Berhasil memproses: ${filePath} (${commentCount} komentar dihapus)`);
      commentsRemoved += commentCount;
      filesProcessed++;
    }
  } catch (error) {
    console.error(`Error memproses file ${filePath}:`, error);
    filesSkipped++;
  }
}

/**
 * Memproses direktori secara rekursif
 * @param {string} dirPath - Path direktori yang akan diproses
 */
function processDirectory(dirPath) {
  try {
    // Dapatkan semua file dan direktori
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      
      // Lewati jika direktori dalam daftar abaikan
      if (IGNORE_DIRS.has(item)) {
        console.log(`Melewati direktori: ${itemPath}`);
        continue;
      }
      
      // Cek apakah item adalah direktori
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Proses subdirektori secara rekursif
        processDirectory(itemPath);
      } else if (stat.isFile()) {
        // Proses file
        processFile(itemPath);
      }
    }
  } catch (error) {
    console.error(`Error memproses direktori ${dirPath}:`, error);
  }
}

/**
 * Fungsi utama
 */
function main() {
  // Direktori awal (root dari proyek)
  const rootDir = path.resolve(__dirname, '..');
  console.log(`Mulai memproses direktori: ${rootDir}`);
  
  // Memulai pemrosesan
  processDirectory(rootDir);
  
  // Menampilkan statistik
  console.log('\n--- Statistik ---');
  console.log(`File yang diproses: ${filesProcessed}`);
  console.log(`File yang dilewati: ${filesSkipped}`);
  console.log(`Total komentar yang dihapus: ${commentsRemoved}`);
  console.log('--- Selesai ---');
}

// Jalankan program
main(); 