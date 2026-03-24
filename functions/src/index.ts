/**
 * ZoCW Data Model and Type System for Cloud Functions
 * Simplified version for backend use with firebase-admin Timestamps
 */

// Enums
export * from './enums';

// Type exports
export type { Patient, Address, InsuranceInfo, ContactInfo } from './patient';
export type { Procedure, PreProcedureCheck, PreReviewConfig, TransitTimes, ContraindicationReview } from './procedure';
export type { Finding, FrameReference, Annotation, ModificationEntry } from './finding';
export type { Report, CodeEntry, RiskScore, ReferralEntry, SupplementalSection, DeliveryRecord, DeliveryDefaults, ReportSection, SimpleReportSections, AutoDraftSection, AutoDraftReport } from './report';
export type { User, NotificationPreferences, Delegation } from './user';
export type { Practice, PracticeSettings, Clinic, SubscriptionInfo, PracticeNotificationConfig, PhiMaskingRule, EmrConfig, AnnotationTemplate, CapsuleInventoryItem, DeliveryDefaults as PracticeDeliveryDefaults } from './practice';
export type { AuditEntry, AuditAction } from './audit';
export type { AppNotification } from './notification';
