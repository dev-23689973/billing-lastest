/** Staff / hierarchy payloads safe to send to client components and modal APIs. */

export type WithoutPassword<T> = Omit<T, "password">;

export function omitPasswordField<T extends { password?: string }>(row: T): WithoutPassword<T> {
  const { password: _password, ...rest } = row;
  return rest;
}

/** Staff editor GET response — password is never sent; use blank field to keep existing on save. */
export function toStaffEditorClientDto<T extends { password?: string }>(data: T): WithoutPassword<T> {
  return omitPasswordField(data);
}

/** Hierarchy profile modal — password omitted; use staff editor to change credentials. */
export function toHierarchyProfileClientDto<T extends { password?: string }>(profile: T): WithoutPassword<T> {
  return omitPasswordField(profile);
}
