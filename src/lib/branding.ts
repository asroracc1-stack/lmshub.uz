// Brand-level constants (domain, donation card etc.)
export const APP_DOMAIN = "lmshub.uz";
export const APP_BASE_URL = `https://${APP_DOMAIN}`;

export const DONATION = {
  cardNumber: "9860 1701 0590 7738",
  cardOwner: "Ahror Fayzullayev",
  bank: "HUMO",
};

export const REFERRAL_BONUS = 5;

export const inviteLink = (code: string) =>
  `${APP_BASE_URL}/signup?invite=${encodeURIComponent(code)}`;
