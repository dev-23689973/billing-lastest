/** Client-safe role label for profile / HUD copy (matches header stats). */
export function sessionRoleLabel(type: string): string {
  switch (type) {
    case "ROOT":
      return "Admin";
    case "MNGR":
      return "Manager";
    case "SRSLR":
      return "Reseller";
    case "RSLR":
      return "Dealer";
    default:
      return type || "User";
  }
}

export function mobileProfileActiveMetric(isAdmin: boolean): { label: string; hint: string } {
  return isAdmin
    ? {
        label: "Active subscribers",
        hint: "Accounts with an active subscription",
      }
    : {
        label: "Active clients",
        hint: "Subscribers active under your network",
      };
}

export function mobileProfileCreditsMetric(isAdmin: boolean): { label: string; hint: string } {
  return isAdmin
    ? {
        label: "Wallet credits",
        hint: "Unlimited for admin accounts",
      }
    : {
        label: "Wallet credits",
        hint: "Available for renewals and new users",
      };
}
