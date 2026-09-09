import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE, GSI1, SLA_TABLE, SLA_PROYECTO_INDEX } from "./dynamo.js";
import type {
  Alert,
  AuditEvent,
  ExecKpi,
  ModuleSummary,
  Project,
  SchedulePhase,
  ScheduleTask,
  Sla,
  Survey,
  Task,
  WeeklyControl,
  WeeklyUpdate,
} from "../shared/types.js";

const ALL_PROJECTS = "ALLPROJECTS";

// ------------------------------ Projects ------------------------------

export async function listProjects(): Promise<Project[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: GSI1,
      KeyConditionExpression: "GSI1PK = :p",
      ExpressionAttributeValues: { ":p": ALL_PROJECTS },
    })
  );
  return (res.Items ?? []).map(stripKeys) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { PK: `PROJECT#${id}`, SK: "META" } })
  );
  return res.Item ? (stripKeys(res.Item) as Project) : null;
}

export async function putProject(p: Project): Promise<Project> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `PROJECT#${p.id}`,
        SK: "META",
        GSI1PK: ALL_PROJECTS,
        GSI1SK: `${p.process}#${p.id}`,
        type: "Project",
        ...p,
      },
    })
  );
  return p;
}

export async function deleteProject(id: string): Promise<void> {
  await ddb.send(
    new DeleteCommand({ TableName: TABLE, Key: { PK: `PROJECT#${id}`, SK: "META" } })
  );
  const updates = await listUpdates(id);
  await Promise.all(
    updates.map((u) =>
      ddb.send(
        new DeleteCommand({
          TableName: TABLE,
          Key: { PK: `PROJECT#${id}`, SK: `UPDATE#${u.date}` },
        })
      )
    )
  );
  const schedule = await listScheduleTasks(id);
  await Promise.all(
    schedule.map((t) =>
      ddb.send(
        new DeleteCommand({
          TableName: TABLE,
          Key: { PK: `PROJECT#${id}`, SK: `SCHED#${t.id}` },
        })
      )
    )
  );
  const phases = await listSchedulePhases(id);
  await Promise.all(
    phases.map((p) =>
      ddb.send(
        new DeleteCommand({
          TableName: TABLE,
          Key: { PK: `PROJECT#${id}`, SK: `PHASE#${p.id}` },
        })
      )
    )
  );
}

// --------------------------- Weekly updates ---------------------------

export async function listUpdates(projectId: string): Promise<WeeklyUpdate[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `PROJECT#${projectId}`, ":sk": "UPDATE#" },
      ScanIndexForward: false,
    })
  );
  return (res.Items ?? []).map(stripKeys) as WeeklyUpdate[];
}

export async function putUpdate(u: WeeklyUpdate): Promise<WeeklyUpdate> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `PROJECT#${u.projectId}`,
        SK: `UPDATE#${u.date}`,
        type: "WeeklyUpdate",
        ...u,
      },
    })
  );
  return u;
}

const ALL_AUDIT = "AUDIT";

export async function putAudit(e: AuditEvent): Promise<AuditEvent> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: "AUDIT",
        SK: `${e.at}#${e.id}`,
        GSI1PK: ALL_AUDIT,
        GSI1SK: `${e.at}#${e.id}`,
        type: "AuditEvent",
        ...e,
      },
    })
  );
  return e;
}

export async function listAudit(limit = 200): Promise<AuditEvent[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": "AUDIT" },
      ScanIndexForward: false,
      Limit: Math.min(Math.max(limit, 1), 500),
    })
  );
  return (res.Items ?? []).map(stripKeys) as AuditEvent[];
}

// ------------------------ Schedule (cronograma) -----------------------

export async function listSchedulePhases(projectId: string): Promise<SchedulePhase[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `PROJECT#${projectId}`, ":sk": "PHASE#" },
      ScanIndexForward: true,
    })
  );
  return (res.Items ?? []).map(stripKeys) as SchedulePhase[];
}

export async function getSchedulePhase(projectId: string, phaseId: string): Promise<SchedulePhase | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `PROJECT#${projectId}`, SK: `PHASE#${phaseId}` },
    })
  );
  return res.Item ? (stripKeys(res.Item) as SchedulePhase) : null;
}

export async function putSchedulePhase(p: SchedulePhase): Promise<SchedulePhase> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `PROJECT#${p.projectId}`,
        SK: `PHASE#${p.id}`,
        type: "SchedulePhase",
        ...p,
      },
    })
  );
  return p;
}

export async function deleteSchedulePhase(projectId: string, phaseId: string): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `PROJECT#${projectId}`, SK: `PHASE#${phaseId}` },
    })
  );
}

export async function listScheduleTasks(projectId: string): Promise<ScheduleTask[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `PROJECT#${projectId}`, ":sk": "SCHED#" },
      ScanIndexForward: true,
    })
  );
  return (res.Items ?? []).map(stripKeys) as ScheduleTask[];
}

