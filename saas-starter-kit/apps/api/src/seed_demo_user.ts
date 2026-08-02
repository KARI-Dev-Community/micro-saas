import { AppDataSource } from "./config/typeorm-cli";
import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "./auth/entities/user.entity";
import { Membership } from "./tenant/entities/membership.entity";
import { Organization } from "./tenant/entities/organization.entity";
import { RoleName, MembershipStatus, UserStatus } from "@shared/enums";

async function main() {
  const ds: DataSource = await AppDataSource.initialize();

  const orgRepo = ds.getRepository(Organization);
  const userRepo = ds.getRepository(User);
  const memRepo = ds.getRepository(Membership);

  let organization = await orgRepo.findOne({ where: { slug: "demo" } });
  if (!organization) {
    organization = await orgRepo.save(
      orgRepo.create({
        slug: "demo",
        name: "Demo Organization",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  }

  const existingUser = await userRepo.findOne({ where: { email: "demo.saas@kari.com" } });
  if (existingUser) {
    await memRepo.delete({ userId: existingUser.id });
    await userRepo.remove(existingUser);
    console.log("Removed existing demo user and memberships");
  }

  const passwordHash = await bcrypt.hash("demo123", 10);

  const user = await userRepo.save(
    userRepo.create({
      email: "demo.saas@kari.com",
      passwordHash,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );

  await memRepo.save(
    memRepo.create({
      userId: user.id,
      organizationId: organization.id,
      role: RoleName.SUPER_ADMIN,
      status: MembershipStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );

  await ds.destroy();
  console.log("Demo user re-seeded as super admin successfully");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
