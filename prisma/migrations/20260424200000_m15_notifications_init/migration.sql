-- NAWASENA M15 Notifications & Reminders Infrastructure Migration
-- Creates 7 notification tables + 6 new enums.
-- Extends AuditAction enum with M15 events.
-- Adds RLS policies for tenant isolation.

-- ============================================
-- Step 1: Extend AuditAction enum (M15 events)
-- ============================================

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'NOTIFICATION_RULE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'NOTIFICATION_RULE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'NOTIFICATION_RULE_DELETE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'NOTIFICATION_TEMPLATE_PUBLISH';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'NOTIFICATION_PREFERENCE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CRON_MANUAL_TRIGGER';

-- ============================================
-- Step 2: Create M15 enums (6 new types)
-- ============================================

CREATE TYPE "ChannelType" AS ENUM ('PUSH', 'EMAIL', 'WHATSAPP', 'IN_APP');
CREATE TYPE "NotificationCategory" AS ENUM ('CRITICAL', 'FORM_REMINDER', 'NORMAL', 'OPS');
CREATE TYPE "LogStatus" AS ENUM (
  'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED',
  'SKIPPED_USER_OPTOUT', 'SKIPPED_NO_SUBSCRIPTION', 'SKIPPED_BOUNCE_COOLDOWN',
  'ESCALATED_INSTEAD_OF_SEND'
);
CREATE TYPE "TemplateFormat" AS ENUM ('PLAIN', 'MARKDOWN', 'REACT_EMAIL');
CREATE TYPE "RuleExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- ============================================
-- Step 3: Create notification_templates table
-- ============================================

