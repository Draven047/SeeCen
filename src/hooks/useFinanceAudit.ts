import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AuditLogParams {
  entityType: 'order' | 'credit_note' | 'invoice_series' | 'credit_note_series' | 'store_tax_settings';
  entityId: string;
  actionType: string;
  storeId?: string | null;
  beforeData?: any;
  afterData?: any;
  reason?: string;
}

export function useFinanceAudit() {
  const { user } = useAuth();

  const logAudit = async ({
    entityType,
    entityId,
    actionType,
    storeId,
    beforeData,
    afterData,
    reason
  }: AuditLogParams) => {
    if (!user) return;

    try {
      await supabase.from('finance_audit_logs').insert({
        entity_type: entityType,
        entity_id: entityId,
        action_type: actionType,
        store_id: storeId,
        before_data: beforeData,
        after_data: afterData,
        reason,
        performed_by: user.id
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  };

  return { logAudit };
}
