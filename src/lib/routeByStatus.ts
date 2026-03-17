import { ProcedureStatus } from '../types/enums';

const STATUS_TO_SCREEN: Record<ProcedureStatus, string> = {
  [ProcedureStatus.CAPSULE_RETURN_PENDING]: '/workflow/checkin',
  [ProcedureStatus.CAPSULE_RECEIVED]: '/workflow/upload',
  [ProcedureStatus.READY_FOR_REVIEW]: '/workflow/viewer',
  [ProcedureStatus.DRAFT]: '/workflow/report',
  [ProcedureStatus.APPENDED_DRAFT]: '/workflow/report',
  [ProcedureStatus.COMPLETED]: '/workflow/summary',
  [ProcedureStatus.COMPLETED_APPENDED]: '/workflow/summary',
  [ProcedureStatus.CLOSED]: '/workflow/summary',
  [ProcedureStatus.VOID]: '/workflow/summary',
};

export const routeByStatus = (status: ProcedureStatus, procId: string): string => {
  const baseRoute = STATUS_TO_SCREEN[status] || '/workflow/summary';
  return `${baseRoute}/${procId}`;
};