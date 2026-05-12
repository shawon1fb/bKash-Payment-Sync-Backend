import { sql, SQL } from 'drizzle-orm';

export interface FilterOptions {
  role?: string;
  isActive?: boolean;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class FilterUtil {
  static buildUserFilters(filters: FilterOptions): SQL<unknown>[] {
    const conditions: SQL<unknown>[] = [];

    if (filters.role) {
      conditions.push(sql`role = ${filters.role}`);
    }

    if (typeof filters.isActive === 'boolean') {
      conditions.push(sql`is_active = ${filters.isActive}`);
    }

    if (filters.search && filters.search.trim().length > 0) {
      const searchTerm = `%${filters.search.trim().toLowerCase()}%`;
      conditions.push(
        sql`(LOWER(name) LIKE ${searchTerm} OR LOWER(phone) LIKE ${searchTerm})`,
      );
    }

    if (filters.dateFrom) {
      conditions.push(sql`created_at >= ${filters.dateFrom}`);
    }

    if (filters.dateTo) {
      conditions.push(sql`created_at <= ${filters.dateTo}`);
    }

    return conditions;
  }

  static validateDateRange(dateFrom?: Date, dateTo?: Date): void {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new Error('dateFrom cannot be greater than dateTo');
    }
  }

  static sanitizeSearchTerm(search?: string): string | undefined {
    if (!search) return undefined;
    const sanitized = search.replace(/[%_\\]/g, '\\$&').trim();
    return sanitized.length > 0 ? sanitized : undefined;
  }

  static buildSortCondition(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): SQL<unknown> | undefined {
    if (!sortBy) return sql`created_at DESC`;

    const fieldMap: Record<string, string> = {
      name: 'name',
      phone: 'phone',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };

    const dbField = fieldMap[sortBy] ?? 'created_at';
    return sql.raw(`"${dbField}" ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`);
  }
}
