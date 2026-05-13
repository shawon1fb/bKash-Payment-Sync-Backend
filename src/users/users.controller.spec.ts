import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const mockUser = {
  id: 'user-uuid-1',
  name: 'John Doe',
  phone: '01711223344',
  role: 'agent',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPaginated = {
  data: [mockUser],
  meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
};

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    usersService = {
      findOne: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue(mockUser),
      findAll: jest.fn().mockResolvedValue(mockPaginated),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('getProfile', () => {
    it('calls findOne with current user id', async () => {
      await controller.getProfile(mockUser as any);

      expect(usersService.findOne).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('updateProfile', () => {
    it('calls update with current user id and only name', async () => {
      await controller.updateProfile(mockUser as any, { name: 'New Name' });

      expect(usersService.update).toHaveBeenCalledWith('user-uuid-1', { name: 'New Name' });
    });
  });

  describe('findAll', () => {
    it('delegates to usersService.findAll', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(query as any);

      expect(usersService.findAll).toHaveBeenCalledWith(query);
      expect(result).toBe(mockPaginated);
    });
  });

  describe('findOne', () => {
    it('delegates to usersService.findOne', async () => {
      const result = await controller.findOne('user-uuid-1');

      expect(usersService.findOne).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toBe(mockUser);
    });
  });

  describe('update', () => {
    it('delegates to usersService.update with id and dto', async () => {
      const result = await controller.update('user-uuid-1', { name: 'Updated' });

      expect(usersService.update).toHaveBeenCalledWith('user-uuid-1', { name: 'Updated' });
      expect(result).toBe(mockUser);
    });
  });
});
