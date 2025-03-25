import { PrismaClient } from '@prisma/client';
import { BlogTagType, BlogPostType } from './types';
import { StatusArtikel } from '../../src/common/enums/status.enum';

export async function seedBlogTags(prisma: PrismaClient): Promise<BlogTagType[]> {
  const tagData = [
    { nama: 'Tips Berkendara' },
    { nama: 'Perawatan Motor' },
    { nama: 'Wisata' },
    { nama: 'Rekomendasi' },
    { nama: 'Info Rental' },
  ];

  const tags: BlogTagType[] = [];
  for (const data of tagData) {
    // Cek apakah tag sudah ada
    const existingTag = await prisma.blogTag.findUnique({
      where: { nama: data.nama },
    });

    if (existingTag) {
      console.log(`Tag ${data.nama} sudah ada`);
      tags.push(existingTag as BlogTagType);
    } else {
      const tag = await prisma.blogTag.create({ data });
      tags.push(tag as BlogTagType);
      console.log(`Tag ${tag.nama} berhasil dibuat`);
    }
  }
  return tags;
}

export async function seedBlogPosts(
  prisma: PrismaClient,
  tags: BlogTagType[],
): Promise<BlogPostType[]> {
  const blogPostData = [
    {
      judul: 'Tips Aman Berkendara Motor di Musim Hujan',
      slug: 'tips-aman-berkendara-motor-musim-hujan',
      konten: `
        <h2>Persiapan Sebelum Berkendara</h2>
        <p>Musim hujan telah tiba dan bagi pengguna sepeda motor, ini adalah tantangan tersendiri. Berikut beberapa tips yang bisa Anda ikuti untuk tetap aman berkendara di musim hujan:</p>
        <ul>
          <li>Pastikan rem berfungsi dengan baik</li>
          <li>Periksa tekanan ban</li>
          <li>Gunakan jas hujan yang berkualitas</li>
          <li>Pastikan lampu motor berfungsi dengan baik</li>
        </ul>
        <h2>Teknik Berkendara Saat Hujan</h2>
        <p>Saat hujan, permukaan jalan menjadi licin dan jarak pandang berkurang. Berikut teknik berkendara yang perlu Anda perhatikan:</p>
        <ul>
          <li>Kurangi kecepatan</li>
          <li>Hindari pengereman mendadak</li>
          <li>Berikan jarak yang lebih dengan kendaraan di depan</li>
          <li>Hindari genangan air dalam</li>
        </ul>
      `,
      thumbnail: 'https://example.com/images/berkendara-hujan.jpg',
      kategori: 'Tips',
      status: StatusArtikel.TERBIT,
    },
    {
      judul: '5 Destinasi Wisata Terbaik untuk Touring Motor di Yogyakarta',
      slug: 'destinasi-wisata-touring-motor-yogyakarta',
      konten: `
        <h2>Menjelajahi Yogyakarta dengan Motor</h2>
        <p>Yogyakarta memiliki banyak destinasi menarik yang cocok untuk dikunjungi dengan sepeda motor. Berikut 5 rekomendasi tempat wisata untuk touring motor di Yogyakarta:</p>
        <h3>1. Pantai Parangtritis</h3>
        <p>Pantai ikonik di selatan Yogyakarta ini menawarkan pemandangan sunset yang memukau. Akses jalan yang sudah bagus membuat perjalanan kesini sangat nyaman.</p>
        <h3>2. Kaliurang</h3>
        <p>Terletak di kaki Gunung Merapi, Kaliurang menawarkan udara sejuk dan pemandangan alam yang asri. Rute menuju Kaliurang cukup menantang dengan tanjakan dan tikungan.</p>
        <h3>3. Goa Pindul</h3>
        <p>Berlokasi di Gunungkidul, Goa Pindul menawarkan pengalaman cave tubing yang seru. Medan menuju lokasi cukup menantang tapi pemandangan sepanjang jalan sangat menyenangkan.</p>
        <h3>4. Kalibiru</h3>
        <p>Tempat wisata dengan spot foto instagramable yang terkenal. Perjalanan menuju Kalibiru akan melewati jalanan pegunungan yang indah.</p>
        <h3>5. Pantai Timang</h3>
        <p>Terkenal dengan gondola tradisionalnya, Pantai Timang menawarkan pemandangan laut yang spektakuler. Jalanan menuju lokasi cukup menantang tapi sangat cocok untuk penggemar touring.</p>
      `,
      thumbnail: 'https://example.com/images/wisata-jogja.jpg',
      kategori: 'Wisata',
      status: StatusArtikel.TERBIT,
    },
  ];

  const posts: BlogPostType[] = [];
  for (const data of blogPostData) {
    // Cek apakah post sudah ada
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug: data.slug },
    });

    if (existingPost) {
      console.log(`Artikel "${data.judul}" sudah ada`);
      posts.push(existingPost as BlogPostType);
    } else {
      // Pilih 2 tag random untuk setiap artikel
      const randomTags = tags.sort(() => 0.5 - Math.random()).slice(0, 2);

      const post = await prisma.blogPost.create({
        data: {
          judul: data.judul,
          slug: data.slug,
          konten: data.konten,
          thumbnail: data.thumbnail,
          kategori: data.kategori,
          status: data.status,
          tags: {
            create: randomTags.map(tag => ({
              tag: {
                connect: { id: tag.id },
              },
            })),
          },
        },
      });

      posts.push(post);
      console.log(`Artikel "${post.judul}" berhasil dibuat`);
    }
  }
  return posts;
}
