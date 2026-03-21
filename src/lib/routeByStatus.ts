import { ProcedureStatus } from '../types/enums';

const STATUS_TO_SCREEN: Record<ProcedureStatus, string> = {
  [ProcedureStatus.CAPSULE_RETURN_PENDING]: '/checkin',
  [ProcedureStatus.CAPSULE_RECEIVED]: '/capsule-upload',
  [ProcedureStatus.READY_FOR_REVIEW]: '/viewer',
  [ProcedureStatus.DRAFT]: '/report',
  [ProcedureStatus.APPENDED_DRAFT]: '/report',
  [ProcedureStatus.COMPLETED]: '/summary',
  [ProcedureStatus.COMPLETED_APPENDED]: '/summary',
  [ProcedureStatus.CLOSED]: '/summary',
  [ProcedureStatus.VOID]: '/summary',
};

export const routeByStatus = (status: ProcedureStatus, procId: string): string => {
  const baseRoute = STATUS_TO_SCREEN[status] || '/summary';
  return `${baseRoute}/${procId}`;
};
