import { PORTAL_URL } from "../auth/portal";
import { isConfigured } from "../config";

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-brand-50 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            SP
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Seguimiento de Proyectos</h1>
          <p className="text-sm text-slate-500">PMO · Implementacion Interna · CSM</p>
        </div>

        {!isConfigured && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            La aplicacion aun no esta configurada (falta el despliegue en AWS).
          </div>
        )}

        <p className="mb-4 text-center text-sm text-slate-600">
          Esta aplicacion se abre desde el Portal de Aplicaciones, con la misma sesion de Microsoft.
          Si ves un error de sesion (401), cierra esta pestana y vuelve a entrar desde el portal.
        </p>
        <a href={PORTAL_URL} className="btn-primary block w-full text-center">
          Ir al portal ImpactIA
        </a>
      </div>
    </div>
  );
}