export async function getScheduleTask(projectId: string, taskId: string): Promise<ScheduleTask | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `PROJECT#${projectId}`, SK: `SCHED#${taskId}` },
    })
  );
  return res.Item ? (stripKeys(res.Item) as ScheduleTask) : null;
}

export async function putScheduleTask(t: ScheduleTask): Promise<ScheduleTask> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `PROJECT#${t.projectId}`,
        SK: `SCHED#${t.id}`,
        type: "ScheduleTask",
        ...t,
      },
    })
  );
  return t;
}

export async function deleteScheduleTask(projectId: string, taskId: string): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `PROJECT#${projectId}`, SK: `SCHED#${taskId}` },
    })
  );
}

// ------------------------------ Surveys ------------------------------

export async function listSurveys(): Promise<Survey[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": "SURVEY" },
    })
  );
  return (res.Items ?? []).map(stripKeys) as Survey[];
}

export async function putSurvey(s: Survey): Promise<Survey> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: "SURVEY",
        SK: `${s.process}#${s.period}`,
        type: "Survey",
        ...s,
      },
    })
  );
  return s;
}

// --------------------- Executive panel (por mes) ---------------------

export interface ExecData {
  kpis: ExecKpi[];
  alerts: Alert[];
  tasks: Task[];
  controls: WeeklyControl[];
  modules: ModuleSummary[];
}

export async function getExecPanel(month: string): Promise<ExecData> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `EXEC#${month}` },
    })
  );
  const items = res.Items ?? [];
  const data: ExecData = { kpis: [], alerts: [], tasks: [], controls: [], modules: [] };
  for (const raw of items) {
    const item = stripKeys(raw);
    switch (raw.type) {
      case "ExecKpi":
        data.kpis.push(item as ExecKpi);
        break;
      case "Alert":
        data.alerts.push(item as Alert);
        break;
      case "Task":
        data.tasks.push(item as Task);
        break;
      case "WeeklyControl":
        data.controls.push(item as WeeklyControl);
        break;
      case "ModuleSummary":
        data.modules.push(item as ModuleSummary);
        break;
    }
  }
  return data;
}

export async function listAlerts(month: string): Promise<Alert[]> {
  return (await getExecPanel(month)).alerts;
}

export async function putKpi(k: ExecKpi): Promise<ExecKpi> {
  await putExecItem(`EXEC#${k.month}`, `KPI#${k.id}`, "ExecKpi", k);
  return k;
}

export async function putAlert(a: Alert, month: string): Promise<Alert> {
  await putExecItem(`EXEC#${month}`, `ALERT#${a.id}`, "Alert", { ...a, month });
  return a;
}

export async function putTask(t: Task): Promise<Task> {
  await putExecItem(`EXEC#${t.month}`, `TASK#${t.id}`, "Task", t);
  return t;
}

export async function putControl(c: WeeklyControl): Promise<WeeklyControl> {
  await putExecItem(`EXEC#${c.month}`, `CONTROL#${c.id}`, "WeeklyControl", c);
  return c;
}

export async function putModule(m: ModuleSummary): Promise<ModuleSummary> {
  await putExecItem(`EXEC#${m.month}`, `MODULE#${m.process}`, "ModuleSummary", m);
  return m;
}

export async function deleteExecItem(month: string, sk: string): Promise<void> {
  await ddb.send(
    new DeleteCommand({ TableName: TABLE, Key: { PK: `EXEC#${month}`, SK: sk } })
  );
}

async function putExecItem(pk: string, sk: string, type: string, body: object): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: { PK: pk, SK: sk, type, ...body },
    })
  );
}

// ------------------------------ SLA --------------------------------

export async function listSlas(): Promise<Sla[]> {
  const items: Sla[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(
      new ScanCommand({
        TableName: SLA_TABLE,
        ExclusiveStartKey,
      })
    );
    for (const item of res.Items ?? []) {
      items.push(item as Sla);
    }
    ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return items;
}

export async function getSla(id: string): Promise<Sla | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: SLA_TABLE, Key: { id } })
  );
  return res.Item ? (res.Item as Sla) : null;
}

export async function putSla(sla: Sla): Promise<Sla> {
  await ddb.send(
    new PutCommand({
      TableName: SLA_TABLE,
      Item: sla,
    })
  );
  return sla;
}

export async function deleteSla(id: string): Promise<void> {
  await ddb.send(
    new DeleteCommand({ TableName: SLA_TABLE, Key: { id } })
  );
}

export async function listSlasByProyecto(proyecto: string): Promise<Sla[]> {
  const items: Sla[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(
      new QueryCommand({
        TableName: SLA_TABLE,
        IndexName: SLA_PROYECTO_INDEX,
        KeyConditionExpression: "proyecto = :proyecto",
        ExpressionAttributeValues: { ":proyecto": proyecto },
        ExclusiveStartKey,
      })
    );
    for (const item of res.Items ?? []) {
      items.push(item as Sla);
    }
    ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return items;
}

// ------------------------------ helpers ------------------------------

function stripKeys<T>(item: Record<string, unknown>): T {
  const { PK, SK, GSI1PK, GSI1SK, type, ...rest } = item;
  return rest as T;
}
