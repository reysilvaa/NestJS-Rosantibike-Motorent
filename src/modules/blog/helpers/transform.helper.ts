/**
 * Mentransformasi blog post untuk format yang sesuai dengan frontend
 */
export function transformBlogPostForFrontend(post: any) {
  return {
    id: post.id,
    judul: post.judul,
    slug: post.slug,
    konten: post.konten,
    featuredImage: post.thumbnail,
    status: post.status === 'TERBIT' ? 'published' : 'draft',
    kategori: post.kategori,
    tags: post.tags.map(tag => tag.tag.nama),
    meta_description: post.konten.slice(0, 150) + '...',
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}
