"use client";

import type { LucideIcon } from "lucide-react";
import { AtSign, Lock, UserCircle } from "lucide-react";
import { useState } from "react";
import { CredentialFieldWithRefresh } from "@/components/forms/CredentialFieldWithRefresh";
import { CredentialPasswordWithRefresh } from "@/components/forms/CredentialPasswordWithRefresh";
import type { OperatorRole } from "@/components/dashboard/operatorRoleColors";
import { cn } from "@/lib/cn";

type StaffFieldProps = {
  htmlFor: string;
  label: string;
  icon: LucideIcon;
  accentRole: OperatorRole;
  hint?: React.ReactNode;
  children: React.ReactNode;
};

type Props = {
  idPrefix: string;
  accentRole: OperatorRole;
  inputClassName?: string;
  passwordInputClassName?: string;
  StaffField: React.ComponentType<StaffFieldProps>;
  usernameHint?: React.ReactNode;
  onUsernameChange?: (username: string) => void;
};

export function StaffAddCredentialBlock({
  idPrefix,
  accentRole,
  inputClassName,
  passwordInputClassName,
  StaffField,
  usernameHint,
  onUsernameChange,
}: Props) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <>
      <StaffField htmlFor={`${idPrefix}-name`} label="Display name" icon={UserCircle} accentRole={accentRole}>
        <CredentialFieldWithRefresh
          kind="staffDisplayName"
          id={`${idPrefix}-name`}
          name="name"
          value={name}
          onChange={setName}
          required
          autoComplete="name"
          inputClassName={inputClassName}
        />
      </StaffField>
      <StaffField htmlFor={`${idPrefix}-user`} label="Username" icon={AtSign} accentRole={accentRole} hint={usernameHint}>
        <CredentialFieldWithRefresh
          kind="staffUsername"
          id={`${idPrefix}-user`}
          name="username"
          value={username}
          onChange={(v) => {
            setUsername(v);
            onUsernameChange?.(v);
          }}
          required
          autoComplete="username"
          inputClassName={cn("font-mono", inputClassName)}
        />
      </StaffField>
      <StaffField htmlFor={`${idPrefix}-pass`} label="Password" icon={Lock} accentRole={accentRole}>
        <CredentialPasswordWithRefresh
          kind="staffPassword"
          id={`${idPrefix}-pass`}
          name="password"
          value={password}
          onChange={setPassword}
          required
          inputClassName={passwordInputClassName ?? inputClassName}
        />
      </StaffField>
    </>
  );
}
