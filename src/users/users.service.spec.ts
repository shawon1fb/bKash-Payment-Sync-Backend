import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { DatabaseService } from '../database/database.service';

function mockDb(...results: any[]) {
  let i = 0;
  const self: any = {};
  for (const m of [
    'select', 'from', 'where', 'orderBy', 'limit', 'offset',
    'insert', 'values', 'returning', 'update', 'set', 'delete',
  ]) {
    self[m] = jest.fn(() => self);
  }
  self.then = (resolve: any, reject?: any) =>
    Promise.resolve(results[i++] ?? []).then(resolve, reject);
  return self;
}

const baseUser = {
  id: 'user-uuid-1',
  name: 'John Doe',
  phone: '01711223344',
  role: 'agent',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('UsersService', () => {
  let service: UsersService;
  let databaseService: jest.Mocked<DatabaseService>;

  beforeEach(async () => {
    databaseService = { getDatabase: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DatabaseService, useValue: databaseService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('creates user when phone not taken', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([], [baseUser]) as any);

      const result = await service.create({
        name: 'John Doe',
        phone: '01711223344',
        role: 'agent' as any,
      });

      expect(result.id).toBe(baseUser.id);
      expect(result.phone).toBe(baseUser.phone);
    });

    it('throws ConflictException when phone already exists', async () => {
      databaseService.getDatabase.mockReturnValue(
        mockDb([{ id: 'existing-id' }]) as any,
      );

      await expect(
        service.create({ name: 'Jane', phone: '01711223344', role: 'agent' as any }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns paginated users', async () => {
      databaseService.getDatabase.mockReturnValue(
        mockDb([{ total: 2 }], [baseUser, { ...baseUser, id: 'user-uuid-2' }]) as any,
      );

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('returns empty result when no users match', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([{ total: 0 }], []) as any);

      const result = await service.findAll({ page: 1, limit: 10, search: 'nobody' });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('returns user by id', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([baseUser]) as any);

      const result = await service.findOne('user-uuid-1');

      expect(result.id).toBe('user-uuid-1');
    });

    it('throws NotFoundException when not found', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([]) as any);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPhone', () => {
    it('returns user dto when found', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([baseUser]) as any);

      const result = await service.findByPhone('01711223344');

      expect(result).not.toBeNull();
      expect(result!.phone).toBe('01711223344');
    });

    it('returns null when not found', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([]) as any);

      const result = await service.findByPhone('01999999999');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates user fields', async () => {
      const updated = { ...baseUser, name: 'Updated Name' };
      databaseService.getDatabase.mockReturnValue(mockDb([baseUser], [updated]) as any);

      const result = await service.update('user-uuid-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('throws NotFoundException when user does not exist', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([]) as any);

      await expect(service.update('bad-id', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('sets isActive to false', async () => {
      const deactivated = { ...baseUser, isActive: false };
      databaseService.getDatabase.mockReturnValue(
        mockDb([baseUser], [deactivated]) as any,
      );

      const result = await service.softDelete('user-uuid-1');

      expect(result.isActive).toBe(false);
    });
  });

  describe('remove', () => {
    it('deletes user and returns message', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([baseUser], undefined) as any);

      const result = await service.remove('user-uuid-1');

      expect(result.message).toContain('deleted');
    });

    it('throws NotFoundException when not found', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([]) as any);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
