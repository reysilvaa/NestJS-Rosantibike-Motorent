// import { PrismaClient } from '@prisma/client';
// import { BlogTagType, BlogPostType } from './types';
// import { StatusArtikel } from '../../src/common/enums/status.enum';

// export async function seedBlogTags(prisma: PrismaClient): Promise<BlogTagType[]> {
//   const tagData = [
//     { nama: 'Tips Berkendara' },
//     { nama: 'Perawatan Motor' },
//     { nama: 'Wisata' },
//     { nama: 'Rekomendasi' },
//     { nama: 'Info Rental' },
//   ];

//   const tags: BlogTagType[] = [];
//   for (const data of tagData) {
    
//     const existingTag = await prisma.blogTag.findUnique({
//       where: { nama: data.nama },
//     });

//     if (existingTag) {
//       console.log(`Tag ${data.nama} sudah ada`);
//       tags.push(existingTag as BlogTagType);
//     } else {
//       const tag = await prisma.blogTag.create({ data });
//       tags.push(tag as BlogTagType);
//       console.log(`Tag ${tag.nama} berhasil dibuat`);
//     }
//   }
//   return tags;
// }

// export async function seedBlogPosts(
//   prisma: PrismaClient,
//   tags: BlogTagType[],
// ): Promise<BlogPostType[]> {
//   const blogPostData = [
//     {
//       judul: 'Tips Merawat Motor Agar Tetap Prima Selama Musim Hujan',
//       slug: 'tes-1231-artikel',
//       konten: `
//         <h2>Pentingnya Perawatan Motor Saat Musim Hujan</h2>
//         <p>Musim hujan seringkali membawa tantangan tersendiri bagi para pengendara motor. 
//         Cuaca yang tidak menentu dan kondisi jalan yang basah dapat memengaruhi performa 
//         dan keawetan kendaraan. Oleh karena itu, perawatan khusus sangat diperlukan agar motor 
//         tetap dalam kondisi prima.</p>
        
//         <h3>1. Perhatikan Kondisi Ban</h3>
//         <p>Ban adalah komponen utama yang bersentuhan langsung dengan permukaan jalan. 
//         Pastikan tekanan angin selalu optimal dan cek kedalaman alur ban secara berkala. 
//         Ban dengan alur yang sudah aus akan sangat berbahaya saat melintasi jalan basah 
//         karena meningkatkan risiko tergelincir.</p>
        
//         <h3>2. Jaga Kebersihan Rantai</h3>
//         <p>Air dan kotoran dapat mempercepat keausan rantai motor. Bersihkan rantai 
//         secara teratur dan berikan pelumas khusus rantai untuk mencegah karat dan 
//         memastikan performa optimal.</p>
        
//         <h3>3. Periksa Sistem Pengereman</h3>
//         <p>Sistem rem yang berfungsi baik sangat penting, terutama di musim hujan. 
//         Periksa kondisi kampas rem dan pastikan tidak ada udara dalam sistem rem hidrolik. 
//         Jika terdengar suara mencicit saat pengereman, segera konsultasikan dengan mekanik.</p>
        
//         <h3>4. Perhatikan Sistem Kelistrikan</h3>
//         <p>Air hujan dapat memengaruhi komponen kelistrikan motor. Pastikan semua kabel 
//         terlindungi dengan baik. Periksa juga kondisi busi dan koil untuk memastikan 
//         pengapian tetap optimal.</p>
        
//         <h3>5. Gunakan Pelindung Anti Karat</h3>
//         <p>Aplikasikan pelindung anti karat pada bagian-bagian metal yang rentan 
//         terkena air dan lumpur. Hal ini akan membantu memperpanjang umur komponen 
//         dan menjaga tampilan motor tetap baik.</p>
        
