/**
 * Shared Zod validation schemas for all callable function inputs.
 * Ensures consistent input validation across all Cloud Functions.
 *
 * These schemas are reusable and composable for building complex validation rules.
 */

import { z } from 'zod';

/**
 * Procedure ID validation schema
 */
export const procedureIdSchema = z.string().uuid('Invalid procedure ID format');

/**
 * Report ID validation schema
 */
export const reportIdSchema = z.string().uuid('Invalid report ID format');

/**
 * Practice ID validation schema
 */
export const practiceIdSchema = z.string().uuid('Invalid practice ID format');

/**
 * Serial number validation (alphanumeric, 10-20 chars)
 */
export const serialNumberSchema = z
  .string()
  .min(10, 'Serial number too short')
  .max(20, 'Serial number too long')
  .regex(/^[A-Z0-9]+$/, 'Serial number must contain only uppercase letters and numbers');

/**
 * Lot number validation (alphanumeric, 6-15 chars)
 */
export const lotNumberSchema = z
  .string()
  .min(6, 'Lot number too short')
  .max(15, 'Lot number too long')
  .regex(/^[A-Z0-9]+$/, 'Lot number must contain only uppercase letters and numbers');

/**
 * Variant validation for PDF generation
 */
export const pdfVariantSchema = z.enum(['internal', 'patient']);

/**
 * Confidence score validation (0-1.0)
 */
export const confidenceScoreSchema = z
  .number()
  .min(0, 'Confidence must be >= 0')
  .max(1, 'Confidence must be <= 1');

/**
 * Validate Generate Auto-Draft input
 */
export const generateAutoDraftInputSchema = z.object({
  procedureId: procedureIdSchema,
});

export type GenerateAutoDraftInput = z.infer<typeof generateAutoDraftInputSchema>;

/**
 * Validate Suggest Codes input
 */
export const suggestCodesInputSchema = z.object({
  procedureId: procedureIdSchema,
});

export type SuggestCodesInput = z.infer<typeof suggestCodesInputSchema>;

/**
 * Validate Generate Report PDF input
 */
export const generateReportPdfInputSchema = z.object({
  reportId: reportIdSchema,
  variant: pdfVariantSchema,
});

export type GenerateReportPdfInput = z.infer<typeof generateReportPdfInputSchema>;

/**
 * Validate Capsule Validation input
 */
export const validateCapsuleInputSchema = z.object({
  serialNumber: serialNumberSchema,
  lotNumber: lotNumberSchema,
  practiceId: practiceIdSchema,
});

export type ValidateCapsuleInput = z.infer<typeof validateCapsuleInputSchema>;

/**
 * Validate Calculate Transit Times input
 */
export const calculateTransitTimesInputSchema = z.object({
  procedureId: procedureIdSchema,
});

export type CalculateTransitTimesInput = z.infer<typeof calculateTransitTimesInputSchema>;

/**
 * Audit logger input validation
 */
export const auditLoggerInputSchema = z.object({
  practiceId: practiceIdSchema,
  procedureId: procedureIdSchema.optional(),
  patientId: z.string().uuid().optional(),
  userId: z.string().min(1, 'User ID is required'),
  action: z.string().min(1, 'Action is required'),
  entityType: z.enum(['procedure', 'patient', 'report', 'finding', 'user', 'practice', 'notification', 'clinic', 'education']),
  entityId: z.string().min(1, 'Entity ID is required'),
  details: z.record(z.any()).optional(),
  previousState: z.record(z.any()).optional(),
  newState: z.record(z.any()).optional(),
});

/**
 * Validate Get Capsule Frames input
 * capsuleSerial is the capsule_id from the pipeline — matches procedure.capsuleSerialNumber
 */
export const getCapsuleFramesInputSchema = z.object({
  capsuleSerial: z.string().min(1, 'Capsule serial is required').max(100, 'Capsule serial too long'),
});

export type GetCapsuleFramesInput = z.infer<typeof getCapsuleFramesInputSchema>;

/**
 * Notification dispatcher input validation
 */
export const notificationDispatcherInputSchema = z.object({
  practiceId: practiceIdSchema,
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum([
    'study_assigned',
    'signature_required',
    'qa_alert',
    'recall_notice',
    'transfer_request',
    'delivery_confirmed',
    'system',
    'education_assigned',
  ]),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  body: z.string().min(1, 'Body is required').max(500, 'Body too long'),
  routeTo: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  isMandatory: z.boolean().optional(),
});
