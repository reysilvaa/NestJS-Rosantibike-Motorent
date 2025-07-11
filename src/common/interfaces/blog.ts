import { ArtikelStatus, ArtikelStatusType } from './enum';

export interface BlogPost {
  id: string;
  judul: string;
  slug: string;
  konten: string;
  thumbnail?: string | null;
  kategoriId?: string | null;
  status: ArtikelStatusType;
  createdAt: Date;
  updatedAt: Date;
  tags?: BlogPostTag[];
  kategori?: BlogKategori | null;
}

export interface BlogKategori {
  id: string;
  nama: string;
  slug: string;
  deskripsi?: string | null;
  createdAt: Date;
  updatedAt: Date;
  posts?: BlogPost[];
}

export interface BlogTag {
  id: string;
  nama: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  posts?: BlogPostTag[];
}

export interface BlogPostTag {
  postId: string;
  tagId: string;
  createdAt: Date;
  post?: BlogPost;
  tag?: BlogTag;
}

export interface CreateBlogPostDto {
  judul: string;
  konten: string;
  thumbnail?: string;
  kategoriId?: string;
  status?: ArtikelStatusType;
  tagIds?: string[];
}

export interface UpdateBlogPostDto {
  judul?: string;
  konten?: string;
  thumbnail?: string;
  kategoriId?: string;
  status?: ArtikelStatusType;
  tagIds?: string[];
}

export interface CreateBlogKategoriDto {
  nama: string;
  deskripsi?: string;
}

export interface UpdateBlogKategoriDto {
  nama?: string;
  deskripsi?: string;
}

export interface CreateBlogTagDto {
  nama: string;
}

export interface UpdateBlogTagDto {
  nama?: string;
}