//         <h2>Kesimpulan</h2>
//         <p>Dengan melakukan perawatan rutin dan memperhatikan komponen-komponen penting, 
//         motor Anda akan tetap andal meskipun digunakan di musim hujan. Ingat, pencegahan 
//         selalu lebih baik daripada perbaikan.</p>
//       `,
//       thumbnail: '/placeholder.svg?height=600&width=1200',
//       kategori: 'Perawatan Motor',
//       status: StatusArtikel.TERBIT,
//     },
//     {
//       judul: 'Panduan Memilih Motor yang Tepat untuk Pemula',
//       slug: 'panduan-memilih-motor-untuk-pemula',
//       konten: `
//         <h2>Panduan Lengkap Memilih Motor untuk Pemula</h2>
//         <p>Bagi Anda yang baru akan membeli motor pertama, pemilihan yang tepat sangat 
//         penting untuk kenyamanan dan keamanan berkendara. Artikel ini akan membantu 
//         Anda memahami faktor-faktor penting dalam memilih motor yang sesuai dengan 
//         kebutuhan dan kemampuan Anda sebagai pemula.</p>

//         <h3>1. Pertimbangkan Ukuran dan Berat Motor</h3>
//         <p>Sebagai pemula, pilihlah motor dengan ukuran dan berat yang sesuai dengan 
//         postur tubuh Anda. Motor yang terlalu besar atau berat akan sulit dikendalikan 
//         dan menyulitkan manuver, terutama di jalan padat.</p>

//         <h3>2. Pilih Motor dengan CC yang Sesuai</h3>
//         <p>Untuk pemula, motor dengan kapasitas mesin 100-150cc biasanya sudah cukup. 
//         Motor dengan CC yang lebih tinggi memiliki akselerasi yang lebih cepat dan 
//         mungkin sulit dikendalikan oleh pengendara yang belum berpengalaman.</p>

//         <h3>3. Perhatikan Fitur Keselamatan</h3>
//         <p>Cari motor yang dilengkapi dengan fitur keselamatan seperti ABS (Anti-lock Braking System) 
//         yang mencegah roda terkunci saat pengereman mendadak. Fitur ini sangat membantu pemula 
//         dalam situasi darurat.</p>

//         <h3>4. Sesuaikan dengan Kebutuhan Harian</h3>
//         <p>Pikirkan kebutuhan transportasi harian Anda. Jika hanya untuk perjalanan dalam kota, 
//         motor matic mungkin lebih cocok karena lebih mudah dikendarai. Untuk perjalanan jauh, 
//         pertimbangkan motor dengan tangki bahan bakar yang lebih besar.</p>

//         <h2>Rekomendasi Motor untuk Pemula</h2>
//         <p>Beberapa motor yang direkomendasikan untuk pemula antara lain Honda BeAT, 
//         Yamaha NMAX, atau Honda PCX. Motor-motor ini memiliki keseimbangan yang baik 
//         antara performa, kenyamanan, dan kemudahan penggunaan.</p>
//       `,
//       thumbnail: '/placeholder.svg?height=600&width=1200',
//       kategori: 'Tips Berkendara',
//       status: StatusArtikel.TERBIT,
//     },
//   ];

//   const posts: BlogPostType[] = [];
//   for (const data of blogPostData) {
    
//     const existingPost = await prisma.blogPost.findUnique({
//       where: { slug: data.slug },
//     });

//     if (existingPost) {
//       console.log(`Artikel "${data.judul}" sudah ada`);
//       posts.push(existingPost as BlogPostType);
//     } else {
      
//       const randomTags = tags.sort(() => 0.5 - Math.random()).slice(0, 2);

//       const post = await prisma.blogPost.create({
//         data: {
//           judul: data.judul,
//           slug: data.slug,
//           konten: data.konten,
//           thumbnail: data.thumbnail,
//           kategori: data.kategori,
//           status: data.status,
//           tags: {
//             create: randomTags.map(tag => ({
//               tag: {
//                 connect: { id: tag.id },
//               },
//             })),
//           },
//         },
//       });

//       posts.push(post);
//       console.log(`Artikel "${post.judul}" berhasil dibuat`);
//     }
//   }
//   return posts;
// }
