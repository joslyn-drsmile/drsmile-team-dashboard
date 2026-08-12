import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const records = sqliteTable("records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  section: text("section").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  data: text("data").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  email: text("email").unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  isOwner: integer("is_owner", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
});

export const menuPermissions = sqliteTable("menu_permissions", {
  memberId: text("member_id").notNull(),
  menu: text("menu").notNull(),
  canView: integer("can_view", { mode: "boolean" }).notNull().default(true),
  canAdd: integer("can_add", { mode: "boolean" }).notNull().default(false),
  canEdit: integer("can_edit", { mode: "boolean" }).notNull().default(false),
  canDelete: integer("can_delete", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.memberId, table.menu] })]);
