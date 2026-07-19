import "server-only";

import { query } from "@/lib/db";
import { randomUUID } from "crypto";

// Server-side data access for the example "projects" feature. Scoped to
// the authenticated user_id everywhere — never trust a client-supplied id.
// Server-only by convention (no Client Component should import this).

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: Date;
}

export async function listProjectsByUserId(
  userId: string
): Promise<Project[]> {
  const [rows] = await query<Project[]>(
    `select id, user_id, name, description, created_at
       from projects
      where user_id = :userId
      order by created_at desc`,
    { userId }
  );
  return rows;
}

export async function createProject(
  userId: string,
  name: string,
  description: string | null
): Promise<Project> {
  const id = randomUUID();
  await query(
    `insert into projects (id, user_id, name, description)
       values (:id, :userId, :name, :description)`,
    { id, userId, name, description }
  );
  const [rows] = await query<Project[]>(
    `select id, user_id, name, description, created_at
       from projects where id = :id limit 1`,
    { id }
  );
  return rows[0];
}

export async function countProjectsByUserId(
  userId: string
): Promise<number> {
  const [rows] = await query<{ c: number }[]>(
    `select count(*) as c from projects where user_id = :userId`,
    { userId }
  );
  return rows[0]?.c ?? 0;
}
