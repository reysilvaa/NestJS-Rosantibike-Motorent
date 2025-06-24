export function transformBlogPostForFrontend(post: any) {
  return {
    id: post.id,
    judul: post.judul,
    slug: post.slug,
    konten: post.konten,
    featuredImage: post.thumbnail,
    status: post.status === 'TERBIT' ? 'published' : 'draft',
    kategori: post.kategori ? {
      id: post.kategori.id,
      nama: post.kategori.nama,
      slug: post.kategori.slug,
      deskripsi: post.kategori.deskripsi,
    } : null,
    tags: post.tags.map(tag => ({
      id: tag.tag.id,
      nama: tag.tag.nama,
      slug: tag.tag.slug,
    })),
    metaTitle: post.metaTitle || post.judul,
    metaDescription: post.metaDescription || (post.konten.slice(0, 150) + '...'),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}