CREATE TABLE "notification_templates" (
    "id"                TEXT NOT NULL,
    "templateKey"       TEXT NOT NULL,
    "description"       TEXT NOT NULL,
    "category"          "NotificationCategory" NOT NULL,
    "organizationId"    TEXT,
    "activeVersionId"   TEXT,
    "supportedChannels" "ChannelType"[],
    "payloadSchema"     JSONB NOT NULL,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_templates_templateKey_idx" ON "notification_templates"("templateKey");
CREATE INDEX "notification_templates_organizationId_idx" ON "notification_templates"("organizationId");
CREATE UNIQUE INDEX "notification_templates_organizationId_templateKey_key" ON "notification_templates"("organizationId", "templateKey");

-- ============================================
-- Step 4: Create notification_template_versions table
-- ============================================

CREATE TABLE "notification_template_versions" (
    "id"          TEXT NOT NULL,
    "templateId"  TEXT NOT NULL,
    "version"     TEXT NOT NULL,
    "format"      "TemplateFormat" NOT NULL,
    "content"     JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "notification_template_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_template_versions_templateId_idx" ON "notification_template_versions"("templateId");
CREATE UNIQUE INDEX "notification_template_versions_templateId_version_key" ON "notification_template_versions"("templateId", "version");

-- ============================================
-- Step 5: Create notification_rules table
-- ============================================

CREATE TABLE "notification_rules" (
    "id"                  TEXT NOT NULL,
    "organizationId"      TEXT,
    "isGlobal"            BOOLEAN NOT NULL DEFAULT false,
    "name"                TEXT NOT NULL,
    "description"         TEXT,
    "templateKey"         TEXT NOT NULL,
    "cronExpression"      TEXT NOT NULL,
    "timezone"            TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "category"            "NotificationCategory" NOT NULL,
    "channels"            "ChannelType"[],
    "audienceResolverKey" TEXT NOT NULL,
    "audienceParams"      JSONB,
    "maxRemindersPerWeek" INTEGER NOT NULL DEFAULT 3,
    "active"              BOOLEAN NOT NULL DEFAULT true,
    "overridesRuleId"     TEXT,
    "lastExecutedAt"      TIMESTAMP(3),
    "createdById"         TEXT NOT NULL,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_rules_organizationId_active_idx" ON "notification_rules"("organizationId", "active");
CREATE INDEX "notification_rules_isGlobal_idx" ON "notification_rules"("isGlobal");
CREATE INDEX "notification_rules_templateKey_idx" ON "notification_rules"("templateKey");
CREATE INDEX "notification_rules_overridesRuleId_idx" ON "notification_rules"("overridesRuleId");

-- ============================================
-- Step 6: Create notification_rule_executions table
-- ============================================

CREATE TABLE "notification_rule_executions" (
    "id"             TEXT NOT NULL,
    "ruleId"         TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "startedAt"      TIMESTAMP(3) NOT NULL,
    "completedAt"    TIMESTAMP(3),
    "status"         "RuleExecutionStatus" NOT NULL,
    "usersTargeted"  INTEGER NOT NULL DEFAULT 0,
    "usersSent"      INTEGER NOT NULL DEFAULT 0,
    "usersFailed"    INTEGER NOT NULL DEFAULT 0,
    "usersEscalated" INTEGER NOT NULL DEFAULT 0,
    "triggeredBy"    TEXT NOT NULL,
    "executionToken" TEXT NOT NULL,
    "errorMessage"   TEXT,

    CONSTRAINT "notification_rule_executions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_rule_executions_executionToken_key" ON "notification_rule_executions"("executionToken");
CREATE INDEX "notification_rule_executions_ruleId_startedAt_idx" ON "notification_rule_executions"("ruleId", "startedAt" DESC);
CREATE INDEX "notification_rule_executions_organizationId_startedAt_idx" ON "notification_rule_executions"("organizationId", "startedAt" DESC);
CREATE INDEX "notification_rule_executions_status_idx" ON "notification_rule_executions"("status");

-- ============================================
-- Step 7: Create notification_logs table
-- ============================================

CREATE TABLE "notification_logs" (
    "id"                TEXT NOT NULL,
    "organizationId"    TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "ruleId"            TEXT,
    "ruleExecutionId"   TEXT,
    "templateKey"       TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "channel"           "ChannelType" NOT NULL,
    "category"          "NotificationCategory" NOT NULL,
    "status"            "LogStatus" NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage"      TEXT,
    "retryCount"        INTEGER NOT NULL DEFAULT 0,
    "criticalOverride"  BOOLEAN NOT NULL DEFAULT false,
    "metadata"          JSONB,
    "sentAt"            TIMESTAMP(3),
    "deliveredAt"       TIMESTAMP(3),
    "failedAt"          TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_logs_organizationId_createdAt_idx" ON "notification_logs"("organizationId", "createdAt" DESC);
CREATE INDEX "notification_logs_userId_createdAt_idx" ON "notification_logs"("userId", "createdAt" DESC);
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");
CREATE INDEX "notification_logs_templateKey_createdAt_idx" ON "notification_logs"("templateKey", "createdAt" DESC);
CREATE INDEX "notification_logs_providerMessageId_idx" ON "notification_logs"("providerMessageId");
CREATE INDEX "notification_logs_ruleExecutionId_userId_idx" ON "notification_logs"("ruleExecutionId", "userId");

-- ============================================
-- Step 8: Create notification_subscriptions table
-- ============================================

CREATE TABLE "notification_subscriptions" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "endpoint"       TEXT NOT NULL,
    "p256dh"         TEXT NOT NULL,
    "auth"           TEXT NOT NULL,
    "userAgent"      TEXT,
    "status"         "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastUsedAt"     TIMESTAMP(3),
    "lastErrorAt"    TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_subscriptions_userId_endpoint_key" ON "notification_subscriptions"("userId", "endpoint");
CREATE INDEX "notification_subscriptions_userId_status_idx" ON "notification_subscriptions"("userId", "status");
CREATE INDEX "notification_subscriptions_organizationId_idx" ON "notification_subscriptions"("organizationId");
CREATE INDEX "notification_subscriptions_status_idx" ON "notification_subscriptions"("status");

-- ============================================
-- Step 9: Create notification_preferences table
-- ============================================

CREATE TABLE "notification_preferences" (
    "userId"           TEXT NOT NULL,
    "organizationId"   TEXT NOT NULL,
    "pushEnabled"      BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled"     BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled"  BOOLEAN NOT NULL DEFAULT false,
    "digestMode"       TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "emailBouncedAt"   TIMESTAMP(3),
    "unsubscribeToken" TEXT NOT NULL,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "notification_preferences_unsubscribeToken_key" ON "notification_preferences"("unsubscribeToken");
CREATE INDEX "notification_preferences_organizationId_idx" ON "notification_preferences"("organizationId");
CREATE INDEX "notification_preferences_unsubscribeToken_idx" ON "notification_preferences"("unsubscribeToken");

-- ============================================
-- Step 10: Add Foreign Keys
-- ============================================

ALTER TABLE "notification_templates"
    ADD CONSTRAINT "notification_templates_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_templates"
    ADD CONSTRAINT "notification_templates_activeVersionId_fkey"
    FOREIGN KEY ("activeVersionId") REFERENCES "notification_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_template_versions"
    ADD CONSTRAINT "notification_template_versions_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_template_versions"
    ADD CONSTRAINT "notification_template_versions_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_rules"
    ADD CONSTRAINT "notification_rules_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_rules"
    ADD CONSTRAINT "notification_rules_overridesRuleId_fkey"
    FOREIGN KEY ("overridesRuleId") REFERENCES "notification_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_rules"
    ADD CONSTRAINT "notification_rules_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_rule_executions"
    ADD CONSTRAINT "notification_rule_executions_ruleId_fkey"
    FOREIGN KEY ("ruleId") REFERENCES "notification_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_rule_executions"
    ADD CONSTRAINT "notification_rule_executions_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_logs"
    ADD CONSTRAINT "notification_logs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_logs"
    ADD CONSTRAINT "notification_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_logs"
    ADD CONSTRAINT "notification_logs_templateVersionId_fkey"
    FOREIGN KEY ("templateVersionId") REFERENCES "notification_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_logs"
    ADD CONSTRAINT "notification_logs_ruleId_fkey"
    FOREIGN KEY ("ruleId") REFERENCES "notification_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_logs"
    ADD CONSTRAINT "notification_logs_ruleExecutionId_fkey"
    FOREIGN KEY ("ruleExecutionId") REFERENCES "notification_rule_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_subscriptions"
    ADD CONSTRAINT "notification_subscriptions_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_subscriptions"
    ADD CONSTRAINT "notification_subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_preferences"
    ADD CONSTRAINT "notification_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_preferences"
    ADD CONSTRAINT "notification_preferences_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Step 11: Enable RLS on sensitive tables
-- ============================================

ALTER TABLE "notification_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_log_tenant_isolation ON "notification_logs"
  FOR ALL
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
  );

ALTER TABLE "notification_subscriptions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_subscription_tenant_isolation ON "notification_subscriptions"
  FOR ALL
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
  );

ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preference_tenant_isolation ON "notification_preferences"
  FOR ALL
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
  );

ALTER TABLE "notification_rules" ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_rule_tenant ON "notification_rules"
  FOR ALL
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR "isGlobal" = true
    OR "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
  );

ALTER TABLE "notification_templates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_template_tenant ON "notification_templates"
  FOR ALL
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR "organizationId" IS NULL
    OR "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
  );

ALTER TABLE "notification_rule_executions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_rule_execution_tenant ON "notification_rule_executions"
  FOR ALL
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
  );
