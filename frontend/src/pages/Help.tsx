import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  BarChart3,
  ClipboardList,
  Settings,
  Users,
  Filter,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import clsx from "clsx";
import { Card, Badge } from "../components/ui";

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function Help() {
  const [active, setActive] = useState("intro");

  const sections: Section[] = [
    {
      id: "intro",
      title: "Introduccion",
      icon: <BookOpen size={16} />,
      content: <IntroSection />,
    },
    {
      id: "roles",
      title: "Perfiles y acceso",
      icon: <Users size={16} />,
      content: <RolesSection />,
    },
    {
      id: "navegacion",
      title: "Navegacion y filtros",
      icon: <Filter size={16} />,
      content: <NavigationSection />,
    },
    {
      id: "vista-general",
      title: "Vista General",
      icon: <LayoutDashboard size={16} />,
      content: <OverviewSection />,
    },
    {
      id: "semanal",
      title: "Seguimiento Semanal",
      icon: <CalendarDays size={16} />,
      content: <WeeklySection />,
    },
    {
      id: "cronograma",
      title: "Cronograma por proyecto",
      icon: <CalendarRange size={16} />,
      content: <ScheduleSection />,
    },
    {
      id: "encuestas",
      title: "Encuestas NPS / CSAT",
      icon: <BarChart3 size={16} />,
      content: <SurveysSection />,
    },
    {
      id: "ejecutivo",
      title: "Panel Ejecutivo",
      icon: <ClipboardList size={16} />,
      content: <ExecutiveSection />,
    },
    {
      id: "admin",
      title: "Panel Admin",
      icon: <Settings size={16} />,
      content: <AdminSection />,
    },
    {
      id: "auditoria",
      title: "Auditoria",
      icon: <ClipboardList size={16} />,
      content: <AuditHelpSection />,
    },
    {
      id: "conceptos",
      title: "Conceptos clave",
      icon: <HelpCircle size={16} />,
      content: <ConceptsSection />,
    },
    {
      id: "faq",
      title: "Preguntas frecuentes",
      icon: <HelpCircle size={16} />,
      content: <FaqSection />,
    },
  ];

  const current = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <BookOpen size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Centro de ayuda</h1>
          <p className="text-sm text-slate-500">
            Guia funcional para usuarios de la Plataforma de Seguimiento de Proyectos
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <nav className="card h-fit p-2 lg:sticky lg:top-4">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Contenido
          </p>
          <ul className="space-y-0.5">
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setActive(s.id)}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                    active === s.id
                      ? "bg-brand-50 font-medium text-brand-700"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {s.icon}
                  {s.title}
                  {active === s.id && <ChevronRight size={14} className="ml-auto" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <article className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{current.title}</h2>
          <div className="prose-help">{current.content}</div>
        </article>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Secciones de contenido                                            */
/* ------------------------------------------------------------------ */

function IntroSection() {
  return (
  <>
    <P>
      La <strong>Plataforma de Seguimiento de Proyectos</strong> centraliza el estado de las
      iniciativas del equipo, separando tres lineas de trabajo: <Tag color="violet">PMO</Tag>,{" "}
      <Tag color="cyan">Implementacion Interna</Tag> y <Tag color="pink">CSM</Tag> (Customer
      Success Manager).
    </P>
    <P>Con esta herramienta puedes:</P>
    <Ul>
      <li>Consultar un resumen ejecutivo del estado de todos los proyectos.</li>
      <li>Actualizar semanalmente el status, los proximos pasos y el estado de cada proyecto.</li>
      <li>Gestionar el <strong>cronograma de tareas</strong> por proyecto y medir cumplimiento en dias habiles.</li>
      <li>Comparar costos planificados contra costos reales.</li>
      <li>Visualizar indicadores de satisfaccion del cliente (NPS y CSAT).</li>
      <li>Gestionar metas mensuales, alertas, tareas urgentes y control de actualizacion semanal.</li>
      <li>Consultar el historico de actualizaciones por mes y semana.</li>
    </Ul>
    <Tip>
      La plataforma reemplaza el seguimiento manual disperso en hojas de calculo y correos,
      ofreciendo una fotografia unificada de la salud de la cuenta.
    </Tip>
  </>
  );
}

function RolesSection() {
  return (
  <>
    <P>Existen dos perfiles de usuario. El acceso se otorga en el Portal de Aplicaciones (ImpactIA) segun tu grupo de Microsoft. GesProyectos no pide usuario ni contrasena propia:</P>
    <div className="my-4 grid gap-3 sm:grid-cols-2">
      <RoleCard
        title="Administrador"
        who="Director de Operaciones, Lider de PMO + Implementacion, CSM"
        permissions={[
          "Acceso completo a todos los procesos (PMO, Implementacion, CSM).",
          "Crear, editar y eliminar proyectos de cualquier proceso.",
          "Gestionar el cronograma de tareas de cualquier proyecto.",
          "Gestionar el Panel Ejecutivo (metas, alertas, tareas, modulos).",
          "Registrar y sincronizar encuestas.",
          "Cargar datos de ejemplo para pruebas.",
        ]}
      />
      <RoleCard
        title="Implementador"
        who="Equipo de Implementacion Interna"
        permissions={[
          "Solo visualiza y edita proyectos de Implementacion Interna.",
          "Puede gestionar el cronograma de sus proyectos de Implementacion.",
          "No puede acceder a proyectos de PMO ni CSM.",
          "No ve indicadores de encuestas (NPS/CSAT).",
          "Puede actualizar el seguimiento semanal de sus proyectos.",
        ]}
      />
    </div>
    <H3>Inicio de sesion</H3>
    <Ol>
      <li>Entra al Portal de Aplicaciones con tu cuenta de Microsoft.</li>
      <li>Abre GesProyectos desde el mosaico. La sesion se comparte automaticamente.</li>
      <li>El perfil Administrador corresponde a Proceso Infraestructura. El perfil Implementador corresponde a Proceso I D I.</li>
    </Ol>
  </>
  );
}

function NavigationSection() {
  return (
  <>
    <P>La barra superior contiene las pestanas principales y los filtros globales:</P>
    <Table
      headers={["Elemento", "Descripcion"]}
      rows={[
        ["Vista General", "Resumen ejecutivo con conteos, avance, presupuesto y alertas."],
        ["Seguimiento Semanal", "Tarjetas expandibles para actualizar cada proyecto."],
        ["Cronograma", "Tareas por proyecto, Gantt y cumplimiento en dias habiles (desde cada proyecto)."],
        ["Encuestas", "Registro y consulta de NPS/CSAT (solo PMO y CSM)."],
        ["Panel Ejecutivo", "Metas mensuales, alertas, tareas urgentes y control semanal."],
        ["Panel Admin", "Crear, editar y eliminar proyectos; acceso al cronograma."],
        ["Auditoria", "Quien creo, actualizo, elimino o comento, con fecha y usuario del portal."],
        ["Buscar proyecto", "Filtro global por nombre, responsable o categoria (todas las vistas)."],
        ["Ayuda", "Esta guia funcional."],
      ]}
    />
    <H3>Buscar proyecto</H3>
    <P>
      En la barra superior, a la derecha de las pestanas, esta el campo{" "}
      <strong>Buscar proyecto</strong>. Filtra por nombre, responsable o categoria y se aplica en
      Vista General, Seguimiento Semanal, Cronograma, Panel Ejecutivo, Panel Admin y Auditoria.
    </P>
    <H3>Filtro por proceso</H3>
    <P>
      Disponible en todas las pestanas excepto el Panel Ejecutivo. Opciones:{" "}
      <strong>Todos</strong>, <strong>PMO</strong>, <strong>Implementacion Interna</strong> o{" "}
      <strong>CSM</strong>. El filtro afecta los datos visibles en la pestana actual.
    </P>
    <H3>Filtros de fecha (Seguimiento Semanal)</H3>
    <P>
      En Seguimiento Semanal puedes filtrar por <strong>ano</strong> y <strong>mes</strong> para ver
      solo los proyectos cuyo periodo (inicio–fin) solapa con el mes seleccionado.
    </P>
    <H3>Filtro por mes (Panel Ejecutivo)</H3>
    <P>
      En el Panel Ejecutivo puedes navegar por mes para consultar el historico de indicadores,
      alertas, tareas y controles semanales. Este filtro es independiente del filtro de proceso
      de las demas pestanas.
    </P>
    <Tip>
      El cronograma no tiene pestana propia en la barra: se abre desde el boton{" "}
      <strong>Cronograma</strong> de cada proyecto en Seguimiento Semanal o Panel Admin.
    </Tip>
  </>
  );
}

function OverviewSection() {
  return (
  <>
    <P>
      La <Link to="/" className="font-medium text-brand-600 hover:underline">Vista General</Link>{" "}
      ofrece una fotografia rapida de la salud de la cuenta sin revisar proyecto por proyecto.
    </P>
    <H3>Que muestra</H3>
    <Ul>
      <li><strong>Conteos:</strong> total de proyectos, en control, en riesgo y criticos.</li>
      <li><strong>Avance promedio:</strong> porcentaje promedio de los proyectos visibles segun el filtro.</li>
      <li><strong>Presupuesto:</strong> costo planificado vs real, con variacion en pesos y porcentaje.</li>
      <li><strong>Resumen de encuestas:</strong> NPS, CSAT, promotores, pasivos y detractores (solo si el proceso seleccionado aplica encuestas).</li>
      <li><strong>Alertas activas:</strong> panel consolidado con severidad e impacto economico.</li>
      <li><strong>Listado de proyectos:</strong> se puede filtrar con el buscador global (nombre, responsable o categoria).</li>
      <li><strong>Grafico de distribucion:</strong> proyectos por estado (control / riesgo / critico).</li>
    </Ul>
    <H3>Comportamiento del filtro</H3>
    <Ul>
      <li>Con filtro <strong>Todos</strong>: agrega datos de todos los procesos visibles para tu perfil.</li>
      <li>Con filtro <strong>Implementacion Interna</strong>: no se muestra el bloque de encuestas.</li>
      <li>Las alertas se filtran igual que los proyectos.</li>
    </Ul>
    <Tip>
      Los colores de variacion de costo son verdes si el real esta en o por debajo del planificado,
      y rojos si lo supera.
    </Tip>
  </>
  );
}

function WeeklySection() {
  return (
  <>
    <P>
      En <Link to="/semanal" className="font-medium text-brand-600 hover:underline">Seguimiento Semanal</Link>{" "}
      cada miembro del equipo actualiza el estado de sus proyectos de forma periodica.
    </P>
    <H3>Pasos para actualizar un proyecto</H3>
    <Ol>
      <li>Localiza la tarjeta del proyecto (usa los filtros de mes/ano, estado o salud).</li>
      <li>Haz clic en la tarjeta para expandirla.</li>
      <li>Completa los campos:
        <Ul>
          <li><strong>Estado del proyecto:</strong> Sin iniciar, En progreso, Standby o Completado.</li>
          <li><strong>Salud:</strong> En control, En riesgo o Critico.</li>
          <li><strong>Responsable:</strong> persona a cargo del proyecto.</li>
          <li><strong>% de avance:</strong> porcentaje actual del proyecto (0 a 100).</li>
          <li><strong>Status actual:</strong> descripcion del avance de esta semana.</li>
          <li><strong>Proximos pasos:</strong> acciones planificadas para la siguiente semana.</li>
          <li><strong>Nota (opcional):</strong> comentario adicional. Queda firmado con tu usuario del portal.</li>
        </Ul>
      </li>
      <li>Pulsa <strong>Guardar actualizacion</strong>.</li>
    </Ol>
    <H3>Como modificar el % de avance</H3>
    <Ol>
      <li>Expande la tarjeta del proyecto.</li>
      <li>Edita el campo <strong>% de avance</strong> (0 a 100).</li>
      <li>Guarda la actualizacion. Se registra en el historial y se muestra la variacion vs el plan del cronograma.</li>
    </Ol>
    <H3>Filtros de fecha</H3>
    <P>
      Usa los selectores de <strong>ano</strong> y <strong>mes</strong> para ver solo los proyectos cuyo
      cronograma solapa con el periodo seleccionado.
    </P>
    <H3>Historial</H3>
    <P>
      Cada vez que guardas una actualizacion, se registra en el historial con fecha, autor (usuario
      logueado en el portal Impactia), porcentaje de avance y nota. El historial es visible en el
      panel derecho de la tarjeta expandida.
    </P>
    <H3>Informacion visible en la tarjeta</H3>
    <Ul>
      <li>Etiqueta de proceso (PMO, Implementacion, CSM).</li>
      <li>Estado del proyecto (Sin iniciar / En progreso / Standby / Completado).</li>
      <li>Salud (En control / En riesgo / Critico).</li>
      <li>Responsable del proyecto.</li>
      <li>Barra de avance con porcentaje.</li>
      <li>Variacion vs plan (avance ingresado contra el cronograma por fechas).</li>
      <li>Costo real vs planificado con color verde/rojo.</li>
      <li>Boton <strong>Cronograma</strong> para abrir las tareas y el cumplimiento del proyecto.</li>
    </Ul>
    <Tip>
      El boton Cronograma abre la vista de tareas del proyecto. Ahi puedes crear hitos, marcar
      cumplimiento y ver el avance esperado en dias habiles.
    </Tip>
  </>
  );
}

function ScheduleSection() {
  return (
  <>
    <P>
      Cada proyecto sigue la estructura <strong>Proyecto → Fases → Tareas</strong>, alineada con
      buenas practicas de gestion (WBS y phase-gate). Los calculos usan{" "}
      <strong>dias habiles</strong> (lunes a viernes, excluyendo festivos de Colombia).
    </P>
    <H3>Como abrir el cronograma</H3>
    <Ol>
      <li>Ve a Seguimiento Semanal o Panel Admin.</li>
      <li>En la tarjeta del proyecto, pulsa <strong>Cronograma</strong>.</li>
    </Ol>

    <H3>Fases</H3>
    <P>
      Las fases agrupan el trabajo del proyecto. Puedes crearlas manualmente o aplicar la{" "}
      <strong>plantilla estandar</strong>:
    </P>
    <Ol>
      <li>Iniciacion</li>
      <li>Planificacion</li>
      <li>Ejecucion</li>
      <li>Pruebas y UAT</li>
      <li>Despliegue</li>
      <li>Cierre</li>
    </Ol>
    <Tip>
      <strong>Phase-gate:</strong> no puedes avanzar una fase (ni trabajarla activamente) si la fase
      anterior no esta cerrada (completada o cancelada). Asi se evita saltar etapas criticas.
    </Tip>

    <H3>Tareas</H3>
    <P>
      Cada tarea pertenece a una fase. Puedes crear, editar, completar o eliminar tareas. Al completar
      todas las tareas de una fase, la fase se marca automaticamente como completada.
    </P>

    <H3>Cumplimiento</H3>
    <Table
      headers={["Nivel", "Que mide"]}
      rows={[
        ["Tarea", "A tiempo / atrasada / completada tarde, segun fecha fin y dias habiles."],
        ["Fase", "Avance ponderado de sus tareas + estado del gate."],
        ["Proyecto", "Avance real vs esperado por dias habiles (Cumple / Cerca / Atrasado)."],
      ]}
    />

    <H3>Evolutivos (proyectos cerrados)</H3>
    <P>
      Cuando el ciclo de vida del proyecto esta en <strong>Completado</strong>, puedes generar un{" "}
      <strong>evolutivo</strong>: una nueva iniciativa vinculada al proyecto padre, con plantilla de
      fases y numeracion secuencial (Evolutivo 1, 2, …). El proyecto original queda como linea base.
    </P>
    <Ol>
      <li>Abre el cronograma de un proyecto <strong>Completado</strong>.</li>
      <li>Pulsa <strong>Generar evolutivo</strong>.</li>
      <li>Confirma el nombre. Se crea el evolutivo y se abre su cronograma.</li>
    </Ol>
    <Tip>
      Los evolutivos heredan proceso y responsable del padre. Sirven para mejoras post go-live sin
      reabrir el proyecto cerrado.
    </Tip>
  </>
  );
}

function SurveysSection() {
  return (
  <>
    <P>
      La pestana <Link to="/encuestas" className="font-medium text-brand-600 hover:underline">Encuestas</Link>{" "}
      concentra los indicadores de satisfaccion del cliente. Solo aplica a procesos{" "}
      <Tag color="violet">PMO</Tag> y <Tag color="pink">CSM</Tag>.
    </P>
    <H3>Registrar un periodo manualmente</H3>
    <Ol>
      <li>Pulsa <strong>Registrar periodo</strong>.</li>
      <li>Selecciona el proceso (PMO o CSM) y el periodo (formato yyyy-mm, ej. 2026-07).</li>
      <li>Ingresa NPS, CSAT, numero de respuestas y clasificacion (promotores, pasivos, detractores).</li>
      <li>Guarda. Los datos se reflejan automaticamente en la Vista General.</li>
    </Ol>
    <H3>Sincronizar desde Supabase</H3>
    <P>
      Si la plataforma externa de encuestas esta configurada, pulsa{" "}
      <strong>Sincronizar Supabase</strong> para importar los datos automaticamente (solo lectura).
      Si no esta configurada, veras un mensaje indicando que el modo manual esta activo.
    </P>
    <Tip>
      Implementacion Interna no maneja indicadores de satisfaccion del cliente. No veras esta pestana
      con datos relevantes si tu perfil es solo Implementador.
    </Tip>
  </>
  );
}

function ExecutiveSection() {
  return (
  <>
    <P>
      El <Link to="/ejecutivo" className="font-medium text-brand-600 hover:underline">Panel Ejecutivo</Link>{" "}
      permite a la direccion evaluar el desempeno mensual de cada equipo frente a metas acordadas.
    </P>
    <H3>Secciones del panel</H3>

    <SubSection title="Metas mensuales por indicador">
      <P>Cada indicador muestra valor actual, meta, porcentaje de cumplimiento y etiqueta:</P>
      <div className="my-2 flex flex-wrap gap-2">
        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">Cumple (100%+)</Badge>
        <Badge className="border-amber-200 bg-amber-100 text-amber-700">Cerca (90-99%)</Badge>
        <Badge className="border-rose-200 bg-rose-100 text-rose-700">No cumple (&lt;90%)</Badge>
      </div>
    </SubSection>

    <SubSection title="Resumen operativo por modulo">
      <P>
        Tarjeta por proceso con total de proyectos, desglose por categoria (control/riesgo/critico),
        metricas clave y estado de actualizacion semanal del equipo. Incluye enlace directo al
        Seguimiento Semanal filtrado.
      </P>
    </SubSection>

    <SubSection title="Alertas activas">
      <P>
        Panel consolidado con severidad (<Tag color="red">Critico</Tag>,{" "}
        <Tag color="orange">Alto</Tag>, <Tag color="yellow">Medio</Tag>), titulo, descripcion y
        valor economico en riesgo. Las mismas alertas aparecen en la Vista General.
      </P>
    </SubSection>

    <SubSection title="Tareas urgentes y proximas">
      <P>
        Lista de tareas con titulo, modulo/responsable y fecha de vencimiento. Si no tiene fecha,
        se muestra como &quot;Sin fecha&quot;.
      </P>
    </SubSection>

    <SubSection title="Control de actualizacion semanal">
      <P>
        Por equipo y semana, indica si la actualizacion esta <strong>Al dia</strong> o{" "}
        <strong>Pendiente</strong>, con los responsables asignados.
      </P>
    </SubSection>

    <H3>Modo edicion (solo Administrador)</H3>
    <Ol>
      <li>Activa <strong>Modo edicion</strong> en la esquina superior derecha.</li>
      <li>Usa los botones Agregar, Editar o Eliminar en cada seccion.</li>
      <li>Pulsa <strong>Finalizar edicion</strong> al terminar.</li>
    </Ol>
    <H3>Navegacion historica</H3>
    <P>
      Usa el selector de mes en la barra superior para consultar meses anteriores. El historico se
      conserva y puede consultarse en cualquier momento.
    </P>
  </>
  );
}

function AdminSection() {
  return (
  <>
    <P>
      El <Link to="/admin" className="font-medium text-brand-600 hover:underline">Panel Admin</Link>{" "}
      permite crear, editar y eliminar proyectos.
    </P>
    <H3>Crear un proyecto</H3>
    <Ol>
      <li>Pulsa <strong>Nuevo proyecto</strong>.</li>
      <li>Completa los campos:
        <Ul>
          <li><strong>Nombre, categoria y responsable.</strong></li>
          <li><strong>Proceso:</strong> PMO, Implementacion Interna o CSM.</li>
          <li><strong>Estado del proyecto:</strong> Sin iniciar, En progreso, Standby o Completado.</li>
          <li><strong>Salud:</strong> En control, En riesgo o Critico.</li>
          <li><strong>Fecha inicio, fecha tentativa fin y fecha deal</strong> (para medir desfase).</li>
          <li><strong>% de avance</strong> del proyecto (0 a 100).</li>
          <li><strong>Costos:</strong> setup planificado, recurrente planificado y costo real.</li>
          <li><strong>Ingreso mensual y valor total del proyecto.</strong></li>
        </Ul>
      </li>
      <li>Guarda. El proyecto aparecera en todas las pestanas segun su proceso.</li>
    </Ol>
    <H3>Desfase de fechas</H3>
    <P>
      Cada proyecto tiene tres fechas clave: <strong>inicio</strong>, <strong>tentativa de fin</strong>{" "}
      (plan interno) y <strong>deal</strong> (compromiso de entrega). El sistema calcula:
    </P>
    <Ul>
      <li><strong>Duracion plan:</strong> dias calendario de inicio a tentativa.</li>
      <li><strong>Duracion deal:</strong> dias calendario de inicio a deal.</li>
      <li>
        <strong>Desfase:</strong> diferencia tentativa − deal. Positivo (rojo) = la tentativa supera
        el deal; negativo o cero (verde) = holgura o alineado.
      </li>
    </Ul>
    <H3>Editar, eliminar o abrir cronograma</H3>
    <P>
      En cada tarjeta: icono de calendario para el <strong>cronograma</strong>, lapiz para editar y
      papelera para eliminar. Los cambios se reflejan de inmediato en el resto de la plataforma.
    </P>
    <H3>Datos de ejemplo</H3>
    <P>
      Los administradores pueden cargar un conjunto de datos de prueba con el boton{" "}
      <strong>Datos de ejemplo</strong> (proyectos, encuestas, panel ejecutivo y tareas de cronograma
      de muestra).
    </P>
    <Tip>
      El perfil Implementador solo puede crear y editar proyectos de Implementacion Interna. El
      campo de proceso estara bloqueado en ese perfil.
    </Tip>
  </>
  );
}

function AuditHelpSection() {
  return (
  <>
    <P>
      La pestana <Link to="/auditoria" className="font-medium text-brand-600 hover:underline">Auditoria</Link>{" "}
      muestra quien realizo cada cambio, usando la sesion del portal Impactia.
    </P>
    <H3>Que se registra</H3>
    <Ul>
      <li>Altas, cambios y bajas de proyectos, fases, tareas y evolutivos.</li>
      <li>Actualizaciones y comentarios del seguimiento semanal.</li>
      <li>Cambios en encuestas y en el panel ejecutivo (KPIs, alertas, controles).</li>
    </Ul>
    <H3>Como identificar al autor</H3>
    <P>
      Cada evento muestra el nombre y el correo de la persona logueada. En el historial de
      Seguimiento Semanal, cada comentario y actualizacion tambien indica quien lo escribio.
    </P>
    <Tip>
      Los registros anteriores a esta funcion aparecen como &quot;Usuario no registrado&quot; porque
      no tenian autor asociado.
    </Tip>
  </>
  );
}

function ConceptsSection() {
  return (
  <>
    <H3>Procesos</H3>
    <Table
      headers={["Proceso", "Descripcion", "Encuestas"]}
      rows={[
        ["PMO", "Seguimiento de proyectos de cara al cliente y su cronograma.", "Si"],
        ["Implementacion Interna", "Despliegues tecnicos internos sin contacto directo de encuesta.", "No"],
        ["CSM", "Seguimiento post-venta y satisfaccion del cliente.", "Si"],
      ]}
    />

    <H3>Estados del proyecto (ciclo de vida)</H3>
    <Table
      headers={["Estado", "Significado"]}
      rows={[
        ["Sin iniciar", "El proyecto aun no ha comenzado."],
        ["En progreso", "El proyecto esta en ejecucion."],
        ["Standby", "Pausado por dependencia o decision del equipo."],
        ["Completado", "El proyecto finalizo."],
      ]}
    />

    <H3>Salud del proyecto</H3>
    <Table
      headers={["Salud", "Significado"]}
      rows={[
        ["En control", "El proyecto avanza segun lo planificado."],
        ["En riesgo", "Existen desviaciones que requieren atencion."],
        ["Critico", "Situacion que requiere accion inmediata de la direccion."],
      ]}
    />

    <H3>Calculo de avance (porcentaje del proyecto)</H3>
    <P>
      El % de avance del proyecto lo ingresa el equipo (desde Seguimiento Semanal o Panel Admin).
      El sistema compara ese valor contra lo planificado por fechas para mostrar la variacion.
    </P>
    <Ul>
      <li>El usuario ingresa el porcentaje directamente (0 a 100).</li>
      <li>Se muestra la variacion respecto a lo planificado por fechas.</li>
      <li>El <strong>avance del cronograma de tareas</strong> es independiente; se calcula con el peso y los dias habiles de cada tarea (ver seccion Cronograma).</li>
    </Ul>

    <H3>Dias habiles</H3>
    <Ul>
      <li>Lunes a viernes.</li>
      <li>Se excluyen festivos de Colombia (incluyendo Ley Emiliani).</li>
      <li>Se usan para duracion de tareas, avance esperado y cumplimiento del cronograma.</li>
    </Ul>

    <H3>Costos</H3>
    <Ul>
      <li><strong>Planificado</strong> = costo de setup + costo recurrente planificado.</li>
      <li><strong>Real</strong> = valor actualizado manualmente (puede variar mes a mes).</li>
      <li><strong>Variacion</strong> = real - planificado, en pesos y porcentaje.</li>
      <li>Verde si esta en o por debajo del presupuesto; rojo si lo supera.</li>
    </Ul>

    <H3>Indicadores de encuesta</H3>
    <Table
      headers={["Indicador", "Descripcion"]}
      rows={[
        ["NPS", "Net Promoter Score: medida de lealtad del cliente."],
        ["CSAT", "Customer Satisfaction: nivel de satisfaccion."],
        ["Promotores", "Clientes que recomendarian el servicio."],
        ["Pasivos", "Clientes neutrales."],
        ["Detractores", "Clientes insatisfechos."],
      ]}
    />
  </>
  );
}

function FaqSection() {
  const faqs = [
    {
      q: "Como inicio sesion?",
      a: "Entra al Portal de Aplicaciones ImpactIA con Microsoft y abre GesProyectos desde el mosaico. No hay usuario ni contrasena propia.",
    },
    {
      q: "No veo proyectos de PMO o CSM, solo de Implementacion.",
      a: "Tu perfil es Implementador. Solo tienes acceso a proyectos de Implementacion Interna. Contacta al administrador si necesitas otro nivel de acceso.",
    },
    {
      q: "Por que no aparece el resumen de encuestas en la Vista General?",
      a: "Las encuestas solo aplican a PMO y CSM. Si el filtro esta en Implementacion Interna, el bloque de encuestas se oculta automaticamente.",
    },
    {
      q: "Como busco un proyecto?",
      a: "Usa el campo Buscar proyecto en la barra superior. Filtra por nombre, responsable o categoria y se mantiene al cambiar de pestana. Para limpiarlo, pulsa la X.",
    },
    {
      q: "Como cambio el mes en el Panel Ejecutivo?",
      a: "Usa el selector de mes en la barra superior (visible solo en la pestana Panel Ejecutivo). Puedes consultar meses anteriores en cualquier momento.",
    },
    {
      q: "Como modifico el porcentaje de avance?",
      a: "En Seguimiento Semanal, expande la tarjeta del proyecto, edita el % de avance y guarda. Tambien puedes hacerlo desde Panel Admin.",
    },
    {
      q: "Donde esta el cronograma del proyecto?",
      a: "En Seguimiento Semanal o Panel Admin, pulsa el boton Cronograma. Ahi gestionas fases y tareas, ves el Gantt y el cumplimiento en dias habiles.",
    },
    {
      q: "Que es un phase-gate?",
      a: "Es una regla de buenas practicas: no puedes avanzar una fase si la anterior no esta cerrada. Evita saltar etapas como pruebas o cierre.",
    },
    {
      q: "Como genero un evolutivo?",
      a: "El proyecto debe estar en estado Completado. Abre su cronograma y pulsa Generar evolutivo. Se crea un proyecto hijo con plantilla de fases vinculado al padre.",
    },
    {
      q: "Que diferencia hay entre avance del proyecto y avance del cronograma?",
      a: "El avance del proyecto es el % que ingresas en la tarjeta. El avance del cronograma se calcula con fases y tareas, su peso y los dias habiles.",
    },
    {
      q: "Que son los dias habiles?",
      a: "Lunes a viernes, excluyendo festivos de Colombia (incluyendo traslados por Ley Emiliani). Se usan para medir duracion y cumplimiento del cronograma.",
    },
    {
      q: "Como se calcula el cumplimiento del cronograma?",
      a: "Se compara el avance real de las tareas (ponderado) contra el avance esperado segun los dias habiles ya transcurridos del proyecto. Cumple si va al 100% o mas, Cerca si esta entre 90 y 99%, Atrasado si es menor a 90%.",
    },
    {
      q: "Como sincronizo las encuestas desde la plataforma externa?",
      a: 'En la pestana Encuestas, pulsa "Sincronizar Supabase". Si no esta configurada, el administrador debe proporcionar la URL y anon key de Supabase al equipo tecnico.',
    },
    {
      q: "Quien puede editar las metas y alertas del Panel Ejecutivo?",
      a: "Solo los usuarios con perfil Administrador, activando el Modo edicion en el Panel Ejecutivo.",
    },
    {
      q: "Se guarda el historico de actualizaciones semanales?",
      a: "Si. Cada guardado en Seguimiento Semanal registra fecha, autor, avance, estado y nota. El historico es consultable en la tarjeta expandida de cada proyecto y tambien en Auditoria.",
    },
    {
      q: "Donde veo quien hizo un cambio?",
      a: "En la pestana Auditoria aparece el listado de altas, cambios, bajas y comentarios con el usuario del portal. En Seguimiento Semanal, cada comentario del historial muestra quien lo escribio.",
    },
    {
      q: "Como cierro sesion?",
      a: "Pulsa el icono de salida en la esquina superior derecha de la barra de navegacion.",
    },
  ];

  return (
    <div className="space-y-3">
      {faqs.map((f) => (
        <details key={f.q} className="rounded-lg border border-slate-200 p-4">
          <summary className="cursor-pointer font-medium text-slate-800">{f.q}</summary>
          <p className="mt-2 text-sm text-slate-600">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Componentes auxiliares de contenido                               */
/* ------------------------------------------------------------------ */

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-slate-600">{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-800">{children}</h3>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-slate-600">{children}</ul>;
}

function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">{children}</ol>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 flex gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-brand-600" />
      <span>{children}</span>
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: "violet" | "cyan" | "pink" | "red" | "orange" | "yellow" }) {
  const colors = {
    violet: "bg-violet-100 text-violet-700",
    cyan: "bg-cyan-100 text-cyan-700",
    pink: "bg-pink-100 text-pink-700",
    red: "bg-rose-100 text-rose-700",
    orange: "bg-orange-100 text-orange-700",
    yellow: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={clsx("rounded px-1.5 py-0.5 text-xs font-medium", colors[color])}>
      {children}
    </span>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
      <h4 className="mb-2 text-sm font-semibold text-slate-800">{title}</h4>
      <div className="text-sm text-slate-600">{children}</div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            {headers.map((h) => (
              <th key={h} className="p-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100">
              {row.map((cell, j) => (
                <td key={j} className="p-2 text-slate-600">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleCard({
  title,
  who,
  permissions,
}: {
  title: string;
  who: string;
  permissions: string[];
}) {
  return (
    <Card className="space-y-2">
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="text-xs text-slate-500">{who}</div>
      <ul className="list-disc space-y-1 pl-4 text-sm text-slate-600">
        {permissions.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Card>
  );
}
