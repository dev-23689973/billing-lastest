"use client";

import { useState } from "react";
import { FormField } from "@/components/forms/form-field";
import { CredentialFieldWithRefresh } from "@/components/forms/CredentialFieldWithRefresh";
import { CredentialPasswordWithRefresh } from "@/components/forms/CredentialPasswordWithRefresh";
import { cn } from "@/lib/cn";

type Layout = "page" | "modal";

type Props = {
  idPrefix: string;
  layout?: Layout;
  /** Modal horizontal field row */
  rowFieldClass?: string;
  controlClassName?: string;
};

export function EndUserCreateCredentialFields({
  idPrefix,
  layout = "page",
  rowFieldClass,
  controlClassName,
}: Props) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isModal = layout === "modal";
  const fieldProps = isModal
    ? { density: "compact" as const, layout: "horizontal" as const, className: rowFieldClass }
    : {};

  return (
    <>
      <FormField id={`${idPrefix}-name`} label="Name" {...fieldProps}>
        <CredentialFieldWithRefresh
          kind="endUserName"
          id={`${idPrefix}-name`}
          name="name"
          value={name}
          onChange={setName}
          inputClassName={controlClassName}
          autoComplete="name"
        />
      </FormField>
      <FormField
        id={`${idPrefix}-username`}
        label="Login (device ID)"
        hint="Lowercase letters and digits only."
        {...fieldProps}
      >
        <CredentialFieldWithRefresh
          kind="endUserLogin"
          id={`${idPrefix}-username`}
          name="username"
          value={username}
          onChange={setUsername}
          required
          pattern="[a-z0-9]+"
          title="Lowercase letters and digits only"
          inputClassName={cn("font-mono", controlClassName)}
          autoComplete="off"
        />
      </FormField>
      <FormField id={`${idPrefix}-password`} label="Password" hint="Minimum 4 characters." {...fieldProps}>
        <CredentialPasswordWithRefresh
          kind="endUserPassword"
          id={`${idPrefix}-password`}
          name="password"
          value={password}
          onChange={setPassword}
          required
          inputClassName={cn("font-mono", controlClassName)}
        />
      </FormField>
    </>
  );
}
