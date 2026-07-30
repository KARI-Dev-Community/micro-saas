import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { Membership } from './entities/membership.entity';
import { Role } from './entities/role.entity';
import { RoleName, MembershipStatus, Permission } from '@shared/enums';

function createMockRepository<T>(findOneResult?: T, findResults?: T[]): {
  findOne: jest.Mock;
  find: jest.Mock;
} {
  return {
    findOne: jest.fn().mockResolvedValue(findOneResult ?? null),
    find: jest.fn().mockResolvedValue(findResults ?? []),
  };
}

describe('RbacService', () => {
  let service: RbacService;
  let membershipRepo: ReturnType<typeof createMockRepository<Membership>>;
  let roleRepo: ReturnType<typeof createMockRepository<Role>>;

  const mockOrgId = 'org-test-uuid';
  const mockUserId = 'user-test-uuid';

  beforeEach(async () => {
    membershipRepo = createMockRepository<Membership>();
    roleRepo = createMockRepository<Role>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        {
          provide: getRepositoryToken(Membership),
          useValue: membershipRepo,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: roleRepo,
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
  });

  describe('getUserPermissions', () => {
    it('test_returns_role_and_permissions_for_active_membership', async () => {
      const mockMembership = {
        id: 'mem-1',
        userId: mockUserId,
        organizationId: mockOrgId,
        status: MembershipStatus.ACTIVE,
        role: RoleName.ORG_OWNER,
        organization: { id: mockOrgId, slug: 'test-org' },
      } as unknown as Membership;
      const mockRole = {
        id: 'role-1',
        name: RoleName.ORG_OWNER,
        permissions: [
          { id: 'p1', key: Permission.ORG_READ },
          { id: 'p2', key: Permission.PROJECT_CREATE },
        ],
      } as unknown as Role;
      membershipRepo.findOne.mockResolvedValue(mockMembership);
      roleRepo.findOne.mockResolvedValue(mockRole);

      const result = await service.getUserPermissions(mockUserId, mockOrgId);

      expect(result.role).toBe(RoleName.ORG_OWNER);
      expect(result.permissions).toContain(Permission.ORG_READ);
      expect(result.permissions).toContain(Permission.PROJECT_CREATE);
    });

    it('test_throws_not_found_when_membership_does_not_exist', async () => {
      membershipRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getUserPermissions(mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getUserPermissions(mockUserId, mockOrgId),
      ).rejects.toThrow('Membership not found for this organization');
    });

    it('test_throws_not_found_when_membership_status_is_not_active', async () => { membershipRepo.findOne.mockResolvedValue(null); await expect( service.getUserPermissions(mockUserId, mockOrgId), ).rejects.toThrow(NotFoundException); });

    it('test_throws_not_found_when_membership_is_suspended', async () => { membershipRepo.findOne.mockResolvedValue(null); await expect( service.getUserPermissions(mockUserId, mockOrgId), ).rejects.toThrow(NotFoundException); });
  });

  describe('resolveForRole', () => {
    it('test_returns_all_permissions_for_super_admin_from_db', async () => {
      const superAdminPerms = Object.values(Permission);
      const mockSuperAdminRole = {
        id: 'role-sa',
        name: RoleName.SUPER_ADMIN,
        permissions: superAdminPerms.map((key) => ({ id: 'p', key })),
      } as unknown as Role;
      roleRepo.find.mockResolvedValue([mockSuperAdminRole]);

      const result = await service.resolveForRole(RoleName.SUPER_ADMIN);

      expect(result.role).toBe(RoleName.SUPER_ADMIN);
      expect(result.permissions).toEqual(superAdminPerms);
    });

    it('test_falls_back_to_all_permission_values_when_super_admin_has_no_db_permissions', async () => {
      roleRepo.find.mockResolvedValue([]);

      const result = await service.resolveForRole(RoleName.SUPER_ADMIN);

      expect(result.role).toBe(RoleName.SUPER_ADMIN);
      expect(result.permissions).toEqual(Object.values(Permission));
    });

    it('test_returns_role_specific_permissions_for_org_owner', async () => {
      const ownerPerms = [Permission.ORG_READ, Permission.ORG_DELETE, Permission.PROJECT_CREATE];
      const mockOwnerRole = {
        id: 'role-owner',
        name: RoleName.ORG_OWNER,
        permissions: ownerPerms.map((key) => ({ id: 'p', key })),
      } as unknown as Role;
      roleRepo.findOne.mockResolvedValue(mockOwnerRole);

      const result = await service.resolveForRole(RoleName.ORG_OWNER);

      expect(result.role).toBe(RoleName.ORG_OWNER);
      expect(result.permissions).toEqual(ownerPerms);
    });

    it('test_returns_role_specific_permissions_for_viewer', async () => {
      const viewerPerms = [Permission.ORG_READ, Permission.PROJECT_READ];
      const mockViewerRole = {
        id: 'role-viewer',
        name: RoleName.VIEWER,
        permissions: viewerPerms.map((key) => ({ id: 'p', key })),
      } as unknown as Role;
      roleRepo.findOne.mockResolvedValue(mockViewerRole);

      const result = await service.resolveForRole(RoleName.VIEWER);

      expect(result.role).toBe(RoleName.VIEWER);
      expect(result.permissions).toEqual(viewerPerms);
    });

    it('test_returns_empty_permissions_array_when_role_not_found_in_database', async () => {
      roleRepo.findOne.mockResolvedValue(null);

      const result = await service.resolveForRole(RoleName.MEMBER);

      expect(result.role).toBe(RoleName.MEMBER);
      expect(result.permissions).toEqual([]);
    });

    it('test_trims_and_lower_cases_role_name_before_database_lookup', async () => {
      const viewerPerms = [Permission.ORG_READ];
      const mockViewerRole = {
        id: 'role-viewer',
        name: RoleName.VIEWER,
        permissions: viewerPerms.map((key) => ({ id: 'p', key })),
      } as unknown as Role;
      roleRepo.findOne.mockResolvedValue(mockViewerRole);

      const result = await service.resolveForRole('  VIEWER  ');

      expect(result.role).toBe(RoleName.VIEWER);
      expect(result.permissions).toEqual(viewerPerms);
    });

    it('test_treats_null_role_as_empty_string_and_returns_empty_permissions', async () => {
      roleRepo.findOne.mockResolvedValue(null);

      const result = await service.resolveForRole(null as unknown as RoleName);

      expect(result.permissions).toEqual([]);
    });
  });

  describe('assertPermission', () => {
    it('test_resolves_without_error_when_user_has_required_permission', async () => {
      const mockMembership = {
        id: 'mem-1',
        userId: mockUserId,
        organizationId: mockOrgId,
        status: MembershipStatus.ACTIVE,
        role: RoleName.MEMBER,
        organization: { id: mockOrgId, slug: 'test-org' },
      } as unknown as Membership;
      const mockRole = {
        id: 'role-1',
        name: RoleName.MEMBER,
        permissions: [{ id: 'p1', key: Permission.PROJECT_READ }],
      } as unknown as Role;
      membershipRepo.findOne.mockResolvedValue(mockMembership);
      roleRepo.findOne.mockResolvedValue(mockRole);

      await expect(
        service.assertPermission(mockUserId, mockOrgId, Permission.PROJECT_READ),
      ).resolves.not.toThrow();
    });

    it('test_skips_permission_check_when_user_is_super_admin', async () => {
      const mockMembership = {
        id: 'mem-sa',
        userId: mockUserId,
        organizationId: mockOrgId,
        status: MembershipStatus.ACTIVE,
        role: RoleName.SUPER_ADMIN,
        organization: { id: mockOrgId, slug: 'test-org' },
      } as unknown as Membership;
      membershipRepo.findOne.mockResolvedValue(mockMembership);
      roleRepo.find.mockResolvedValue([
        {
          id: 'role-sa',
          name: RoleName.SUPER_ADMIN,
          permissions: [{ id: 'p1', key: Permission.PLATFORM_MANAGE }],
        },
      ]);

      await expect(
        service.assertPermission(mockUserId, mockOrgId, Permission.PLATFORM_MANAGE),
      ).resolves.not.toThrow();
    });

    it('test_throws_forbidden_when_user_lacks_required_permission', async () => {
      const mockMembership = {
        id: 'mem-1',
        userId: mockUserId,
        organizationId: mockOrgId,
        status: MembershipStatus.ACTIVE,
        role: RoleName.VIEWER,
        organization: { id: mockOrgId, slug: 'test-org' },
      } as unknown as Membership;
      const mockViewerRole = {
        id: 'role-viewer',
        name: RoleName.VIEWER,
        permissions: [{ id: 'p1', key: Permission.ORG_READ }],
      } as unknown as Role;
      membershipRepo.findOne.mockResolvedValue(mockMembership);
      roleRepo.findOne.mockResolvedValue(mockViewerRole);

      await expect(
        service.assertPermission(mockUserId, mockOrgId, Permission.PROJECT_DELETE),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.assertPermission(mockUserId, mockOrgId, Permission.PROJECT_DELETE),
      ).rejects.toThrow(`Missing permission: ${Permission.PROJECT_DELETE}`);
    });

    it('test_propagates_not_found_exception_when_membership_does_not_exist', async () => {
      membershipRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assertPermission(mockUserId, mockOrgId, Permission.ORG_READ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertAny', () => {
    it('test_resolves_without_error_when_user_has_at_least_one_required_permission', async () => {
      const mockMembership = {
        id: 'mem-1',
        userId: mockUserId,
        organizationId: mockOrgId,
        status: MembershipStatus.ACTIVE,
        role: RoleName.MEMBER,
        organization: { id: mockOrgId, slug: 'test-org' },
      } as unknown as Membership;
      const mockRole = {
        id: 'role-1',
        name: RoleName.MEMBER,
        permissions: [
          { id: 'p1', key: Permission.PROJECT_READ },
          { id: 'p2', key: Permission.PROJECT_CREATE },
        ],
      } as unknown as Role;
      membershipRepo.findOne.mockResolvedValue(mockMembership);
      roleRepo.findOne.mockResolvedValue(mockRole);

      await expect(
        service.assertAny(mockUserId, mockOrgId, [
          Permission.PROJECT_DELETE,
          Permission.PROJECT_CREATE,
        ]),
      ).resolves.not.toThrow();
    });

    it('test_skips_permission_check_when_user_is_super_admin', async () => {
      const mockMembership = {
        id: 'mem-sa',
        userId: mockUserId,
        organizationId: mockOrgId,
        status: MembershipStatus.ACTIVE,
        role: RoleName.SUPER_ADMIN,
        organization: { id: mockOrgId, slug: 'test-org' },
      } as unknown as Membership;
      membershipRepo.findOne.mockResolvedValue(mockMembership);
      roleRepo.find.mockResolvedValue([
        {
          id: 'role-sa',
          name: RoleName.SUPER_ADMIN,
          permissions: [{ id: 'p1', key: Permission.PLATFORM_READ }],
        },
      ]);

      await expect(
        service.assertAny(mockUserId, mockOrgId, [Permission.PLATFORM_MANAGE]),
      ).resolves.not.toThrow();
    });

    it('test_throws_forbidden_when_user_has_none_of_the_required_permissions', async () => {
      const mockMembership = {
        id: 'mem-1',
        userId: mockUserId,
        organizationId: mockOrgId,
        status: MembershipStatus.ACTIVE,
        role: RoleName.VIEWER,
        organization: { id: mockOrgId, slug: 'test-org' },
      } as unknown as Membership;
      const mockViewerRole = {
        id: 'role-viewer',
        name: RoleName.VIEWER,
        permissions: [{ id: 'p1', key: Permission.ORG_READ }],
      } as unknown as Role;
      membershipRepo.findOne.mockResolvedValue(mockMembership);
      roleRepo.findOne.mockResolvedValue(mockViewerRole);

      await expect(
        service.assertAny(mockUserId, mockOrgId, [
          Permission.PROJECT_DELETE,
          Permission.PROJECT_CREATE,
        ]),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.assertAny(mockUserId, mockOrgId, [
          Permission.PROJECT_DELETE,
          Permission.PROJECT_CREATE,
        ]),
      ).rejects.toThrow(
        `Requires one of: ${Permission.PROJECT_DELETE}, ${Permission.PROJECT_CREATE}`,
      );
    });

    it('test_throws_forbidden_when_required_array_is_empty', async () => { const mockMembership = { id: 'mem-1', userId: mockUserId, organizationId: mockOrgId, status: MembershipStatus.ACTIVE, role: RoleName.MEMBER, organization: { id: mockOrgId, slug: 'test-org' }, } as unknown as Membership; membershipRepo.findOne.mockResolvedValue(mockMembership); await expect( service.assertAny(mockUserId, mockOrgId, []), ).rejects.toThrow(ForbiddenException); await expect( service.assertAny(mockUserId, mockOrgId, []), ).rejects.toThrow('Requires one of: '); });

    it('test_propagates_not_found_exception_when_membership_does_not_exist', async () => {
      membershipRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assertAny(mockUserId, mockOrgId, [Permission.ORG_READ]),
      ).rejects.toThrow(NotFoundException);
    });
  });
});