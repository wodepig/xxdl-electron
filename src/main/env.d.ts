/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_UPD_AK: string
  readonly VITE_UPD_SLUG: string
  readonly VITE_UPD_URL: string
  readonly VITE_UL_CONF_URL: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}