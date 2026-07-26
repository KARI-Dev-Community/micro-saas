import { AppDataSource } from "./config/typeorm-cli";
import { DataSource } from "typeorm";
import { User } from "./auth/entities/user.entity";
import { Role } from "./tenant/entities/role.entity";
import { Permission } from "./tenant/entities/permission.entity";
import { Membership } from "./tenant/entities/membership.entity";
import { Organization } from "./tenant/entities/organization.entity";
import { RoleName, MembershipStatus } from "@shared/enums";

async function main() {
  const ds: DataSource = await AppDataSource.initialize();

  // Ensure organization exists (create if not)
  let organization = await ds.getRepository(Organization).findOne({ where: { slug: "demo" } });
  if (!organization) {
    organization = await ds.getRepository(Organization).create({
      slug: "demo",
      name: "Demo Organization",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await ds.getRepository(Organization).save(organization);
  }

  // Insert user
  const user = await ds.getRepository(User).create({
    email: "demo.saas@kari.com",
    status: "active" as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await ds.getRepository(User).save(user);

  // Insert membership with role SUPER_ADMIN (enum value)
  const membership = await ds.getRepository(Membership).create({
    userId: user.id,
    organizationId: organization.id,
    role: RoleName.SUPER_ADMIN,
    status: MembershipStatus.ACTIVE as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await ds.getRepository(Membership).save(membership);

  await ds.destroy();
  console.log("Demo user and membership created successfully");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});