import type { FilterBlogPostDto } from '../dto';

export function createBlogWhereCondition(filter: FilterBlogPostDto) {
  const where = {
    ...(filter.status && { status: filter.status }),
    OR: filter.search
      ? [
          {
            judul: { contains: filter.search, mode: 'insensitive' as const },
          },
          {
            konten: { contains: filter.search, mode: 'insensitive' as const },
          },
        ]
      : undefined,
    tags: filter.tagId
      ? {
          some: {
            tagId: filter.tagId,
          },
        }
      : undefined,
  };

  Object.keys(where).forEach(key => where[key] === undefined && delete where[key]);

  return where;
}
