import "i18next";
import type { Messages } from "./en";

declare module "i18next" {
  interface CustomTypeOptions {
    resources: { translation: Messages };
  }
}
