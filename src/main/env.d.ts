/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_UL_CONF_AK: string
  readonly VITE_UL_CONF_SK: string
  readonly VITE_UL_CONF_FILEKEY: string
  readonly VITE_UL_CONF_URL: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}