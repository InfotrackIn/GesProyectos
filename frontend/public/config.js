// Configuracion en runtime. En AWS este archivo lo genera el script de deploy
// con los valores reales del stack. Para desarrollo local, edita estos valores
// o usa un archivo .env con VITE_API_URL, VITE_USER_POOL_ID, etc.
window.APP_CONFIG = {
  apiUrl: "",
  region: "us-east-1",
  userPoolId: "",
  userPoolClientId: "",
};
